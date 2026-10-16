-- Staff rehearsal/demo rooms are dry runs. They must not consume official
-- class question exposure or publish learner mastery/evidence.
-- This migration preserves the student-practice isolation introduced in 0210.

DROP TRIGGER IF EXISTS live_exam_finish_learning_evidence ON public.live_exam_sessions;
CREATE TRIGGER live_exam_finish_learning_evidence
AFTER UPDATE OF status ON public.live_exam_sessions
FOR EACH ROW
WHEN (
  NEW.status='finished'
  AND OLD.status IS DISTINCT FROM NEW.status
  AND NEW.settings->>'practiceMode' IS NULL
  AND coalesce((NEW.settings->>'rehearsalMode')::boolean,false)=false
)
EXECUTE FUNCTION public.persist_live_exam_learning_evidence();

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

  -- Learner-owned practice and staff rehearsal have private/transient history
  -- and must not consume the class's official source-question exposure pool.
  IF EXISTS (
    SELECT 1
    FROM public.live_exam_sessions les
    WHERE les.id=NEW.session_id
      AND (
        les.settings->>'practiceMode' IN ('solo','group','collaborative')
        OR coalesce((les.settings->>'rehearsalMode')::boolean,false)=true
      )
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
