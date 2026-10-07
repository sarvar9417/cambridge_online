-- Permit an explicit staff takeover when anonymous peer marking cannot be
-- completed. Peer reviewers remain unable to mark their own answers; the only
-- non-peer reviewer allowed inside a peer-mode session is the session host.
--
-- Existing one-learner self fallback remains valid for historical sessions,
-- while the current service prefers the safer teacher fallback.

CREATE OR REPLACE FUNCTION enforce_live_exam_peer_review_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  answer_student_id uuid;
  session_marking_mode live_exam_marking_mode;
  session_host_id uuid;
  active_answer_count int;
BEGIN
  SELECT lep.student_id, les.marking_mode, les.host_id
    INTO answer_student_id, session_marking_mode, session_host_id
  FROM live_exam_answers lea
  JOIN live_exam_participants lep ON lep.id = lea.participant_id
  JOIN live_exam_questions leq ON leq.id = lea.session_question_id
  JOIN live_exam_sessions les ON les.id = leq.session_id
  WHERE lea.id = NEW.answer_id
    AND leq.id = NEW.session_question_id;

  IF answer_student_id IS NULL OR session_marking_mode IS NULL OR session_host_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'live_peer_assignment_invalid_target';
  END IF;

  IF session_marking_mode = 'peer' THEN
    IF NEW.kind = 'peer' AND NEW.reviewer_id IS NOT NULL AND NEW.reviewer_id <> answer_student_id THEN
      RETURN NEW;
    END IF;

    IF NEW.kind = 'teacher' AND NEW.reviewer_id = session_host_id THEN
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
$;

ALTER FUNCTION public.enforce_live_exam_peer_review_integrity()
  SET search_path = public, pg_temp;
