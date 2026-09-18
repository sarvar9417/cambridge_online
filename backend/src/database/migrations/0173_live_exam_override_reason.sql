-- Cambridge Live Challenge moderation hardening.
--
-- Teacher score overrides are already append-only through
-- live_exam_score_overrides. Phase 4 makes the human reason part of the same
-- durable evidence so moderation is explainable rather than just attributable.
-- The reason stays nullable during the compatibility window because legacy
-- clients are still being migrated; the new override API/UI will require it.

ALTER TABLE live_exam_answers
  ADD COLUMN IF NOT EXISTS moderation_reason text
    CHECK (moderation_reason IS NULL OR char_length(btrim(moderation_reason)) BETWEEN 3 AND 500);

ALTER TABLE live_exam_score_overrides
  ADD COLUMN IF NOT EXISTS reason text
    CHECK (reason IS NULL OR char_length(btrim(reason)) BETWEEN 3 AND 500);

COMMENT ON COLUMN live_exam_answers.moderation_reason IS
  'Reason supplied for the current teacher moderation decision; copied into append-only override evidence.';
COMMENT ON COLUMN live_exam_score_overrides.reason IS
  'Human-readable reason supplied by the teacher for this specific override.';

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
      previous_score_source,reason,created_at
    ) VALUES (
      target_session_id,NEW.session_question_id,NEW.id,NEW.moderated_by,
      OLD.final_score,NEW.final_score,OLD.final_feedback_md,NEW.final_feedback_md,
      OLD.score_source,NEW.moderation_reason,coalesce(NEW.moderated_at,now())
    );
  END IF;

  RETURN NEW;
END;
$$;
