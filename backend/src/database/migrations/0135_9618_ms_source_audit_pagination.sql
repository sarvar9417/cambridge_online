-- Paginate the historical 9618 mark-scheme source audit bootstrap.
--
-- The V3 all-in-one bootstrap can exceed the PostgREST statement timeout because
-- it aggregates every rubric graph for every remaining historical mark scheme in
-- one response. V4 separates a lightweight source index from bounded source
-- batches. Source trust and promotion rules remain unchanged.

CREATE OR REPLACE FUNCTION public.ms_source_audit_index_v4()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_target_count integer;
  v_source_count integer;
  v_sources jsonb;
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
    RAISE EXCEPTION 'ms_source_audit_v4_target_source_gate_failed';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'sourcePaperId',sp.id,
    'year',sp.year,
    'series',sp.series::text,
    'component',c.number,
    'variant',sp.variant
  ) ORDER BY sp.year,sp.series::text,c.number,sp.variant),'[]'::jsonb)
  INTO v_sources
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
    );

  RETURN jsonb_build_object(
    'auditVersion','9618-ms-source-audit-v2',
    'bootstrapVersion','9618-ms-source-audit-bootstrap-v4',
    'targetCount',v_target_count,
    'sourceCount',v_source_count,
    'sources',v_sources
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.ms_source_audit_batch_v4(p_source_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF p_source_ids IS NULL OR cardinality(p_source_ids)<1 OR cardinality(p_source_ids)>8 THEN
    RAISE EXCEPTION 'ms_source_audit_v4_batch_must_contain_1_to_8_sources';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_source_ids) requested(id)
    LEFT JOIN public.source_papers sp ON sp.id=requested.id
    LEFT JOIN public.syllabi s ON s.id=sp.syllabus_id
    WHERE sp.id IS NULL OR s.code<>'9618' OR sp.kind<>'MS'::paper_kind
      OR sp.year NOT BETWEEN 2021 AND 2025 OR sp.variant NOT BETWEEN 1 AND 3
      OR sp.source_url IS NULL OR nullif(trim(sp.sha256),'') IS NULL
  ) THEN
    RAISE EXCEPTION 'ms_source_audit_v4_invalid_source_batch';
  END IF;

  SELECT jsonb_build_object(
    'auditVersion','9618-ms-source-audit-v2',
    'bootstrapVersion','9618-ms-source-audit-bootstrap-v4',
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
      'schemes',coalesce((
        SELECT jsonb_agg(jsonb_build_object(
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
        ) ORDER BY q.path,ms.id)
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
      ),'[]'::jsonb)
    ) src
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    WHERE sp.id=ANY(p_source_ids)
      AND s.code='9618'
      AND sp.kind='MS'::paper_kind
      AND sp.year BETWEEN 2021 AND 2025
      AND sp.variant BETWEEN 1 AND 3
      AND sp.source_url IS NOT NULL
      AND nullif(trim(sp.sha256),'') IS NOT NULL
  ) x;

  RETURN v_result;
END
$function$;

REVOKE ALL ON FUNCTION public.ms_source_audit_index_v4() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.ms_source_audit_batch_v4(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ms_source_audit_index_v4() TO service_role;
GRANT EXECUTE ON FUNCTION public.ms_source_audit_batch_v4(uuid[]) TO service_role;
