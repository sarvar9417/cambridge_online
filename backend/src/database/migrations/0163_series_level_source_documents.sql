-- Source corpus model: QP/MS/IN are paper-level documents, while
-- grade thresholds (GT) and examiner reports (ER) are series-level.
-- Keep the distinction explicit so series documents do not need fake
-- component/variant values.

ALTER TABLE public.source_papers
  ALTER COLUMN component_id DROP NOT NULL,
  ALTER COLUMN variant DROP NOT NULL;

ALTER TABLE public.source_papers
  DROP CONSTRAINT IF EXISTS source_papers_scope_by_kind;

ALTER TABLE public.source_papers
  ADD CONSTRAINT source_papers_scope_by_kind
  CHECK (
    (kind IN ('QP','MS','IN') AND component_id IS NOT NULL AND variant IS NOT NULL)
    OR
    (kind IN ('GT','ER') AND component_id IS NULL AND variant IS NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS source_papers_series_doc_unique
  ON public.source_papers (syllabus_id, year, series, kind)
  WHERE kind IN ('GT','ER');

COMMENT ON COLUMN public.source_papers.component_id IS
  'Paper component for QP/MS/IN. NULL for series-level GT/ER documents.';
COMMENT ON COLUMN public.source_papers.variant IS
  'Paper variant for QP/MS/IN. NULL for series-level GT/ER documents.';
