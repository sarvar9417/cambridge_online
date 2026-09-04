-- Durable, source-backed audit path for legacy Cambridge 9618 mark schemes.
--
-- This deliberately does NOT re-ingest questions, taxonomy, dependencies or rubric
-- structure. A read-only runner compares the current canonical mark scheme with the
-- official MS PDF identified by source_papers.sha256, then records immutable evidence.
-- Promotion is a separate, fail-closed RPC and can only approve a currently
-- needs_review scheme when its question is already approved and every DB gate remains
-- clean at promotion time.

CREATE TABLE IF NOT EXISTS public.mark_scheme_source_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_scheme_id uuid NOT NULL REFERENCES public.mark_schemes(id) ON DELETE CASCADE,
  source_paper_id uuid NOT NULL REFERENCES public.source_papers(id) ON DELETE RESTRICT,
  audit_version text NOT NULL,
  source_sha256 text NOT NULL,
  source_page integer,
  result text NOT NULL CHECK (result IN ('verified','needs_review')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence) = 'object'),
  audited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mark_scheme_id, audit_version, source_sha256)
);

CREATE INDEX IF NOT EXISTS idx_mark_scheme_source_audits_result
  ON public.mark_scheme_source_audits(result, audited_at DESC);
CREATE INDEX IF NOT EXISTS idx_mark_scheme_source_audits_scheme
  ON public.mark_scheme_source_audits(mark_scheme_id, audited_at DESC);

ALTER TABLE public.mark_scheme_source_audits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mark_scheme_source_audits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mark_scheme_source_audits TO service_role;

COMMENT ON TABLE public.mark_scheme_source_audits IS
  'Durable official-source evidence for automated mark-scheme review. No student-facing role has direct access.';

