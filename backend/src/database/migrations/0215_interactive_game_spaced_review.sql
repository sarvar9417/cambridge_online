-- Private, formative-only spaced revision schedule for Interactive Games.
-- Never use a Leitner stage as a grade, spoken evidence or mastery credential.
-- Updates are triggered ONLY by a newly inserted student practice run, so a
-- retry of the same run UUID does not advance the schedule twice.

CREATE TABLE IF NOT EXISTS public.interactive_game_review_schedule (
  student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_code text NOT NULL CHECK (course_code IN ('9618','0478')),
  term_id uuid NOT NULL REFERENCES public.glossary_terms(id) ON DELETE CASCADE,
  interval_stage smallint NOT NULL DEFAULT 0 CHECK (interval_stage BETWEEN 0 AND 7),
  due_at timestamptz NOT NULL,
  last_reviewed_at timestamptz NOT NULL,
  last_run_id uuid REFERENCES public.interactive_game_practice_runs(id) ON DELETE SET NULL,
  PRIMARY KEY (student_id,course_code,term_id)
);
CREATE INDEX IF NOT EXISTS interactive_game_review_schedule_due_idx
  ON public.interactive_game_review_schedule (student_id,course_code,due_at,term_id);
ALTER TABLE public.interactive_game_review_schedule ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.interactive_game_review_schedule FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    EXECUTE 'REVOKE ALL ON public.interactive_game_review_schedule FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    EXECUTE 'REVOKE ALL ON public.interactive_game_review_schedule FROM authenticated';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.interactive_game_interval_days(p_stage integer)
RETURNS integer LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog AS $$
  SELECT CASE p_stage WHEN 0 THEN 0 WHEN 1 THEN 1 WHEN 2 THEN 3
    WHEN 3 THEN 7 WHEN 4 THEN 14 WHEN 5 THEN 30 WHEN 6 THEN 60 ELSE 120 END;
$$;

CREATE OR REPLACE FUNCTION public.apply_interactive_game_review_run(
  p_run_id uuid,p_student_id uuid,p_course_code text,
  p_created_at timestamptz,p_attempts jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE
  entry jsonb;
  selected_term uuid;
  first_correct boolean;
BEGIN
  IF p_attempts IS NULL OR jsonb_typeof(p_attempts)<>'array' THEN RETURN; END IF;
  FOR entry IN SELECT value FROM jsonb_array_elements(p_attempts) AS items(value) LOOP
    selected_term := (entry->>'termId')::uuid;
    first_correct := (entry->>'firstCorrect')::boolean;
    IF selected_term IS NULL OR first_correct IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.interactive_game_review_schedule AS review
      (student_id,course_code,term_id,interval_stage,due_at,last_reviewed_at,last_run_id)
    VALUES
      (p_student_id,p_course_code,selected_term,
       CASE WHEN first_correct THEN 1 ELSE 0 END,
       p_created_at + public.interactive_game_interval_days(CASE WHEN first_correct THEN 1 ELSE 0 END) * interval '1 day',
       p_created_at,p_run_id)
    ON CONFLICT (student_id,course_code,term_id) DO UPDATE SET
      interval_stage=CASE
        WHEN NOT first_correct THEN 0
        WHEN review.interval_stage>0 AND review.due_at>excluded.last_reviewed_at THEN review.interval_stage
        ELSE LEAST(review.interval_stage+1,7) END,
      due_at=CASE
        WHEN NOT first_correct THEN excluded.last_reviewed_at
        -- An early repeat does NOT move the deadline or raise the stage.
        WHEN review.interval_stage>0 AND review.due_at>excluded.last_reviewed_at THEN review.due_at
        ELSE excluded.last_reviewed_at +
          public.interactive_game_interval_days(LEAST(review.interval_stage+1,7)) * interval '1 day' END,
      last_reviewed_at=excluded.last_reviewed_at,
      last_run_id=excluded.last_run_id
    WHERE review.last_reviewed_at<excluded.last_reviewed_at
      OR (review.last_reviewed_at=excluded.last_reviewed_at AND review.last_run_id<excluded.last_run_id);
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_interactive_game_review_run(
  uuid,uuid,text,timestamptz,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.interactive_game_interval_days(integer) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.interactive_game_practice_schedule_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
BEGIN
  PERFORM public.apply_interactive_game_review_run(
    NEW.id,NEW.student_id,NEW.course_code,NEW.created_at,NEW.attempts);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.interactive_game_practice_schedule_trigger() FROM PUBLIC;
DROP TRIGGER IF EXISTS interactive_game_schedule_on_insert
  ON public.interactive_game_practice_runs;
CREATE TRIGGER interactive_game_schedule_on_insert
  AFTER INSERT ON public.interactive_game_practice_runs
  FOR EACH ROW EXECUTE FUNCTION public.interactive_game_practice_schedule_trigger();

-- Existing formative runs are replayed chronologically, without changing
-- their saved content and without crediting a corrected retry as mastery.
DO $$
DECLARE record_item record;
BEGIN
  FOR record_item IN
    SELECT id,student_id,course_code,created_at,attempts
      FROM public.interactive_game_practice_runs
     ORDER BY created_at,id
  LOOP
    PERFORM public.apply_interactive_game_review_run(
      record_item.id,record_item.student_id,record_item.course_code,
      record_item.created_at,record_item.attempts);
  END LOOP;
END $$;

COMMENT ON TABLE public.interactive_game_review_schedule IS
  'Self-reported formative Leitner intervals only; not official grades or verified mastery.';
