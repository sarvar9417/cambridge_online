-- Unify the classroom-facing Live Challenge controls with the authoritative
-- Live Exam session model. Pausing is orthogonal to the round state: keeping
-- the existing enum unchanged lets a paused question resume without inventing
-- a second copy of the state machine.

ALTER TABLE live_exam_sessions
  ADD COLUMN paused_at timestamptz,
  ADD COLUMN pause_remaining_s int CHECK (pause_remaining_s IS NULL OR pause_remaining_s >= 0);

CREATE INDEX live_exam_sessions_paused_idx
  ON live_exam_sessions (paused_at)
  WHERE paused_at IS NOT NULL;

-- A one-learner room cannot produce a genuine peer derangement. Permit the
-- service's explicit self-assessment fallback only when exactly one active
-- answer exists; two or more learners remain structurally unable to self-mark.
CREATE OR REPLACE FUNCTION enforce_live_exam_peer_review_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  answer_student_id uuid;
  session_marking_mode live_exam_marking_mode;
  active_answer_count int;
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
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'live_peer_assignment_invalid_target';
  END IF;

  IF session_marking_mode = 'peer' THEN
    IF NEW.kind = 'peer' AND NEW.reviewer_id IS NOT NULL AND NEW.reviewer_id <> answer_student_id THEN
      RETURN NEW;
    END IF;

    IF NEW.kind = 'self' AND NEW.reviewer_id = answer_student_id THEN
      SELECT count(*)::int INTO active_answer_count
      FROM live_exam_answers a
      JOIN live_exam_participants p ON p.id = a.participant_id
      WHERE a.session_question_id = NEW.session_question_id AND p.left_at IS NULL;
      IF active_answer_count = 1 THEN RETURN NEW; END IF;
    END IF;

    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'live_peer_assignment_impossible';
  END IF;

  RETURN NEW;
END;
$$;

-- Classroom controls remain server-only. The existing table revocation and
-- RLS boundary from 0166 also protects these new columns.