CREATE OR REPLACE FUNCTION public.ms_source_audit_bootstrap_v1()
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
  JOIN public.questions q ON q.id = ms.question_id
  JOIN public.source_papers qp ON qp.id = q.source_paper_id
  JOIN public.syllabi s ON s.id = qp.syllabus_id
  WHERE s.code = '9618'
    AND q.status = 'approved'::review_status
    AND ms.status = 'needs_review'::review_status;

  IF EXISTS (
    SELECT 1
    FROM public.mark_schemes ms
    JOIN public.questions q ON q.id = ms.question_id
    JOIN public.source_papers qp ON qp.id = q.source_paper_id
    JOIN public.syllabi s ON s.id = qp.syllabus_id
    LEFT JOIN public.source_papers src ON src.id = ms.source_paper_id
    WHERE s.code = '9618'
      AND q.status = 'approved'::review_status
      AND ms.status = 'needs_review'::review_status
      AND (
        src.id IS NULL OR src.kind <> 'MS'::paper_kind OR src.source_url IS NULL
        OR nullif(trim(src.sha256), '') IS NULL OR ms.max_marks <> q.marks
      )
  ) THEN
    RAISE EXCEPTION 'ms_source_audit_target_source_gate_failed';
  END IF;

  SELECT jsonb_build_object(
    'auditVersion', '9618-ms-source-audit-v1',
    'targetCount', v_target_count,
    'sourceCount', v_source_count,
    'sources', coalesce(jsonb_agg(src ORDER BY (src->>'year')::integer, src->>'series', (src->>'component')::integer, (src->>'variant')::integer), '[]'::jsonb)
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'sourcePaperId', sp.id,
      'sourceUrl', sp.source_url,
      'sourceSha256', sp.sha256,
      'year', sp.year,
      'series', sp.series::text,
      'component', c.number,
      'variant', sp.variant,
      'schemes', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'markSchemeId', ms.id,
            'questionId', q.id,
            'path', q.path,
            'displayRef', q.display_ref,
            'questionMarks', q.marks,
            'schemeType', ms.scheme_type::text,
            'maxMarks', ms.max_marks,
            'guidanceMd', ms.guidance_md,
            'extractConfidence', ms.extract_confidence,
            'promptVersion', ms.prompt_version,
            'openQuestionFindings', (
              SELECT count(*) FROM public.validation_findings vf
              WHERE vf.ref_table='questions' AND vf.ref_id=q.id AND vf.resolved_at IS NULL
            ),
            'openSchemeFindings', (
              SELECT count(*) FROM public.validation_findings vf
              WHERE vf.ref_table='mark_schemes' AND vf.ref_id=ms.id AND vf.resolved_at IS NULL
            ),
            'inUse', (
              EXISTS(SELECT 1 FROM public.assignment_questions aq WHERE aq.question_id=q.id)
              OR EXISTS(SELECT 1 FROM public.answers a WHERE a.question_id=q.id)
            ),
            'groups', coalesce((
              SELECT jsonb_agg(jsonb_build_object(
                'id', g.id, 'label', g.label, 'nRequired', g.n_required,
                'marksPerPoint', g.marks_per_point, 'maxMarks', g.max_marks,
                'awardMode', g.award_mode, 'sortOrder', g.sort_order
              ) ORDER BY g.sort_order, g.id)
              FROM public.mark_scheme_groups g WHERE g.mark_scheme_id=ms.id
            ), '[]'::jsonb),
            'points', coalesce((
              SELECT jsonb_agg(jsonb_build_object(
                'code', p.code, 'groupId', p.group_id, 'text', p.text, 'marks', p.marks,
                'accept', p.accept, 'reject', p.reject, 'requires', p.requires,
                'isBod', p.is_bod, 'sortOrder', p.sort_order
              ) ORDER BY p.sort_order, p.id)
              FROM public.mark_scheme_points p WHERE p.mark_scheme_id=ms.id
            ), '[]'::jsonb),
            'levels', coalesce((
              SELECT jsonb_agg(jsonb_build_object(
                'levelNumber', l.level_number, 'minMarks', l.min_marks,
                'maxMarks', l.max_marks, 'descriptorMd', l.descriptor_md,
                'indicativeContentMd', l.indicative_content_md
              ) ORDER BY l.level_number DESC, l.id)
              FROM public.mark_scheme_levels l WHERE l.mark_scheme_id=ms.id
            ), '[]'::jsonb)
          ) ORDER BY q.path, ms.id
        )
        FROM public.mark_schemes ms
        JOIN public.questions q ON q.id=ms.question_id
        WHERE ms.source_paper_id=sp.id
          AND ms.status='needs_review'::review_status
          AND q.status='approved'::review_status
      )
    ) AS src
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    WHERE s.code='9618'
      AND sp.kind='MS'::paper_kind
      AND sp.source_url IS NOT NULL
      AND nullif(trim(sp.sha256), '') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.mark_schemes ms
        JOIN public.questions q ON q.id=ms.question_id
        WHERE ms.source_paper_id=sp.id
          AND ms.status='needs_review'::review_status
          AND q.status='approved'::review_status
      )
  ) x;

  RETURN v_result;
END
$function$;

CREATE OR REPLACE FUNCTION public.ms_source_audit_record_v1(p_audits jsonb)
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
    IF item->>'auditVersion' <> '9618-ms-source-audit-v1' THEN
      RAISE EXCEPTION 'ms_source_audit_bad_version';
    END IF;
    IF item->>'result' NOT IN ('verified','needs_review') THEN
      RAISE EXCEPTION 'ms_source_audit_bad_result';
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

CREATE OR REPLACE FUNCTION public.ms_source_audit_promote_verified_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_promoted integer;
BEGIN
  WITH eligible AS (
    SELECT ms.id
    FROM public.mark_schemes ms
    JOIN public.questions q ON q.id=ms.question_id
    JOIN public.source_papers src ON src.id=ms.source_paper_id
    JOIN public.mark_scheme_source_audits a ON a.mark_scheme_id=ms.id
      AND a.audit_version='9618-ms-source-audit-v1'
      AND a.source_sha256=src.sha256
      AND a.result='verified'
      AND coalesce((a.evidence->>'strict')::boolean,false)=true
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

REVOKE ALL ON FUNCTION public.ms_source_audit_bootstrap_v1() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ms_source_audit_record_v1(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ms_source_audit_promote_verified_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ms_source_audit_bootstrap_v1() TO service_role;
GRANT EXECUTE ON FUNCTION public.ms_source_audit_record_v1(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.ms_source_audit_promote_verified_v1() TO service_role;
