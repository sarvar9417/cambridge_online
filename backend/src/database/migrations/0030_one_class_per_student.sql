-- A student belongs to one class at a time.
--
-- The enrolment table only ever stopped the same student joining the same class
-- twice, so nothing prevented a student sitting in two classes at once. That is
-- now the rule: one active enrolment each, and moving between classes closes the
-- old one rather than adding a second.
--
-- Partial on left_at, so the history survives. A student who moved from 10-A to
-- 11-A keeps both rows -- one closed, one open -- and their old work stays
-- attached to the class it was done in.

CREATE UNIQUE INDEX IF NOT EXISTS enrollments_one_active_class_per_student
  ON enrollments (student_id) WHERE left_at IS NULL;

COMMENT ON INDEX enrollments_one_active_class_per_student IS
  'One open enrolment per student. Moving classes sets left_at on the old row first.';
