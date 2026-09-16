-- Preserve teacher moderation as append-only assessment evidence. The current
-- answer remains the effective score, while every teacher override records the
-- before/after state instead of silently replacing peer/self evidence.

CREATE TABLE live_exam_score_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_exam_sessions ON DELETE CASCADE,
  session_question_id uuid NOT NULL REFERENCES live_exam_questions ON DELETE CASCADE,
  answer_id uuid NOT NULL REFERENCES live_exam_answers ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES users,
  previous_score numeric(5,2),
  new_score numeric(5,2) NOT NULL CHECK (new_score >= 0),
  previous_feedback_md text,
  new_feedback_md text,
  previous_score_source live_exam_marking_mode,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX live_exam_score_overrides_session_created_idx
  ON live_exam_score_overrides (session_id, created_at DESC);
CREATE INDEX live_exam_score_overrides_answer_created_idx
  ON live_exam_score_overrides (answer_id, created_at DESC);
CREATE INDEX live_exam_score_overrides_teacher_created_idx
  ON live_exam_score_overrides (teacher_id, created_at DESC);

CREATE OR REPLACE FUNCTION audit_live_exam_teacher_override()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_session_id uuid;
BEGIN
  IF NEW.score_source = 'teacher'
     AND NEW.moderated_by IS NOT NULL
     AND (
       OLD.final_score IS DISTINCT FROM NEW.final_score
       OR OLD.final_feedback_md IS DISTINCT FROM NEW.final_feedback_md
       OR OLD.score_source IS DISTINCT FROM NEW.score_source
       OR OLD.moderated_by IS DISTINCT FROM NEW.moderated_by
     ) THEN
    SELECT leq.session_id
      INTO target_session_id
    FROM live_exam_questions leq
    WHERE leq.id = NEW.session_question_id;

    IF target_session_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'live_override_invalid_target';
    END IF;

    INSERT INTO live_exam_score_overrides(
      session_id,session_question_id,answer_id,teacher_id,
      previous_score,new_score,previous_feedback_md,new_feedback_md,
      previous_score_source,created_at
    ) VALUES (
      target_session_id,NEW.session_question_id,NEW.id,NEW.moderated_by,
      OLD.final_score,NEW.final_score,OLD.final_feedback_md,NEW.final_feedback_md,
      OLD.score_source,coalesce(NEW.moderated_at,now())
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS live_exam_answers_override_audit ON live_exam_answers;
CREATE TRIGGER live_exam_answers_override_audit
AFTER UPDATE OF final_score, final_feedback_md, score_source, moderated_by, moderated_at
ON live_exam_answers
FOR EACH ROW
EXECUTE FUNCTION audit_live_exam_teacher_override();

ALTER TABLE live_exam_score_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON live_exam_score_overrides FROM anon, authenticated;
