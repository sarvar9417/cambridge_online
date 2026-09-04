-- V2 keeps the official-source gates from V1 but treats free-form guidance as
-- explanatory evidence rather than a grading-authoritative approval requirement.
-- Auto-promotion still requires every structured rubric phrase to be source-backed.

CREATE OR REPLACE FUNCTION public.ms_source_audit_bootstrap_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_data jsonb;
BEGIN
  v_data := public.ms_source_audit_bootstrap_v1();
  RETURN jsonb_set(v_data, '{auditVersion}', to_jsonb('9618-ms-source-audit-v2'::text), true);
END
$function$;

CREATE OR REPLACE FUNCTION public.ms_source_audit_record_v2(p_audits jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  item jsonb;
  v_scheme public.mark_schemes%ROWTYPE;
  v_sha text;
  v_count integer := 0;
BEGIN
  IF jsonb_typeof(p_audits) <> 'array' THEN
    RAISE EXCEPTION 'ms_source_audit_records_must_be_array';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_audits)
  LOOP
    IF item->>'auditVersion' <> '9618-ms-source-audit-v2' THEN
      RAISE EXCEPTION 'ms_source_audit_bad_version';
    END IF;
    IF item->>'result' NOT IN ('verified','needs_review') THEN
      RAISE EXCEPTION 'ms_source_audit_bad_result';
    END IF;
    IF jsonb_typeof(coalesce(item->'evidence','{}'::jsonb)) <> 'object' THEN
      RAISE EXCEPTION 'ms_source_audit_bad_evidence';
    END IF;

    SELECT * INTO STRICT v_scheme
    FROM public.mark_schemes
    WHERE id=(item->>'markSchemeId')::uuid;

    IF v_scheme.source_paper_id IS DISTINCT FROM (item->>'sourcePaperId')::uuid THEN
      RAISE EXCEPTION 'ms_source_audit_source_mismatch:%', v_scheme.id;
    END IF;

    SELECT sha256 INTO STRICT v_sha FROM public.source_papers WHERE id=v_scheme.source_paper_id;
    IF nullif(trim(v_sha),'') IS NULL OR v_sha <> item->>'sourceSha256' THEN
      RAISE EXCEPTION 'ms_source_audit_sha_mismatch:%', v_scheme.id;
    END IF;

    -- A V2 verified row must prove full structured-rubric coverage. Do not trust
    -- a runner-side boolean alone if its counters are incomplete or inconsistent.
    IF item->>'result' = 'verified' AND (
      coalesce((item->'evidence'->>'strict')::boolean,false) IS NOT TRUE
      OR coalesce((item->'evidence'->>'rubricPhrasesChecked')::integer,0) <= 0
      OR coalesce((item->'evidence'->>'rubricPhrasesChecked')::integer,0)
         <> coalesce((item->'evidence'->>'rubricPhrasesMatched')::integer,-1)
      OR jsonb_array_length(coalesce(item->'evidence'->'reasons','[]'::jsonb)) <> 0
    ) THEN
      RAISE EXCEPTION 'ms_source_audit_verified_evidence_incomplete:%', v_scheme.id;
    END IF;

    INSERT INTO public.mark_scheme_source_audits(
      mark_scheme_id, source_paper_id, audit_version, source_sha256,
      source_page, result, evidence, audited_at
    ) VALUES (
      v_scheme.id, v_scheme.source_paper_id, item->>'auditVersion', v_sha,
      nullif(item->>'sourcePage','')::integer, item->>'result',
      coalesce(item->'evidence','{}'::jsonb), now()
    )
    ON CONFLICT(mark_scheme_id,audit_version,source_sha256) DO UPDATE SET
      source_page=excluded.source_page,
      result=excluded.result,
      evidence=excluded.evidence,
      audited_at=now();
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('recorded',v_count);
END
$function$;

CREATE OR REPLACE FUNCTION public.ms_source_audit_promote_verified_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_promoted integer;
BEGIN
  WITH eligible AS (
    SELECT DISTINCT ms.id
    FROM public.mark_schemes ms
    JOIN public.questions q ON q.id=ms.question_id
    JOIN public.source_papers src ON src.id=ms.source_paper_id
    JOIN public.mark_scheme_source_audits a ON a.mark_scheme_id=ms.id
      AND a.audit_version='9618-ms-source-audit-v2'
      AND a.source_sha256=src.sha256
      AND a.result='verified'
      AND coalesce((a.evidence->>'strict')::boolean,false)=true
      AND coalesce((a.evidence->>'rubricPhrasesChecked')::integer,0)>0
      AND coalesce((a.evidence->>'rubricPhrasesChecked')::integer,0)
          =coalesce((a.evidence->>'rubricPhrasesMatched')::integer,-1)
      AND jsonb_array_length(coalesce(a.evidence->'reasons','[]'::jsonb))=0
    JOIN public.source_papers qp ON qp.id=q.source_paper_id
    JOIN public.syllabi s ON s.id=qp.syllabus_id
    WHERE s.code='9618'
      AND ms.status='needs_review'::review_status
      AND q.status='approved'::review_status
      AND ms.scheme_type <> 'manual_only'::scheme_type
      AND ms.max_marks=q.marks
      AND ms.extract_confidence >= 0.95
      AND NOT EXISTS (
        SELECT 1 FROM public.validation_findings vf
        WHERE vf.ref_table='questions' AND vf.ref_id=q.id AND vf.resolved_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.validation_findings vf
        WHERE vf.ref_table='mark_schemes' AND vf.ref_id=ms.id AND vf.resolved_at IS NULL
      )
      AND NOT EXISTS (SELECT 1 FROM public.assignment_questions aq WHERE aq.question_id=q.id)
      AND NOT EXISTS (SELECT 1 FROM public.answers ans WHERE ans.question_id=q.id)
  ), updated AS (
    UPDATE public.mark_schemes ms
    SET status='approved'::review_status, reviewed_at=now(), updated_at=now()
    FROM eligible e
    WHERE ms.id=e.id
    RETURNING ms.id
  )
  SELECT count(*)::integer INTO v_promoted FROM updated;

  RETURN jsonb_build_object(
    'promoted', v_promoted,
    'remainingTarget', (
      SELECT count(*) FROM public.mark_schemes ms
      JOIN public.questions q ON q.id=ms.question_id
      JOIN public.source_papers qp ON qp.id=q.source_paper_id
      JOIN public.syllabi s ON s.id=qp.syllabus_id
      WHERE s.code='9618' AND q.status='approved'::review_status AND ms.status='needs_review'::review_status
    )
  );
END
$function$;

REVOKE ALL ON FUNCTION public.ms_source_audit_bootstrap_v2() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ms_source_audit_record_v2(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ms_source_audit_promote_verified_v2() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ms_source_audit_bootstrap_v2() TO service_role;
GRANT EXECUTE ON FUNCTION public.ms_source_audit_record_v2(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.ms_source_audit_promote_verified_v2() TO service_role;
