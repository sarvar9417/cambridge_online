-- Add covering indexes for the highest-value unindexed foreign keys observed in
-- production workload statistics on 2026-09-07.
--
-- Selection policy:
-- - prioritize relations with material row counts and/or repeated query usage;
-- - cover FK lookup/join columns that appear in current Question Bank, Lesson Studio,
--   corpus-audit, and mark-scheme workloads;
-- - avoid low-value actor/reviewer FKs and empty/near-empty tables for now.
--
-- These are ordinary btree indexes on small-to-medium relations (largest relation
-- observed was ~16 MB), so a transactional migration is appropriate.

CREATE INDEX IF NOT EXISTS questions_component_id_idx
  ON public.questions(component_id);

CREATE INDEX IF NOT EXISTS question_assets_question_id_idx
  ON public.question_assets(question_id);

CREATE INDEX IF NOT EXISTS question_subtopics_subtopic_id_idx
  ON public.question_subtopics(subtopic_id);

CREATE INDEX IF NOT EXISTS question_learning_objectives_lo_id_idx
  ON public.question_learning_objectives(lo_id);

CREATE INDEX IF NOT EXISTS mark_scheme_points_group_id_idx
  ON public.mark_scheme_points(group_id);

CREATE INDEX IF NOT EXISTS mark_schemes_source_paper_id_idx
  ON public.mark_schemes(source_paper_id);

CREATE INDEX IF NOT EXISTS mark_scheme_source_audits_source_paper_id_idx
  ON public.mark_scheme_source_audits(source_paper_id);

CREATE INDEX IF NOT EXISTS question_source_repair_history_source_paper_id_idx
  ON public.question_source_repair_history(source_paper_id);

CREATE INDEX IF NOT EXISTS structured_content_backfill_audits_source_paper_id_idx
  ON public.structured_content_backfill_audits(source_paper_id);

-- Fail closed if any expected index is absent or not valid after migration.
DO $$
DECLARE
  v_missing text[];
BEGIN
  SELECT array_agg(expected.index_name ORDER BY expected.index_name)
  INTO v_missing
  FROM (VALUES
    ('questions_component_id_idx'),
    ('question_assets_question_id_idx'),
    ('question_subtopics_subtopic_id_idx'),
    ('question_learning_objectives_lo_id_idx'),
    ('mark_scheme_points_group_id_idx'),
    ('mark_schemes_source_paper_id_idx'),
    ('mark_scheme_source_audits_source_paper_id_idx'),
    ('question_source_repair_history_source_paper_id_idx'),
    ('structured_content_backfill_audits_source_paper_id_idx')
  ) AS expected(index_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_class idx
    JOIN pg_namespace n ON n.oid=idx.relnamespace
    JOIN pg_index pi ON pi.indexrelid=idx.oid
    WHERE n.nspname='public'
      AND idx.relname=expected.index_name
      AND pi.indisvalid
      AND pi.indisready
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'FK workload index migration incomplete: %',v_missing;
  END IF;
END $$;
