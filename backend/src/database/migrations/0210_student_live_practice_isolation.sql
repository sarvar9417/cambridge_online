-- Student-created practice is formative and never changes teacher-owned
-- classroom mastery or seen-question exposure history.
-- This is an additive release migration; it is NOT run against production here.

-- Retain official classroom evidence semantics, but bypass them for practice.
DROP TRIGGER IF EXISTS live_exam_finish_learning_evidence ON public.live_exam_sessions;
CREATE TRIGGER live_exam_finish_learning_evidence
AFTER UPDATE OF status ON public.live_exam_sessions
FOR EACH ROW
WHEN (NEW.status='finished'
  AND OLD.status IS DISTINCT FROM NEW.status
  AND (NEW.settings->>'practiceMode' IS NULL))
EXECUTE FUNCTION public.persist_live_exam_learning_evidence();

-- Keep source-backed official classroom question exposure unchanged.
-- The practice question remains visible in the learner's own history only.
CREATE OR REPLACE FUNCTION public.record_live_question_exposure_from_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  opened_position int;
  inserted_rows int;
BEGIN
  IF NEW.event_type <> 'question.opened' THEN
    RETURN NEW;
  END IF;

  -- Solo/group practice has its own history and must not consume the entire
  -- class's official source-question exposure pool.
  IF EXISTS (
    SELECT 1 FROM public.live_exam_sessions les
    WHERE les.id=NEW.session_id
      AND les.settings->>'practiceMode' IN ('solo','group','collaborative')
  ) THEN
    RETURN NEW;
  END IF;

  IF coalesce(NEW.payload->>'position','') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'live_question_opened_position_missing';
  END IF;

  opened_position := (NEW.payload->>'position')::int;

  INSERT INTO public.class_question_exposures(
    class_id,
    question_id,
    source_type,
    live_session_question_id,
    exposed_at
  )
  SELECT
    les.class_id,
    leq.question_id,
    'live',
    leq.id,
    NEW.created_at
  FROM public.live_exam_sessions les
  JOIN public.live_exam_questions leq
    ON leq.session_id=les.id
   AND leq.position=opened_position
  WHERE les.id=NEW.session_id
  ON CONFLICT (live_session_question_id) DO UPDATE
    SET exposed_at=least(
      public.class_question_exposures.exposed_at,
      excluded.exposed_at
    );

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  IF inserted_rows <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'live_question_opened_target_missing';
  END IF;

  RETURN NEW;
END;
$$;

