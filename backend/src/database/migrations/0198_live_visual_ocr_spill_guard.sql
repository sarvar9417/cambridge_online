-- Remove OCR-extracted visual labels from canonical prose and fail closed on repeats.
--
-- The source visual itself remains authoritative. Text such as A/B/C/P/Q/R/Y/Z
-- belongs to the diagram and must not be duplicated into learner-facing prose.

DO $repair$
DECLARE
  v_q public.questions%ROWTYPE;
  v_sp public.source_papers%ROWTYPE;
  v_blocks jsonb;
  v_content jsonb;
  v_task text;
BEGIN
  FOR v_q IN
    SELECT q.*
    FROM public.questions q
    WHERE q.display_ref IN (
      '9618/31/M/J/21 Q7(a)',
      '9618/31/M/J/21 Q7(b)',
      '9618/31/M/J/21 Q7(c)'
    )
    ORDER BY q.display_ref
  LOOP
    SELECT * INTO v_sp
    FROM public.source_papers sp
    WHERE sp.id=v_q.source_paper_id AND sp.kind='QP'::paper_kind;

    IF NOT FOUND OR coalesce(v_sp.sha256,'') !~ '^[0-9A-Fa-f]{64}$' THEN
      RAISE EXCEPTION '0198 verified QP source unavailable for %',v_q.display_ref;
    END IF;
    IF v_q.content_version IS DISTINCT FROM 1 OR v_q.content_json IS NULL THEN
      RAISE EXCEPTION '0198 canonical v1 content unavailable for %',v_q.display_ref;
    END IF;
    IF v_q.content_json->'source'->>'paperId'<>v_sp.id::text
       OR lower(coalesce(v_q.content_json->'source'->>'sha256',''))<>lower(v_sp.sha256) THEN
      RAISE EXCEPTION '0198 source provenance mismatch for %',v_q.display_ref;
    END IF;

    v_task:=CASE v_q.display_ref
      WHEN '9618/31/M/J/21 Q7(a)'
        THEN 'Complete the truth table for the given logic circuit. Show your working.'
      WHEN '9618/31/M/J/21 Q7(b)'
        THEN 'State the name of the logic circuit.'
      WHEN '9618/31/M/J/21 Q7(c)'
        THEN 'Write the Boolean expressions for the two outputs Y and Z in the truth table as sum-of-products and state the purpose of each output.'
      ELSE NULL
    END;

    SELECT jsonb_agg(
      CASE
        WHEN b.ordinality=1 AND b.block->>'type'='text'
          THEN jsonb_set(b.block,'{text}',to_jsonb('The diagram shows a logic circuit.'::text),false)
        WHEN b.block->>'type'='text' AND b.block->>'style'='task'
          THEN jsonb_set(b.block,'{text}',to_jsonb(v_task),false)
        ELSE b.block
      END
      ORDER BY b.ordinality
    )
    INTO v_blocks
    FROM jsonb_array_elements(v_q.content_json->'blocks')
      WITH ORDINALITY b(block,ordinality);

    v_content:=jsonb_set(v_q.content_json,'{blocks}',v_blocks,false);

    IF v_content IS DISTINCT FROM v_q.content_json THEN
      PERFORM public.set_question_structured_content_v1(
        v_q.id,v_sp.id,lower(v_sp.sha256),v_content
      );
    END IF;

    INSERT INTO public.structured_content_backfill_audits(
      question_id,source_paper_id,source_sha256,source_page,parser_version,evidence
    ) VALUES (
      v_q.id,v_sp.id,lower(v_sp.sha256),9,'source-visual-ocr-spill-cleanup-v1',
      jsonb_build_object(
        'displayRef',v_q.display_ref,
        'sourceRef','9618/31/M/J/21 page 9',
        'repair','remove_diagram_label_ocr_from_text',
        'verifiedIntro','The diagram shows a logic circuit.',
        'verifiedTask',v_task
      )
    )
    ON CONFLICT(question_id,source_sha256,parser_version) DO UPDATE
      SET source_page=excluded.source_page,evidence=excluded.evidence,created_at=now();
  END LOOP;
