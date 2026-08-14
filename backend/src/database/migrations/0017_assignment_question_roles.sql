-- Preserve Question Bank v2 selection semantics after a basket becomes an assignment.
-- Existing assignments remain graded by default.

ALTER TABLE assignment_questions
  ADD COLUMN IF NOT EXISTS role selection_item_role NOT NULL DEFAULT 'graded';
ALTER TABLE assignment_questions
  ADD COLUMN IF NOT EXISTS source_ref text;
ALTER TABLE assignment_questions
  ADD COLUMN IF NOT EXISTS fresh_ref text;

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
