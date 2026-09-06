-- Strengthen source-backed promotion: a canonical rendering is not sufficient
-- when the printed question explicitly consumes an earlier answer/program.
-- Such leaves remain needs_review until the required dependency is represented.

CREATE OR REPLACE FUNCTION public.approve_source_verified_structured_questions_v1(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_eligible integer;
  v_promoted integer;
  v_blocked integer;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code; END IF;
  IF p_year<2015 OR p_year>2035 THEN RAISE EXCEPTION 'invalid_year:%',p_year; END IF;

  CREATE TEMP TABLE _promotion_scope(question_id uuid PRIMARY KEY) ON COMMIT DROP;
  INSERT INTO _promotion_scope(question_id)
  SELECT q.id
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  WHERE sy.code=p_syllabus_code
    AND sp.year=p_year
    AND sp.variant BETWEEN 1 AND 3
    AND sp.source_url IS NOT NULL
    AND q.marks IS NOT NULL
    AND q.status='needs_review'::review_status
    AND q.content_version=1
    AND q.content_json IS NOT NULL
    AND q.content_json->'source'->>'paperId'=sp.id::text
    AND lower(coalesce(q.content_json->'source'->>'sha256',''))=lower(sp.sha256)
    AND EXISTS (
      SELECT 1 FROM public.structured_content_backfill_audits a
      WHERE a.question_id=q.id AND a.source_paper_id=sp.id
        AND lower(a.source_sha256)=lower(sp.sha256)
    )
    AND EXISTS (
      SELECT 1 FROM public.mark_schemes ms
      WHERE ms.question_id=q.id AND ms.status='approved'::review_status
    )
    AND (SELECT count(*) FROM public.question_subtopics qs WHERE qs.question_id=q.id AND qs.is_primary)=1
    AND EXISTS (SELECT 1 FROM public.question_learning_objectives qlo WHERE qlo.question_id=q.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.validation_findings vf
      WHERE vf.ref_table='questions' AND vf.ref_id=q.id
        AND vf.resolved_at IS NULL AND vf.severity='error'
    )
    AND NOT (
      (coalesce(q.context_md,'')||' '||coalesce(q.stem_md,'')) ~*
        '((your|the) answer (to|from|for) part|use your answer (from|to|for) part|using your answer (from|to|for) part)'
      AND NOT EXISTS (
        SELECT 1 FROM public.question_dependencies qd
        WHERE qd.question_id=q.id AND qd.kind='answer_ref' AND qd.strength='required'
      )
    )
    AND NOT (
      EXISTS(SELECT 1 FROM public.components c WHERE c.id=q.component_id AND c.number=4)
      AND (coalesce(q.context_md,'')||' '||coalesce(q.stem_md,'')) ~*
        'test (your|the) program|test the program|take (a|one or more) screenshots?|screenshot.*output'
      AND NOT EXISTS (
        SELECT 1 FROM public.question_dependencies qd
        WHERE qd.question_id=q.id AND qd.kind='answer_ref' AND qd.strength='required'
      )
    );

  SELECT count(*) INTO v_eligible FROM _promotion_scope;
  UPDATE public.questions q
  SET status='approved'::review_status,
      notes=CASE
        WHEN coalesce(q.notes,'') LIKE '%source_fidelity":"verified-canonical%' THEN q.notes
        ELSE jsonb_build_object(
          'source_fidelity','verified-canonical',
          'approved_by','source-verified-corpus-completion-v1'
        )::text
      END,
      updated_at=now()
  FROM _promotion_scope p
  WHERE q.id=p.question_id;
  GET DIAGNOSTICS v_promoted=ROW_COUNT;

  SELECT count(*) INTO v_blocked
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  WHERE sy.code=p_syllabus_code AND sp.year=p_year
    AND sp.variant BETWEEN 1 AND 3 AND sp.source_url IS NOT NULL
    AND q.marks IS NOT NULL AND q.status<>'approved'::review_status;

  RETURN jsonb_build_object(
    'syllabusCode',p_syllabus_code,'year',p_year,
    'eligible',v_eligible,'promoted',v_promoted,'stillBlocked',v_blocked,
    'dependencyGate','required'
  );
END
$function$;

REVOKE ALL ON FUNCTION public.approve_source_verified_structured_questions_v1(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.approve_source_verified_structured_questions_v1(text,int)
  TO service_role;
