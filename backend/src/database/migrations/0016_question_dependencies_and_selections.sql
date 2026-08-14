-- Part-level question dependencies and persistent teacher selection baskets.
--
-- This migration is intentionally idempotent because the live database may
-- already contain tables created by the experimental monorepo branch. Main is
-- the canonical application, so it adopts compatible data instead of dropping
-- or recreating it.

DO $$ BEGIN
  CREATE TYPE selection_item_role AS ENUM ('graded', 'context_only');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS question_dependencies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  depends_on_id uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  -- text_ref: printed sibling material is required.
  -- answer_ref: the candidate's answer to the sibling is required.
  kind          text NOT NULL,
  -- required blocks a publishable selection when unsatisfied; context_only is
  -- advisory framing that may be omitted after review.
  strength      text NOT NULL DEFAULT 'required',
  evidence      text,
  detected_by   text NOT NULL DEFAULT 'ai',
  confidence    numeric(3,2),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, depends_on_id),
  CHECK (question_id <> depends_on_id)
);

CREATE INDEX IF NOT EXISTS question_dependencies_question_idx
  ON question_dependencies (question_id);
CREATE INDEX IF NOT EXISTS question_dependencies_depends_on_idx
  ON question_dependencies (depends_on_id);

-- Normalize values used by an early experimental e2e fixture. The canonical
-- vocabulary is the one used by detect-dependencies.v1: text_ref/answer_ref and
-- required/context_only.
UPDATE question_dependencies SET kind='answer_ref' WHERE kind='answer';
UPDATE question_dependencies SET kind='text_ref' WHERE kind='text';
UPDATE question_dependencies SET strength='required' WHERE strength='hard';

CREATE TABLE IF NOT EXISTS selections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  uuid NOT NULL REFERENCES schools ON DELETE CASCADE,
  owner_id   uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS selections_owner_idx
  ON selections (owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS selection_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_id uuid NOT NULL REFERENCES selections ON DELETE CASCADE,
  question_id  uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  role         selection_item_role NOT NULL DEFAULT 'graded',
  sort_order   int NOT NULL,
  -- Preserve the original Cambridge reference even after the generated paper
  -- receives fresh numbering.
  source_ref   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (selection_id, question_id)
);

CREATE INDEX IF NOT EXISTS selection_items_selection_idx
  ON selection_items (selection_id, sort_order, created_at);
