ALTER TABLE submissions ADD COLUMN IF NOT EXISTS late_granted_until timestamptz;

CREATE INDEX IF NOT EXISTS submissions_late_grant_idx ON submissions(late_granted_until)
  WHERE late_granted_until IS NOT NULL;
