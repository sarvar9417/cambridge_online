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


-- The approved Live Challenge contract forbids self-marking in peer mode.
-- 0172 temporarily permitted a one-student self-assessment fallback; restore
-- fail-closed peer integrity now that the teacher has an explicit recovery
-- path to switch a locked round to teacher marking.
CREATE OR REPLACE FUNCTION enforce_live_exam_peer_review_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  answer_student_id uuid;
  session_marking_mode live_exam_marking_mode;
BEGIN
  SELECT lep.student_id, les.marking_mode
    INTO answer_student_id, session_marking_mode
  FROM live_exam_answers lea
  JOIN live_exam_participants lep ON lep.id = lea.participant_id
  JOIN live_exam_questions leq ON leq.id = lea.session_question_id
  JOIN live_exam_sessions les ON les.id = leq.session_id
  WHERE lea.id = NEW.answer_id
    AND leq.id = NEW.session_question_id;

  IF answer_student_id IS NULL OR session_marking_mode IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'live_peer_assignment_invalid_target';
  END IF;

  IF session_marking_mode = 'peer' AND (
    NEW.kind <> 'peer'
    OR NEW.reviewer_id IS NULL
    OR NEW.reviewer_id = answer_student_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'live_peer_assignment_impossible';
  END IF;

  RETURN NEW;
END;
$$;
