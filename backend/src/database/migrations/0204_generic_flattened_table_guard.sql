-- 0204: general source-fidelity guard for ordinary tables flattened into prose.
--
-- Earlier detectors cover binary truth-table OCR spill. This version adds a
-- deliberately conservative rule for common Cambridge tabular headers plus
-- at least three distinct numeric row labels in the same learner-facing text
-- block. It does not guess or auto-reconstruct the table; affected approved
-- questions are demoted to needs_review so Live Challenge fails closed until
-- a source-backed structured repair is available.

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v9(
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
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code; END IF;
  IF p_year<2015 OR p_year>2035 THEN RAISE EXCEPTION 'invalid_year:%',p_year; END IF;

  v_base:=public.flag_source_fidelity_requirements_v8(p_syllabus_code,p_year);

  CREATE TEMP TABLE _generic_flattened_table_v9(
    question_id uuid PRIMARY KEY,
    display_ref text NOT NULL,
    cue text NOT NULL,
    numeric_labels integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _generic_flattened_table_v9(question_id,display_ref,cue,numeric_labels)
  WITH eligible AS (
    SELECT q.id,q.display_ref,q.content_json
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE sy.code=p_syllabus_code AND sp.year=p_year
      AND q.marks IS NOT NULL AND q.status IN ('approved','needs_review')
      AND q.content_version=1 AND q.content_json IS NOT NULL
  ), text_blocks AS (
    SELECT e.id,e.display_ref,b.block,
      lower(regexp_replace(coalesce(b.block->>'text',''),'[[:space:]]+',' ','g')) normalized
    FROM eligible e
    CROSS JOIN LATERAL jsonb_array_elements(e.content_json->'blocks') b(block)
    WHERE b.block->>'type'='text'
      AND length(coalesce(b.block->>'text',''))>=80
  ), candidates AS (
    SELECT t.*,
      (
        SELECT count(DISTINCT token)::int
        FROM regexp_split_to_table(coalesce(t.block->>'text',''),'[[:space:]]+') raw(token_raw)
        CROSS JOIN LATERAL (
          SELECT regexp_replace(raw.token_raw,'^[^0-9]+|[^0-9]+$','','g') token
        ) cleaned
        WHERE cleaned.token ~ '^[0-9]{1,2}$'
          AND cleaned.token::int BETWEEN 1 AND 20
      ) numeric_labels
    FROM text_blocks t
    WHERE t.normalized ~ '(^|[[:space:]])(statement[[:space:]]+number[[:space:]]+statement|register[[:space:]]+(purpose|description|function)|field[[:space:]]+value|input[[:space:]]+output|address[[:space:]]+(content|contents|value)|instruction[[:space:]]+(opcode|operand|meaning))([[:space:]]|$)'
  )
  SELECT c.id,c.display_ref,left(coalesce(c.block->>'text',''),500),c.numeric_labels
  FROM candidates c
  WHERE c.numeric_labels>=3
  ON CONFLICT(question_id) DO NOTHING;

  INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT 'source_generic_table_ocr_spill','error','questions',g.question_id,
    'Canonical learner-facing prose appears to contain a flattened source table. The table must be reconstructed as structured/source-backed content before learner use.',
    jsonb_build_object(
      'displayRef',g.display_ref,
      'cue',g.cue,
      'numericLabels',g.numeric_labels,
      'audit','source-fidelity-detector-v9-generic-table-spill',
      'detectorVersion','v9',
      'syllabusCode',p_syllabus_code,
      'year',p_year
    )
  FROM _generic_flattened_table_v9 g
  WHERE NOT EXISTS (
    SELECT 1 FROM public.validation_findings vf
    WHERE vf.ref_table='questions' AND vf.ref_id=g.question_id
      AND vf.rule_code='source_generic_table_ocr_spill' AND vf.resolved_at IS NULL
  );
  GET DIAGNOSTICS v_added=ROW_COUNT;

  UPDATE public.questions q
  SET status='needs_review'::review_status,
      notes=CASE WHEN coalesce(q.notes,'') LIKE '%source-fidelity-detector-v9:%' THEN q.notes
        ELSE concat_ws(E'\n',nullif(q.notes,''),
          'source-fidelity-detector-v9: probable flattened source table detected in canonical prose; source-backed structured repair is required.')
      END,
      updated_at=now()
  WHERE q.status='approved'::review_status
    AND EXISTS(SELECT 1 FROM _generic_flattened_table_v9 g WHERE g.question_id=q.id);
  GET DIAGNOSTICS v_demoted=ROW_COUNT;

  RETURN jsonb_build_object(
    'version','source-fidelity-detector-v9',
    'syllabusCode',p_syllabus_code,
    'year',p_year,
    'baseV8',v_base,
    'genericFlattenedTableQuestions',coalesce((SELECT count(*) FROM _generic_flattened_table_v9),0),
    'findingsAdded',v_added,
    'approvedDemoted',v_demoted
  );
END
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v9(text,int) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v9(text,int) TO service_role;

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v1(
  p_syllabus_code text,p_year int
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT public.flag_source_fidelity_requirements_v9(p_syllabus_code,p_year)
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int) TO service_role;
