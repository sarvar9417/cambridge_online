ALTER TABLE submissions ADD COLUMN IF NOT EXISTS late_granted_until timestamptz;

CREATE INDEX IF NOT EXISTS submissions_late_grant_idx ON submissions(late_granted_until)
  WHERE late_granted_until IS NOT NULL;

INSERT INTO submissions(assignment_id,student_id)
SELECT a.id,e.student_id
FROM assignments a
JOIN enrollments e ON e.class_id=a.class_id AND e.left_at IS NULL
WHERE a.published_at IS NOT NULL AND a.archived_at IS NULL
ON CONFLICT(assignment_id,student_id) DO NOTHING;
