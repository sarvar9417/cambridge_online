-- Cambridge Live Challenge convergence: introduce the lifecycle vocabulary
-- required by the builder without creating a parallel live_challenge schema.
--
-- Existing sessions stay in their current states. The current create flow keeps
-- using the historical lobby default until the converged API is switched to
-- explicit draft -> published -> lobby transitions.

ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'lobby';
ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'published' BEFORE 'lobby';
ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'answers_locked' AFTER 'question_open';
ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'paused' AFTER 'review';

ALTER TABLE live_exam_sessions
  ALTER COLUMN join_code DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_from_status live_exam_status;

COMMENT ON COLUMN live_exam_sessions.join_code IS
  'Six-digit room code allocated at publish/open-room time; draft challenges keep this null.';
COMMENT ON COLUMN live_exam_sessions.published_at IS
  'First time the teacher published this Live Challenge to the assigned class.';
COMMENT ON COLUMN live_exam_sessions.paused_at IS
  'Timestamp of the active teacher pause, null when the session is not paused.';
COMMENT ON COLUMN live_exam_sessions.paused_from_status IS
  'Persisted state restored by resume; only meaningful while status is paused.';

-- Do not silently carry stale pause metadata after a session leaves paused.
-- This is intentionally NOT installed yet as a CHECK constraint because the
-- API transition implementation lands in the next convergence slice and must
-- own the backfill/transition semantics first.