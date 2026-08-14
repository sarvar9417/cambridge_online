-- Preserve Question Bank v2 selection semantics after a basket becomes an assignment.
--
-- Graded leaves remain in assignment_questions so the existing attempt, answer,
-- grading and analytics pipelines continue to work unchanged. Printed support
-- parts live in assignment_context_items: they are part of the generated paper,
-- but they must never become zero-mark answer fields for students.
--
-- portable_snapshot freezes the selected question/context/asset metadata at the
-- handoff boundary. This protects generated papers from later edits to the
-- canonical question bank. Mark-scheme revision snapshotting is a separate
-- concern and is intentionally not claimed by this migration.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS source_selection_id uuid REFERENCES selections ON DELETE SET NULL;

ALTER TABLE assignment_questions
  ADD COLUMN IF NOT EXISTS role selection_item_role NOT NULL DEFAULT 'graded';
ALTER TABLE assignment_questions
  ADD COLUMN IF NOT EXISTS source_ref text;
ALTER TABLE assignment_questions
  ADD COLUMN IF NOT EXISTS fresh_ref text;
ALTER TABLE assignment_questions
  ADD COLUMN IF NOT EXISTS portable_snapshot jsonb;

-- Backfill legacy rows so export/attempt code can use one contract for old and new assignments.
UPDATE assignment_questions aq
SET source_ref = q.display_ref
FROM questions q
WHERE q.id=aq.question_id AND aq.source_ref IS NULL;

UPDATE assignment_questions aq
SET fresh_ref = q.display_ref
FROM questions q
WHERE q.id=aq.question_id AND aq.fresh_ref IS NULL;

ALTER TABLE assignment_questions
  ALTER COLUMN source_ref SET NOT NULL;
ALTER TABLE assignment_questions
  ALTER COLUMN fresh_ref SET NOT NULL;

CREATE INDEX IF NOT EXISTS assignment_questions_role_idx
  ON assignment_questions (assignment_id, role, sort_order);

CREATE TABLE IF NOT EXISTS assignment_context_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id     uuid NOT NULL REFERENCES assignments ON DELETE CASCADE,
  question_id       uuid NOT NULL REFERENCES questions,
  sort_order        int NOT NULL,
  source_ref        text NOT NULL,
  fresh_ref         text NOT NULL,
  portable_snapshot jsonb NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, question_id)
);

CREATE INDEX IF NOT EXISTS assignment_context_items_order_idx
  ON assignment_context_items (assignment_id, sort_order);
