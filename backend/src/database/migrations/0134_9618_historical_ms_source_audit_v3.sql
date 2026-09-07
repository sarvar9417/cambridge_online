-- Complete the historical 9618 mark-scheme review loop without weakening source trust.
--
-- V1/V2 bootstrap only exposed mark schemes whose question was already approved.
-- Question promotion, however, requires an approved mark scheme.  That created a
-- circular review gate for otherwise source-verified historical questions.
--
-- V3 audits BOTH approved and needs_review questions, but promotion remains
-- fail-closed: exact MS SHA, strict V2 rubric evidence, canonical QP SHA/content,
-- structured-content audit, taxonomy/LO, dependency integrity, no findings and
-- no assignment/answer usage are all required. manual_only remains teacher-marked
-- and is deliberately excluded from automated MS promotion.

CREATE OR REPLACE FUNCTION public.ms_source_audit_bootstrap_v3()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_target_count integer;
  v_source_count integer;
  v_result jsonb;
BEGIN
  SELECT count(*)::integer, count(DISTINCT ms.source_paper_id)::integer
  INTO v_target_count, v_source_count
  FROM public.mark_schemes ms
  JOIN public.questions q ON q.id=ms.question_id
  JOIN public.source_papers qp ON qp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=qp.syllabus_id
  WHERE s.code='9618'
    AND qp.kind='QP'::paper_kind
    AND qp.year BETWEEN 2021 AND 2025
    AND qp.variant BETWEEN 1 AND 3
    AND q.marks IS NOT NULL
    AND q.status IN ('approved'::review_status,'needs_review'::review_status)
    AND ms.status='needs_review'::review_status;

  IF EXISTS (
    SELECT 1
    FROM public.mark_schemes ms
    JOIN public.questions q ON q.id=ms.question_id
    JOIN public.source_papers qp ON qp.id=q.source_paper_id
    JOIN public.syllabi s ON s.id=qp.syllabus_id
    LEFT JOIN public.source_papers src ON src.id=ms.source_paper_id
    WHERE s.code='9618'
      AND qp.kind='QP'::paper_kind
      AND qp.year BETWEEN 2021 AND 2025
      AND qp.variant BETWEEN 1 AND 3
      AND q.marks IS NOT NULL
      AND q.status IN ('approved'::review_status,'needs_review'::review_status)
      AND ms.status='needs_review'::review_status
      AND (
        src.id IS NULL OR src.kind<>'MS'::paper_kind OR src.source_url IS NULL
        OR nullif(trim(src.sha256),'') IS NULL OR ms.max_marks<>q.marks
      )
  ) THEN
    RAISE EXCEPTION 'ms_source_audit_v3_target_source_gate_failed';
  END IF;

  SELECT jsonb_build_object(
    'auditVersion','9618-ms-source-audit-v2',
    'bootstrapVersion','9618-ms-source-audit-bootstrap-v3',
    'targetCount',v_target_count,
    'sourceCount',v_source_count,
    'sources',coalesce(jsonb_agg(src ORDER BY (src->>'year')::integer,src->>'series',(src->>'component')::integer,(src->>'variant')::integer),'[]'::jsonb)
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'sourcePaperId',sp.id,
      'sourceUrl',sp.source_url,
      'sourceSha256',sp.sha256,
      'year',sp.year,
      'series',sp.series::text,
      'component',c.number,
      'variant',sp.variant,
      'schemes',(
        SELECT jsonb_agg(
          jsonb_build_object(
            'markSchemeId',ms.id,
            'questionId',q.id,
            'path',q.path,
            'displayRef',q.display_ref,
            'questionMarks',q.marks,
            'schemeType',ms.scheme_type::text,
            'maxMarks',ms.max_marks,
            'guidanceMd',ms.guidance_md,
            'extractConfidence',ms.extract_confidence,
            'promptVersion',ms.prompt_version,
            'openQuestionFindings',(
              SELECT count(*) FROM public.validation_findings vf
              WHERE vf.ref_table='questions' AND vf.ref_id=q.id AND vf.resolved_at IS NULL
            ),
            'openSchemeFindings',(
              SELECT count(*) FROM public.validation_findings vf
              WHERE vf.ref_table='mark_schemes' AND vf.ref_id=ms.id AND vf.resolved_at IS NULL
            ),
            'inUse',(
              EXISTS(SELECT 1 FROM public.assignment_questions aq WHERE aq.question_id=q.id)
              OR EXISTS(SELECT 1 FROM public.answers a WHERE a.question_id=q.id)
            ),
            'groups',coalesce((
              SELECT jsonb_agg(jsonb_build_object(
                'id',g.id,'label',g.label,'nRequired',g.n_required,
                'marksPerPoint',g.marks_per_point,'maxMarks',g.max_marks,
                'awardMode',g.award_mode,'sortOrder',g.sort_order
              ) ORDER BY g.sort_order,g.id)
              FROM public.mark_scheme_groups g WHERE g.mark_scheme_id=ms.id
            ),'[]'::jsonb),
            'points',coalesce((
              SELECT jsonb_agg(jsonb_build_object(
                'code',p.code,'groupId',p.group_id,'text',p.text,'marks',p.marks,
                'accept',p.accept,'reject',p.reject,'requires',p.requires,
                'isBod',p.is_bod,'sortOrder',p.sort_order
              ) ORDER BY p.sort_order,p.id)
              FROM public.mark_scheme_points p WHERE p.mark_scheme_id=ms.id
            ),'[]'::jsonb),
            'levels',coalesce((
              SELECT jsonb_agg(jsonb_build_object(
                'levelNumber',l.level_number,'minMarks',l.min_marks,
                'maxMarks',l.max_marks,'descriptorMd',l.descriptor_md,
                'indicativeContentMd',l.indicative_content_md
              ) ORDER BY l.level_number DESC,l.id)
              FROM public.mark_scheme_levels l WHERE l.mark_scheme_id=ms.id
            ),'[]'::jsonb)
          ) ORDER BY q.path,ms.id
        )
        FROM public.mark_schemes ms
        JOIN public.questions q ON q.id=ms.question_id
        JOIN public.source_papers qp ON qp.id=q.source_paper_id
        WHERE ms.source_paper_id=sp.id
          AND qp.kind='QP'::paper_kind
          AND qp.year BETWEEN 2021 AND 2025
          AND qp.variant BETWEEN 1 AND 3
          AND q.marks IS NOT NULL
          AND q.status IN ('approved'::review_status,'needs_review'::review_status)
          AND ms.status='needs_review'::review_status
      )
    ) AS src
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    WHERE s.code='9618'
      AND sp.kind='MS'::paper_kind
      AND sp.year BETWEEN 2021 AND 2025
      AND sp.variant BETWEEN 1 AND 3
      AND sp.source_url IS NOT NULL
      AND nullif(trim(sp.sha256),'') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.mark_schemes ms
        JOIN public.questions q ON q.id=ms.question_id
        JOIN public.source_papers qp ON qp.id=q.source_paper_id
        WHERE ms.source_paper_id=sp.id
          AND qp.kind='QP'::paper_kind
          AND qp.year BETWEEN 2021 AND 2025
          AND qp.variant BETWEEN 1 AND 3
          AND q.marks IS NOT NULL
          AND q.status IN ('approved'::review_status,'needs_review'::review_status)
          AND ms.status='needs_review'::review_status
      )
  ) x;

  RETURN v_result;