END
$repair$;

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v7(
  p_syllabus_code text,
  p_year int
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
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code;
  END IF;
  IF p_year<2015 OR p_year>2035 THEN
    RAISE EXCEPTION 'invalid_year:%',p_year;
  END IF;

  v_base:=public.flag_source_fidelity_requirements_v6(p_syllabus_code,p_year);

  CREATE TEMP TABLE _source_visual_ocr_spill_v7(
    question_id uuid PRIMARY KEY,
    display_ref text NOT NULL,
    cue text NOT NULL,
    short_label_lines integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _source_visual_ocr_spill_v7(question_id,display_ref,cue,short_label_lines)
  WITH eligible AS (
    SELECT q.id,q.display_ref,q.content_json
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE sy.code=p_syllabus_code
      AND sp.year=p_year
      AND q.marks IS NOT NULL
      AND q.status IN ('approved','needs_review')
      AND q.content_version=1
      AND q.content_json IS NOT NULL
  ), cues AS (
    SELECT e.id,e.display_ref,b.block,
      lower(regexp_replace(coalesce(b.block->>'text',''),'[[:space:]]+',' ','g')) normalized,
      (
        SELECT count(*)::int
        FROM regexp_split_to_table(coalesce(b.block->>'text',''),E'\n') line
        WHERE btrim(line) ~ '^[A-Z0-9]{1,3}$'
      ) short_label_lines
    FROM eligible e
    CROSS JOIN LATERAL jsonb_array_elements(e.content_json->'blocks') b(block)
    WHERE b.block->>'type'='text'
  )
  SELECT c.id,c.display_ref,left(coalesce(c.block->>'text',''),400),c.short_label_lines
  FROM cues c
  WHERE c.normalized ~ (
       'following[[:space:]]+((vector|logic|state[- ]transition|class|e-?r|entity[- ]relationship)[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape|screen[[:space:]]+image|screenshot)'
    || '|(the|this|given)[[:space:]]+(diagram|figure|flowchart|graph|circuit|image|chart|shape|screen[[:space:]]+image)[[:space:]]+(shows?|showing|represents?|contains?|illustrates?)'
    || '|(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)[[:space:]]+(is[[:space:]]+shown|are[[:space:]]+shown|illustrated|given|provided|below|above)'
    || '|(shown|illustrated|given|provided)[[:space:]]+(below|above|in[[:space:]]+the[[:space:]]+question[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)'
    || '|(study|examine|refer[[:space:]]+to|using)[[:space:]]+(the[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)'
    || '|(for|using|from)[[:space:]]+this[[:space:]]+logo'
    || '|example[[:space:]]+from[[:space:]]+(the|this)[[:space:]]+logo'
  )
    AND c.normalized !~ '(take|capture|provide|submit)[[:space:]]+(a[[:space:]]+)?screenshot'
    AND c.normalized !~ 'truth[[:space:]]+table.{0,100}(logic[[:space:]]+)?circuit[[:space:]]+(is[[:space:]]+)?shown'
    AND c.short_label_lines>=3
  ON CONFLICT(question_id) DO NOTHING;

  INSERT INTO public.validation_findings(
    rule_code,severity,ref_table,ref_id,message,details
  )
  SELECT
    'source_visual_ocr_spill','error','questions',g.question_id,
    'Canonical text contains OCR-extracted labels from a printed visual; the visual labels must remain in the source asset, not duplicated as prose.',
    jsonb_build_object(
      'displayRef',g.display_ref,
      'cue',g.cue,
      'shortLabelLines',g.short_label_lines,
      'audit','source-fidelity-detector-v7-visual-ocr-spill',
      'detectorVersion','v7',
      'syllabusCode',p_syllabus_code,
      'year',p_year
    )
  FROM _source_visual_ocr_spill_v7 g
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.validation_findings vf
    WHERE vf.ref_table='questions'
      AND vf.ref_id=g.question_id
      AND vf.rule_code='source_visual_ocr_spill'
      AND vf.resolved_at IS NULL
  );
  GET DIAGNOSTICS v_added=ROW_COUNT;

  UPDATE public.questions q
  SET status='needs_review'::review_status,
      notes=CASE
        WHEN coalesce(q.notes,'') LIKE '%source-fidelity-detector-v7:%' THEN q.notes
        ELSE concat_ws(E'\n',nullif(q.notes,''),
          'source-fidelity-detector-v7: OCR-extracted visual labels are mixed into canonical prose; source visual cleanup is required.')
      END,
      updated_at=now()
  WHERE q.status='approved'::review_status
    AND EXISTS(
      SELECT 1 FROM _source_visual_ocr_spill_v7 g WHERE g.question_id=q.id
    );
  GET DIAGNOSTICS v_demoted=ROW_COUNT;

  RETURN jsonb_build_object(
    'version','source-fidelity-detector-v7',
    'syllabusCode',p_syllabus_code,
    'year',p_year,
    'baseV6',v_base,
    'visualOcrSpillQuestions',coalesce((SELECT count(*) FROM _source_visual_ocr_spill_v7),0),
    'findingsAdded',v_added,
    'approvedDemoted',v_demoted
  );
END
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v7(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v7(text,int)
  TO service_role;

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v1(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT public.flag_source_fidelity_requirements_v7(p_syllabus_code,p_year)
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  TO service_role;
