-- Record classroom question exposure from the authoritative Live event stream.
--
-- A question is "seen" only after the round actually opens it to learners.
-- Merely preloading a question into a Live session must never consume it from
-- future "exclude seen" pools.
--
-- This is an additive read model. Existing Live session/event history remains
-- authoritative and is backfilled into this table from question.opened events.

CREATE TABLE public.class_question_exposures (
  id bigserial PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id),
  source_type text NOT NULL DEFAULT 'live' CHECK (source_type='live'),
  live_session_question_id uuid NOT NULL UNIQUE
    REFERENCES public.live_exam_questions(id) ON DELETE CASCADE,
  exposed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX class_question_exposures_class_question_idx
  ON public.class_question_exposures (class_id, question_id, exposed_at DESC);

CREATE INDEX class_question_exposures_question_idx
  ON public.class_question_exposures (question_id, exposed_at DESC);

ALTER TABLE public.class_question_exposures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.class_question_exposures FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.class_question_exposures_id_seq FROM anon, authenticated;

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

DROP TRIGGER IF EXISTS live_exam_events_question_exposure
  ON public.live_exam_events;
CREATE TRIGGER live_exam_events_question_exposure
AFTER INSERT ON public.live_exam_events
FOR EACH ROW
WHEN (NEW.event_type='question.opened')
EXECUTE FUNCTION public.record_live_question_exposure_from_event();

-- Rebuild exposure history from the event ledger. This intentionally does not
-- infer exposure from session membership or started_at: questions that were
-- preloaded into a cancelled/unfinished session but never opened stay reusable.
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
  min(e.created_at)
FROM public.live_exam_events e
JOIN public.live_exam_sessions les ON les.id=e.session_id
JOIN public.live_exam_questions leq
  ON leq.session_id=les.id
 AND leq.position=CASE
   WHEN coalesce(e.payload->>'position','') ~ '^[0-9]+$'
     THEN (e.payload->>'position')::int
   ELSE NULL
 END
WHERE e.event_type='question.opened'
  AND coalesce(e.payload->>'position','') ~ '^[0-9]+$'
GROUP BY les.class_id,leq.question_id,leq.id
ON CONFLICT (live_session_question_id) DO UPDATE
  SET exposed_at=least(
    public.class_question_exposures.exposed_at,
    excluded.exposed_at
  );

COMMENT ON TABLE public.class_question_exposures IS
  'Server-only question exposure ledger. Live rows are created only when question.opened is committed, so preloaded but unopened Live questions remain reusable.';
