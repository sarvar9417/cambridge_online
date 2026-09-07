-- Promote only mark schemes proved by the source-safe matcher v4.
--
-- V4 does not weaken source identity or canonical question gates. Its only
-- confidence exception is for legacy extractor confidence: the heuristic may be
-- superseded when a fresh matcher-v4 audit proves every grading phrase against
-- the exact official MS PDF and records legacyConfidenceSuperseded=true.

CREATE OR REPLACE FUNCTION public.ms_source_audit_promote_verified_v4()
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
    JOIN public.source_papers src
      ON src.id=ms.source_paper_id
     AND src.kind='MS'::paper_kind
    JOIN public.mark_scheme_source_audits a
      ON a.mark_scheme_id=ms.id
     AND a.audit_version='9618-ms-source-audit-v2'
     AND a.source_sha256=src.sha256
     AND a.result='verified'
     AND coalesce((a.evidence->>'strict')::boolean,false)=true
     AND a.evidence->>'matcherVersion'='9618-ms-source-matcher-v4'
     AND coalesce((a.evidence->>'rubricPhrasesChecked')::integer,0)>0
     AND coalesce((a.evidence->>'rubricPhrasesChecked')::integer,0)
         =coalesce((a.evidence->>'rubricPhrasesMatched')::integer,-1)
     AND jsonb_array_length(coalesce(a.evidence->'reasons','[]'::jsonb))=0
     AND a.audited_at>=ms.updated_at
    JOIN public.source_papers qp
      ON qp.id=q.source_paper_id
     AND qp.kind='QP'::paper_kind
    JOIN public.syllabi s ON s.id=qp.syllabus_id
    WHERE s.code='9618'
      AND qp.year BETWEEN 2021 AND 2025
      AND qp.variant BETWEEN 1 AND 3
      AND ms.status='needs_review'::review_status
      AND q.status IN ('approved'::review_status,'needs_review'::review_status)
      AND ms.scheme_type<>'manual_only'::scheme_type
      AND ms.max_marks=q.marks
      AND (
        ms.extract_confidence>=0.95
        OR coalesce((a.evidence->>'legacyConfidenceSuperseded')::boolean,false)=true
      )
      AND q.content_version=1
      AND q.content_json IS NOT NULL
      AND q.content_json->'source'->>'paperId'=qp.id::text
      AND lower(coalesce(q.content_json->'source'->>'sha256',''))=lower(qp.sha256)
      AND EXISTS (
        SELECT 1
        FROM public.structured_content_backfill_audits sca
        WHERE sca.question_id=q.id
          AND sca.source_paper_id=qp.id
          AND lower(sca.source_sha256)=lower(qp.sha256)
      )
      AND (
        SELECT count(*)
        FROM public.question_subtopics qs
        WHERE qs.question_id=q.id AND qs.is_primary
      )=1
      AND EXISTS (
        SELECT 1
        FROM public.question_learning_objectives qlo
        WHERE qlo.question_id=q.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.validation_findings vf
        WHERE vf.ref_table='questions'
          AND vf.ref_id=q.id
          AND vf.resolved_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.validation_findings vf
        WHERE vf.ref_table='mark_schemes'
          AND vf.ref_id=ms.id
          AND vf.resolved_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.assignment_questions aq WHERE aq.question_id=q.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.answers ans WHERE ans.question_id=q.id
      )
      AND NOT (
        (coalesce(q.context_md,'')||' '||coalesce(q.stem_md,'')) ~*
          '((your|the) answer (to|from|for) part|use your answer (from|to|for) part|using your answer (from|to|for) part)'
        AND NOT EXISTS (
          SELECT 1
          FROM public.question_dependencies qd
          WHERE qd.question_id=q.id
            AND qd.kind='answer_ref'
            AND qd.strength='required'
        )
      )
      AND NOT (
        EXISTS (
          SELECT 1
          FROM public.components c
          WHERE c.id=q.component_id AND c.number=4
        )
        AND (coalesce(q.context_md,'')||' '||coalesce(q.stem_md,'')) ~*
          'test (your|the) program|test the program|take (a|one or more) screenshots?|screenshot.*output'
        AND NOT EXISTS (
          SELECT 1
          FROM public.question_dependencies qd
          WHERE qd.question_id=q.id
            AND qd.kind='answer_ref'
            AND qd.strength='required'
        )
      )
  ), updated AS (
    UPDATE public.mark_schemes ms
    SET status='approved'::review_status,
        reviewed_at=now(),
        updated_at=now()
    FROM eligible e
    WHERE ms.id=e.id
    RETURNING ms.id
  )
  SELECT count(*)::integer INTO v_promoted FROM updated;

  RETURN jsonb_build_object(
    'promoted',v_promoted,
    'remainingHistoricalReview',(
      SELECT count(*)
      FROM public.mark_schemes ms
      JOIN public.questions q ON q.id=ms.question_id
      JOIN public.source_papers qp ON qp.id=q.source_paper_id
      JOIN public.syllabi s ON s.id=qp.syllabus_id
      WHERE s.code='9618'
        AND qp.kind='QP'::paper_kind
        AND qp.year BETWEEN 2021 AND 2025
        AND qp.variant BETWEEN 1 AND 3
        AND q.marks IS NOT NULL
        AND ms.status='needs_review'::review_status
    )
  );
END
$function$;

REVOKE ALL ON FUNCTION public.ms_source_audit_promote_verified_v4() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ms_source_audit_promote_verified_v4() TO service_role;
