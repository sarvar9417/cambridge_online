CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END
$do$;

CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Acceptance school'
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools ON DELETE SET NULL,
  role text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE syllabi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL
);

CREATE TABLE topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id uuid NOT NULL REFERENCES syllabi ON DELETE CASCADE,
  number int NOT NULL
);

CREATE TABLE subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES topics ON DELETE CASCADE,
  code text NOT NULL
);

CREATE TABLE learning_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE
);

CREATE TABLE learning_objective_compatibility (
  target_lo_id uuid NOT NULL REFERENCES learning_objectives ON DELETE CASCADE,
  source_lo_id uuid NOT NULL REFERENCES learning_objectives ON DELETE CASCADE,
  relation text NOT NULL
);

CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools,
  syllabus_id uuid NOT NULL REFERENCES syllabi,
  owner_id uuid NOT NULL REFERENCES users,
  name text NOT NULL DEFAULT 'Acceptance class',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE class_teachers (
  class_id uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  PRIMARY KEY (class_id, teacher_id)
);

CREATE TABLE enrollments (
  class_id uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  left_at timestamptz,
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE question_learning_objectives (
  question_id uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  lo_id uuid NOT NULL REFERENCES learning_objectives ON DELETE CASCADE,
  confidence numeric(3,2)
);

CREATE TABLE question_subtopics (
  question_id uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  confidence numeric(3,2)
);

CREATE TABLE mastery (
  student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE,
  score numeric(8,4) NOT NULL DEFAULT 0,
  attempts int NOT NULL DEFAULT 0,
  marks_earned numeric(8,2) NOT NULL DEFAULT 0,
  marks_possible numeric(8,2) NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, subtopic_id)
);

CREATE OR REPLACE FUNCTION public.guard_approved_9618_structured_content_source_host_v1()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  RETURN NEW;
END
$fn$;
