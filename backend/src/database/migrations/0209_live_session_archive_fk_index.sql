-- Cover the archive actor foreign key introduced by 0205.
-- This keeps user deletion / archival maintenance from scanning every Live session.

CREATE INDEX IF NOT EXISTS live_exam_sessions_archived_by_fk_idx
  ON live_exam_sessions (archived_by);
