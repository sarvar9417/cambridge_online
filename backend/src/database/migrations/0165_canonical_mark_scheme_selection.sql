-- One deterministic mark scheme per question for rendering/grading consumers.
--
-- Source-equivalent paper rows may legitimately produce more than one approved
-- mark_scheme for the same canonical question. Consumers must not concatenate
-- their mark points. Prefer the mark scheme whose source paper exactly matches
-- the question's QP tuple, then verified source evidence, then approval state.

CREATE OR REPLACE VIEW public.canonical_mark_schemes AS
SELECT picked.*
FROM public.questions q
JOIN public.source_papers qsp ON qsp.id=q.source_paper_id
JOIN LATERAL (
  SELECT ms.*
  FROM public.mark_schemes ms
  JOIN public.source_papers msp ON msp.id=ms.source_paper_id
  WHERE ms.question_id=q.id
    AND msp.kind='MS'
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
) picked ON true;

COMMENT ON VIEW public.canonical_mark_schemes IS
  'Deterministic single mark scheme per question; exact QP/MS source tuple is preferred to prevent duplicate source-equivalent mark points in exports and grading consumers.';
