-- Live Challenge invariant: peer marking must never assign a learner their own
-- answer. Keep this at the database boundary so retries, future endpoints and
-- service regressions cannot silently downgrade a peer round to self-marking.

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

DROP TRIGGER IF EXISTS live_exam_reviews_peer_integrity ON live_exam_reviews;
CREATE TRIGGER live_exam_reviews_peer_integrity
BEFORE INSERT OR UPDATE OF answer_id, session_question_id, reviewer_id, kind
ON live_exam_reviews
FOR EACH ROW
EXECUTE FUNCTION enforce_live_exam_peer_review_integrity();
