-- Spaced-repetition schedule for student-owned formative glossary practice.
-- A correct first attempt increases the interval; an incorrect first attempt
-- resets the interval and schedules a short retry. This is not mastery grading.
CREATE TABLE IF NOT EXISTS public.interactive_game_practice_schedule (
  student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_code text NOT NULL CHECK (course_code IN ('9618','0478')),
  term_id uuid NOT NULL REFERENCES public.glossary_terms(id) ON DELETE CASCADE,
  interval_days numeric(8,2) NOT NULL DEFAULT 0 CHECK (interval_days BETWEEN 0 AND 3650),
  repetitions integer NOT NULL DEFAULT 0 CHECK (repetitions BETWEEN 0 AND 10000),
  ease_factor numeric(4,2) NOT NULL DEFAULT 2.50 CHECK (ease_factor BETWEEN 1.30 AND 3.00),
  due_at timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz NOT NULL DEFAULT now(),
  last_first_correct boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, course_code, term_id)
);
CREATE INDEX IF NOT EXISTS interactive_game_practice_schedule_due_idx
  ON public.interactive_game_practice_schedule (student_id, course_code, due_at);
ALTER TABLE public.interactive_game_practice_schedule ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.interactive_game_practice_schedule FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    EXECUTE 'REVOKE ALL ON public.interactive_game_practice_schedule FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    EXECUTE 'REVOKE ALL ON public.interactive_game_practice_schedule FROM authenticated';
  END IF;
END
$$;
COMMENT ON TABLE public.interactive_game_practice_schedule IS
  'Private spaced-repetition timing derived from student-submitted formative first-attempt outcomes; not an official mastery record.';
