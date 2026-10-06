-- 0200: reconcile canonical table cues when the verified source-backed table
-- immediately precedes the referring task text. This preserves original paper
-- ordering (table first, then "given truth table" task) without false demotion.

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v8(
  p_syllabus_code text,p_year int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_base jsonb;
  v_added integer:=0;
  v_demoted integer:=0;
  v_preceding_resolved integer:=0;
  v_restored integer:=0;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code; END IF;
  IF p_year<2015 OR p_year>2035 THEN RAISE EXCEPTION 'invalid_year:%',p_year; END IF;

  v_base:=public.flag_source_fidelity_requirements_v7(p_syllabus_code,p_year);

  CREATE TEMP TABLE _source_preceding_table_reconcile_v8(
    finding_id uuid PRIMARY KEY,
    question_id uuid NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _source_preceding_table_reconcile_v8(finding_id,question_id)
  SELECT vf.id,q.id
  FROM public.validation_findings vf
  JOIN public.questions q ON q.id=vf.ref_id
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  WHERE vf.ref_table='questions'
    AND vf.rule_code='source_structure_required_but_missing_table'
    AND vf.resolved_at IS NULL
    AND vf.details->>'audit'='source-fidelity-detector-v3-canonical-adjacency'
    AND sy.code=p_syllabus_code AND sp.year=p_year
    AND q.content_version=1 AND q.content_json IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(q.content_json->'blocks') WITH ORDINALITY prev(block,ordinality)
      LEFT JOIN public.question_assets qa ON qa.id::text=prev.block->>'assetId'
      WHERE prev.ordinality=(vf.details->>'cueOrdinal')::bigint-1
        AND (
          prev.block->>'type'='table'
          OR (
            prev.block->>'type'='asset'
            AND qa.kind IN ('table','diagram','image')
            AND (
              nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
              OR nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL
              OR coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
            )
          )
        )
    );

  UPDATE public.validation_findings vf
  SET resolved_at=now(),
      resolution='source-fidelity-detector-v8: verified source-backed table/visual immediately precedes the referring source cue.'
  FROM _source_preceding_table_reconcile_v8 r
  WHERE vf.id=r.finding_id;
  GET DIAGNOSTICS v_preceding_resolved=ROW_COUNT;

  UPDATE public.questions q
  SET status='approved'::review_status,updated_at=now()
  WHERE q.status='needs_review'::review_status
    AND EXISTS(SELECT 1 FROM _source_preceding_table_reconcile_v8 r WHERE r.question_id=q.id)
    AND NOT EXISTS(
      SELECT 1 FROM public.validation_findings vf
      WHERE vf.ref_table='questions' AND vf.ref_id=q.id
        AND vf.resolved_at IS NULL AND vf.severity='error'
    );
  GET DIAGNOSTICS v_restored=ROW_COUNT;

  CREATE TEMP TABLE _source_binary_table_spill_v8(
    question_id uuid PRIMARY KEY,display_ref text NOT NULL,cue text NOT NULL,binary_rows integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _source_binary_table_spill_v8(question_id,display_ref,cue,binary_rows)
  WITH eligible AS (
    SELECT q.id,q.display_ref,q.content_json
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE sy.code=p_syllabus_code AND sp.year=p_year
      AND q.marks IS NOT NULL AND q.status IN ('approved','needs_review')
      AND q.content_version=1 AND q.content_json IS NOT NULL
  ), blocks AS (
    SELECT e.id,e.display_ref,b.block,
      lower(regexp_replace(coalesce(b.block->>'text',''),'[[:space:]]+',' ','g')) normalized,
      (SELECT count(*)::int
       FROM regexp_split_to_table(coalesce(b.block->>'text',''),E'\n') line
       WHERE btrim(line) ~ '^[01](?:[[:space:]]+[01]){2,}$') binary_rows
    FROM eligible e
    CROSS JOIN LATERAL jsonb_array_elements(e.content_json->'blocks') b(block)
    WHERE b.block->>'type'='text'
  )
  SELECT b.id,b.display_ref,left(coalesce(b.block->>'text',''),500),b.binary_rows
  FROM blocks b
  WHERE b.binary_rows>=4
    AND b.normalized ~ '(truth[[:space:]]+table|input[[:space:]]+output)'
  ON CONFLICT(question_id) DO NOTHING;

  INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT 'source_table_ocr_spill','error','questions',g.question_id,
    'Canonical learner-facing prose contains flattened binary truth-table rows. Source table cells must be rendered as structured/source-backed table content, not duplicated into prose.',
    jsonb_build_object(
      'displayRef',g.display_ref,'cue',g.cue,'binaryRows',g.binary_rows,
      'audit','source-fidelity-detector-v8-binary-table-spill',
      'detectorVersion','v8','syllabusCode',p_syllabus_code,'year',p_year
    )
  FROM _source_binary_table_spill_v8 g
  WHERE NOT EXISTS (
    SELECT 1 FROM public.validation_findings vf
    WHERE vf.ref_table='questions' AND vf.ref_id=g.question_id
      AND vf.rule_code='source_table_ocr_spill' AND vf.resolved_at IS NULL
  );
  GET DIAGNOSTICS v_added=ROW_COUNT;

  UPDATE public.questions q
  SET status='needs_review'::review_status,
      notes=CASE WHEN coalesce(q.notes,'') LIKE '%source-fidelity-detector-v8:%' THEN q.notes
        ELSE concat_ws(E'\n',nullif(q.notes,''),
          'source-fidelity-detector-v8: flattened binary truth-table rows are mixed into canonical prose; structured/source-backed table repair is required.')
      END,
      updated_at=now()
  WHERE q.status='approved'::review_status
    AND EXISTS(SELECT 1 FROM _source_binary_table_spill_v8 g WHERE g.question_id=q.id);
  GET DIAGNOSTICS v_demoted=ROW_COUNT;

  RETURN jsonb_build_object(
    'version','source-fidelity-detector-v8','syllabusCode',p_syllabus_code,'year',p_year,
    'baseV7',v_base,
    'precedingTableFindingsResolved',v_preceding_resolved,
    'approvalRestored',v_restored,
    'binaryTableSpillQuestions',coalesce((SELECT count(*) FROM _source_binary_table_spill_v8),0),
    'findingsAdded',v_added,'approvedDemoted',v_demoted
  );
END
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v8(text,int) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v8(text,int) TO service_role;
