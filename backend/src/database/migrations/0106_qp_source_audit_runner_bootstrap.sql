-- Read-only bootstrap for a full 9618 Question Paper source-fidelity audit.
--
-- The audit runner downloads every source-ready Cambridge 9618 QP, verifies the
-- stored SHA-256, reparses the official PDF with qp-source-repair-v2 and compares
-- the source-derived leaves against the current database snapshot. This function
-- exposes no mutation RPC and is executable only by service_role.

CREATE OR REPLACE FUNCTION public.qp_source_audit_runner_bootstrap_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_papers integer;
  v_leaves integer;
  v_marks integer;
  v_result jsonb;
BEGIN
  SELECT
    count(*),
    coalesce(sum((
      SELECT count(*)
      FROM public.questions q
      WHERE q.source_paper_id = sp.id
        AND q.marks > 0
    )), 0)::integer,
    coalesce(sum((
      SELECT coalesce(sum(q.marks), 0)
      FROM public.questions q
      WHERE q.source_paper_id = sp.id
        AND q.marks > 0
    )), 0)::integer
  INTO v_papers, v_leaves, v_marks
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id = sp.syllabus_id
  WHERE s.code = '9618'
    AND sp.kind = 'QP'::paper_kind
    AND sp.source_url IS NOT NULL
    AND nullif(trim(sp.sha256), '') IS NOT NULL;

  IF v_papers <> 118 OR v_leaves <> 2985 OR v_marks <> 8850 THEN
    RAISE EXCEPTION 'qp_source_audit_baseline_mismatch:%:%:%', v_papers, v_leaves, v_marks;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id = sp.syllabus_id
    WHERE s.code = '9618'
      AND sp.kind = 'QP'::paper_kind
      AND sp.source_url IS NOT NULL
      AND nullif(trim(sp.sha256), '') IS NOT NULL
      AND (
        SELECT coalesce(sum(q.marks), 0)
        FROM public.questions q
        WHERE q.source_paper_id = sp.id
          AND q.marks > 0
      ) <> 75
  ) THEN
    RAISE EXCEPTION 'qp_source_audit_non_75_paper';
  END IF;

  SELECT jsonb_build_object(
    'parserVersion', 'qp-source-repair-v2',
    'auditVersion', '9618-source-audit-v1',
    'paperCount', v_papers,
    'leafCount', v_leaves,
    'marks', v_marks,
    'sources', coalesce(
      jsonb_agg(
        src ORDER BY
          (src->>'year')::integer,
          src->>'series',
          (src->>'component')::integer,
          (src->>'variant')::integer
      ),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'sourcePaperId', sp.id,
      'sourceUrl', sp.source_url,
      'sourceSha256', sp.sha256,
      'syllabusCode', s.code,
      'component', c.number,
      'variant', sp.variant,
      'series', sp.series,
      'year', sp.year,
      'expectedMarks', 75,
      'leaves', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'questionId', q.id,
            'path', q.path,
            'marks', q.marks,
            'displayRef', q.display_ref,
            'stemMd', q.stem_md,
            'contextMd', q.context_md,
            'status', q.status::text,
            'promptVersion', q.prompt_version
          )
          ORDER BY q.sort_order, q.id
        )
        FROM public.questions q
        WHERE q.source_paper_id = sp.id
          AND q.marks > 0
      )
    ) AS src
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id = sp.syllabus_id
    JOIN public.components c ON c.id = sp.component_id
    WHERE s.code = '9618'
      AND sp.kind = 'QP'::paper_kind
      AND sp.source_url IS NOT NULL
      AND nullif(trim(sp.sha256), '') IS NOT NULL
  ) x;

  RETURN v_result;
END
$function$;

REVOKE ALL ON FUNCTION public.qp_source_audit_runner_bootstrap_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qp_source_audit_runner_bootstrap_v1() TO service_role;
