-- Add the builder/reveal lifecycle states required by the approved Cambridge
-- Live Challenge convergence plan without introducing a second schema.
--
-- Pause/resume deliberately remains orthogonal through paused_at and
-- pause_remaining_s from 0172_unified_live_challenge_controls.sql so the
-- persisted round state is not duplicated.

ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'lobby';
ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'published' BEFORE 'lobby';
ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'answers_locked' AFTER 'question_open';

ALTER TABLE live_exam_sessions
  ALTER COLUMN join_code DROP NOT NULL,
  ADD COLUMN published_at timestamptz;

CREATE INDEX live_exam_sessions_published_idx
  ON live_exam_sessions (published_at DESC)
  WHERE published_at IS NOT NULL;
