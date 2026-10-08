-- Efficient deterministic canonical Mark Scheme lookup for selective consumers.
--
-- The canonical_mark_schemes view is intentionally global, but PostgreSQL can
-- expand its per-question LATERAL selector across the whole question corpus
-- before a selective Live Challenge predicate is applied. For a teacher choosing
-- one topic/subtopic this produced thousands of unnecessary canonical-selector
-- executions.
--
-- This parameterized selector preserves the exact canonical ordering contract
-- while making the question id an explicit input, so selective consumers can
-- resolve only the questions they already filtered.

CREATE OR REPLACE FUNCTION public.canonical_mark_scheme_for_question_v1(
  p_question_id uuid
)
RETURNS SETOF public.mark_schemes
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $function$
  SELECT ms.*
  FROM public.questions q
  JOIN public.source_papers qsp ON qsp.id=q.source_paper_id
  JOIN public.mark_schemes ms ON ms.question_id=q.id
  JOIN public.source_papers msp ON msp.id=ms.source_paper_id
  WHERE q.id=p_question_id
    AND msp.kind='MS'::paper_kind
    AND ms.status IN ('approved','needs_review')
  ORDER BY
    (
      msp.syllabus_id=qsp.syllabus_id
      AND msp.year=qsp.year
      AND msp.series=qsp.series
      AND msp.component_id=qsp.component_id
      AND msp.variant=qsp.variant
    ) DESC,
    EXISTS (
      SELECT 1
      FROM public.mark_scheme_source_audits a
      WHERE a.mark_scheme_id=ms.id
        AND a.source_paper_id=ms.source_paper_id
        AND a.result='verified'
    ) DESC,
    (ms.status='approved') DESC,
    ms.updated_at DESC,
    ms.id
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.canonical_mark_scheme_for_question_v1(uuid)
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.canonical_mark_scheme_for_question_v1(uuid) IS
  'Selective equivalent of canonical_mark_schemes: resolves exactly one deterministic canonical MS for one question without scanning the global canonical view.';