END
$function$;

CREATE OR REPLACE FUNCTION public.ms_source_audit_promote_verified_v3()
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
    JOIN public.source_papers src ON src.id=ms.source_paper_id AND src.kind='MS'::paper_kind
    JOIN public.mark_scheme_source_audits a ON a.mark_scheme_id=ms.id
      AND a.audit_version='9618-ms-source-audit-v2'
      AND a.source_sha256=src.sha256
      AND a.result='verified'
      AND coalesce((a.evidence->>'strict')::boolean,false)=true
      AND coalesce((a.evidence->>'rubricPhrasesChecked')::integer,0)>0
      AND coalesce((a.evidence->>'rubricPhrasesChecked')::integer,0)=coalesce((a.evidence->>'rubricPhrasesMatched')::integer,-1)
      AND jsonb_array_length(coalesce(a.evidence->'reasons','[]'::jsonb))=0
      AND a.audited_at>=ms.updated_at
    JOIN public.source_papers qp ON qp.id=q.source_paper_id AND qp.kind='QP'::paper_kind
    JOIN public.syllabi s ON s.id=qp.syllabus_id
    WHERE s.code='9618'
      AND qp.year BETWEEN 2021 AND 2025
      AND qp.variant BETWEEN 1 AND 3
      AND ms.status='needs_review'::review_status
      AND q.status IN ('approved'::review_status,'needs_review'::review_status)
      AND ms.scheme_type<>'manual_only'::scheme_type
      AND ms.max_marks=q.marks
      AND ms.extract_confidence>=0.95
      AND q.content_version=1
      AND q.content_json IS NOT NULL
      AND q.content_json->'source'->>'paperId'=qp.id::text
      AND lower(coalesce(q.content_json->'source'->>'sha256',''))=lower(qp.sha256)
      AND EXISTS (
        SELECT 1 FROM public.structured_content_backfill_audits sca
        WHERE sca.question_id=q.id AND sca.source_paper_id=qp.id
          AND lower(sca.source_sha256)=lower(qp.sha256)
      )
      AND (SELECT count(*) FROM public.question_subtopics qs WHERE qs.question_id=q.id AND qs.is_primary)=1
      AND EXISTS (SELECT 1 FROM public.question_learning_objectives qlo WHERE qlo.question_id=q.id)
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
      )
  ), updated AS (
    UPDATE public.mark_schemes ms
    SET status='approved'::review_status,reviewed_at=now(),updated_at=now()
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
      WHERE s.code='9618' AND qp.kind='QP'::paper_kind
        AND qp.year BETWEEN 2021 AND 2025 AND qp.variant BETWEEN 1 AND 3
        AND q.marks IS NOT NULL AND ms.status='needs_review'::review_status
    )
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.approve_source_verified_historical_questions_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_promoted integer;
BEGIN
  WITH eligible AS (
    SELECT DISTINCT q.id
    FROM public.questions q
    JOIN public.source_papers qp ON qp.id=q.source_paper_id AND qp.kind='QP'::paper_kind
    JOIN public.syllabi s ON s.id=qp.syllabus_id
    JOIN public.mark_schemes ms ON ms.question_id=q.id AND ms.status='approved'::review_status
    WHERE s.code='9618'
      AND qp.year BETWEEN 2021 AND 2025
      AND qp.variant BETWEEN 1 AND 3
      AND q.marks IS NOT NULL
      AND q.status='needs_review'::review_status
      AND q.content_version=1
      AND q.content_json IS NOT NULL
      AND q.content_json->'source'->>'paperId'=qp.id::text
      AND lower(coalesce(q.content_json->'source'->>'sha256',''))=lower(qp.sha256)
      AND EXISTS (
        SELECT 1 FROM public.structured_content_backfill_audits sca
        WHERE sca.question_id=q.id AND sca.source_paper_id=qp.id
          AND lower(sca.source_sha256)=lower(qp.sha256)
      )
      AND (SELECT count(*) FROM public.question_subtopics qs WHERE qs.question_id=q.id AND qs.is_primary)=1
      AND EXISTS (SELECT 1 FROM public.question_learning_objectives qlo WHERE qlo.question_id=q.id)
      AND NOT EXISTS (
        SELECT 1 FROM public.validation_findings vf
        WHERE vf.ref_table='questions' AND vf.ref_id=q.id AND vf.resolved_at IS NULL
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
      )
  ), updated AS (
    UPDATE public.questions q
    SET status='approved'::review_status,
        notes=concat_ws(E'\n',nullif(q.notes,''),jsonb_build_object(
          'source_fidelity','verified-canonical',
          'approved_by','historical-ms-source-audit-v3'
        )::text),
        updated_at=now()
    FROM eligible e
    WHERE q.id=e.id
    RETURNING q.id
  )
  SELECT count(*)::integer INTO v_promoted FROM updated;

  RETURN jsonb_build_object(
    'promoted',v_promoted,
    'remainingHistoricalQuestionReview',(
      SELECT count(*)
      FROM public.questions q
      JOIN public.source_papers qp ON qp.id=q.source_paper_id
      JOIN public.syllabi s ON s.id=qp.syllabus_id
      WHERE s.code='9618' AND qp.kind='QP'::paper_kind
        AND qp.year BETWEEN 2021 AND 2025 AND qp.variant BETWEEN 1 AND 3
        AND q.marks IS NOT NULL AND q.status='needs_review'::review_status
    )
  );
END
$function$;

REVOKE ALL ON FUNCTION public.ms_source_audit_bootstrap_v3() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.ms_source_audit_promote_verified_v3() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.approve_source_verified_historical_questions_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ms_source_audit_bootstrap_v3() TO service_role;
GRANT EXECUTE ON FUNCTION public.ms_source_audit_promote_verified_v3() TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_source_verified_historical_questions_v1() TO service_role;
