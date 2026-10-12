-- Generalise learner lesson progress from the original pilot chapters to the
-- full Cambridge lesson catalog and scope it by syllabus/course.
--
-- The legacy unique key is intentionally retained for one rolling-deploy
-- compatibility window because older instances use
-- ON CONFLICT(student_id,chapter_no,slide_id).

ALTER TABLE public.student_lesson_progress
  ADD COLUMN IF NOT EXISTS course_code text NOT NULL DEFAULT '9618';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.student_lesson_progress'::regclass
      AND conname='student_lesson_progress_chapter_no_check'
  ) THEN
    ALTER TABLE public.student_lesson_progress
      DROP CONSTRAINT student_lesson_progress_chapter_no_check;
  END IF;
END $$;

ALTER TABLE public.student_lesson_progress
  DROP CONSTRAINT IF EXISTS student_lesson_progress_course_code_check,
  DROP CONSTRAINT IF EXISTS student_lesson_progress_chapter_range_check;

ALTER TABLE public.student_lesson_progress
  ADD CONSTRAINT student_lesson_progress_course_code_check
    CHECK (course_code IN ('9618','0478')),
  ADD CONSTRAINT student_lesson_progress_chapter_range_check
    CHECK (chapter_no BETWEEN 1 AND 20);

ALTER TABLE public.student_lesson_progress
  DROP CONSTRAINT IF EXISTS student_lesson_progress_pkey,
  DROP CONSTRAINT IF EXISTS student_lesson_progress_legacy_key;

ALTER TABLE public.student_lesson_progress
  ADD CONSTRAINT student_lesson_progress_legacy_key
    UNIQUE (student_id,chapter_no,slide_id),
  ADD CONSTRAINT student_lesson_progress_pkey
    PRIMARY KEY (student_id,course_code,chapter_no,slide_id);

CREATE INDEX IF NOT EXISTS student_lesson_progress_course_student_idx
  ON public.student_lesson_progress(student_id,course_code,chapter_no,visited_at DESC);
