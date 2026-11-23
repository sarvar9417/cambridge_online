-- 0222: Dedicated formative assessment and monitoring centre.
-- The existing assignments / past-paper assessment system is unchanged.
CREATE TABLE IF NOT EXISTS public.assessment_center_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  course_code text NOT NULL CHECK (course_code IN ('school','0478','9618')),
  grade_label text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'diagnostic'
    CHECK (kind IN ('practice','diagnostic','monitoring','summative')),
  source_filename text,
  duration_minutes int NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 1 AND 240),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  release_answers boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assessment_center_tests_staff_idx
  ON public.assessment_center_tests(created_by,created_at DESC);
CREATE TABLE IF NOT EXISTS public.assessment_center_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.assessment_center_tests(id) ON DELETE CASCADE,
  position int NOT NULL CHECK (position BETWEEN 1 AND 100),
  prompt text NOT NULL CHECK (length(trim(prompt)) > 0),
  options jsonb NOT NULL CHECK (jsonb_typeof(options)='array' AND jsonb_array_length(options)=4),
  correct_index int CHECK (correct_index BETWEEN 0 AND 3),
  topic text NOT NULL DEFAULT 'Unclassified',
  marks int NOT NULL DEFAULT 1 CHECK (marks BETWEEN 1 AND 20),
  source_number int,
  UNIQUE(test_id,position)
);
CREATE TABLE IF NOT EXISTS public.assessment_center_targets (
  test_id uuid NOT NULL REFERENCES public.assessment_center_tests(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  PRIMARY KEY(test_id,class_id)
);
CREATE INDEX IF NOT EXISTS assessment_center_targets_class_idx ON public.assessment_center_targets(class_id,test_id);
CREATE TABLE IF NOT EXISTS public.assessment_center_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.assessment_center_tests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  deadline_at timestamptz NOT NULL,
  submitted_at timestamptz,
  score int,
  max_score int,
  UNIQUE(test_id,student_id)
);
CREATE INDEX IF NOT EXISTS assessment_center_attempts_student_idx
  ON public.assessment_center_attempts(student_id,started_at DESC);
CREATE TABLE IF NOT EXISTS public.assessment_center_answers (
  attempt_id uuid NOT NULL REFERENCES public.assessment_center_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.assessment_center_questions(id) ON DELETE CASCADE,
  choice_index int NOT NULL CHECK (choice_index BETWEEN 0 AND 3),
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(attempt_id,question_id)
);
ALTER TABLE public.assessment_center_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_center_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_center_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_center_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_center_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assessment_center_tests,public.assessment_center_questions,
  public.assessment_center_targets,public.assessment_center_attempts,
  public.assessment_center_answers FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON public.assessment_center_tests,public.assessment_center_questions,
      public.assessment_center_targets,public.assessment_center_attempts,
      public.assessment_center_answers FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON public.assessment_center_tests,public.assessment_center_questions,
      public.assessment_center_targets,public.assessment_center_attempts,
      public.assessment_center_answers FROM authenticated;
  END IF;
END $$;
COMMENT ON TABLE public.assessment_center_tests IS
  'Teacher-authorized MCQ assessments; answer keys are only readable from trusted authenticated server routes.';
