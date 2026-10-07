-- Soft-delete completed Live Challenge sessions from classroom history while
-- preserving answers, review evidence, audit events and mastery provenance.
-- Only terminal sessions may be archived.

ALTER TABLE live_exam_sessions
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES users ON DELETE SET NULL;

ALTER TABLE live_exam_sessions
  DROP CONSTRAINT IF EXISTS live_exam_sessions_archive_terminal_check;

ALTER TABLE live_exam_sessions
  ADD CONSTRAINT live_exam_sessions_archive_terminal_check
  CHECK (archived_at IS NULL OR status IN ('finished','cancelled'));

CREATE INDEX IF NOT EXISTS live_exam_sessions_history_visible_idx
  ON live_exam_sessions (class_id, updated_at DESC)
  WHERE archived_at IS NULL;
