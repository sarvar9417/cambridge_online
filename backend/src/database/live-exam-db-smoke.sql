\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

-- Minimal canonical dependencies needed to exercise the live_exam migration chain
-- on a clean PostgreSQL instance. This is intentionally not an application
-- schema replacement; it is a migration compatibility harness.
CREATE TABLE users (
  id uuid PRIMARY KEY,
  full_name text NOT NULL
);

CREATE TABLE classes (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  syllabus_id uuid NOT NULL,
  school_id text NOT NULL,
  owner_id uuid NOT NULL REFERENCES users
);

CREATE TABLE class_teachers (
  class_id uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  PRIMARY KEY(class_id,teacher_id)
);

CREATE TABLE enrollments (
  class_id uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  left_at timestamptz,
  PRIMARY KEY(class_id,student_id)
);

CREATE TABLE questions (
  id uuid PRIMARY KEY
);

CREATE TABLE topics (
  id uuid PRIMARY KEY,
  syllabus_id uuid NOT NULL
);

CREATE TABLE subtopics (
  id uuid PRIMARY KEY,
  topic_id uuid NOT NULL REFERENCES topics ON DELETE CASCADE
);

CREATE TABLE learning_objectives (
  id uuid PRIMARY KEY,
  subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE
);

CREATE TABLE question_learning_objectives (
  question_id uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  lo_id uuid NOT NULL REFERENCES learning_objectives ON DELETE CASCADE,
  confidence numeric(3,2),
  PRIMARY KEY(question_id,lo_id)
);

CREATE TABLE learning_objective_compatibility (
  source_lo_id uuid NOT NULL REFERENCES learning_objectives ON DELETE CASCADE,
  target_lo_id uuid NOT NULL REFERENCES learning_objectives ON DELETE CASCADE,
  relation text NOT NULL,
  PRIMARY KEY(source_lo_id,target_lo_id)
);

CREATE TABLE mastery (
  student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE,
  score numeric(8,6) NOT NULL DEFAULT 0,
  attempts int NOT NULL DEFAULT 0,
  marks_earned numeric(8,2) NOT NULL DEFAULT 0,
  marks_possible numeric(8,2) NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(student_id,subtopic_id)
);

\ir migrations/0166_live_exam_sessions.sql
\ir migrations/0167_live_exam_fk_indexes.sql
\ir migrations/0168_live_exam_peer_integrity.sql
\ir migrations/0169_live_exam_override_audit.sql
\ir migrations/0170_live_exam_learning_evidence.sql
\ir migrations/0172_live_exam_builder_lifecycle.sql
\ir migrations/0173_live_exam_override_reason.sql


-- Additional canonical source metadata used by the service-level builder test.
-- The migration chain above intentionally needs only the core classroom tables;
-- these harness-only objects let the same ephemeral database exercise
-- source-provenance selection and publish without cloning the whole app schema.
CREATE TABLE syllabi (
  id uuid PRIMARY KEY,
  code text NOT NULL,
  subject text NOT NULL
);

CREATE TABLE components (
  id uuid PRIMARY KEY,
  number int NOT NULL
);

CREATE TABLE source_papers (
  id uuid PRIMARY KEY,
  syllabus_id uuid NOT NULL REFERENCES syllabi,
  kind text NOT NULL,
  year int NOT NULL,
  series text NOT NULL,
  component_id uuid NOT NULL REFERENCES components,
  variant int NOT NULL,
  source_url text,
  sha256 text
);

ALTER TABLE classes ADD COLUMN archived_at timestamptz;
ALTER TABLE questions
  ADD COLUMN status text NOT NULL DEFAULT 'approved',
  ADD COLUMN marks int,
  ADD COLUMN parent_id uuid,
  ADD COLUMN source_paper_id uuid REFERENCES source_papers,
  ADD COLUMN component_id uuid REFERENCES components,
  ADD COLUMN display_ref text,
  ADD COLUMN stem_md text,
  ADD COLUMN command_word text,
  ADD COLUMN answer_kind text,
  ADD COLUMN ao text;
ALTER TABLE topics
  ADD COLUMN number int,
  ADD COLUMN title text,
  ADD COLUMN sort_order int NOT NULL DEFAULT 0;
ALTER TABLE subtopics
  ADD COLUMN code text,
  ADD COLUMN title text,
  ADD COLUMN sort_order int NOT NULL DEFAULT 0;

CREATE TABLE question_subtopics (
  question_id uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY(question_id,subtopic_id)
);

CREATE TABLE question_dependencies (
  question_id uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  depends_on_id uuid NOT NULL,
  PRIMARY KEY(question_id,depends_on_id)
);

CREATE TABLE canonical_mark_schemes (
  id uuid PRIMARY KEY,
  question_id uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  source_paper_id uuid NOT NULL REFERENCES source_papers,
  status text NOT NULL,
  scheme_type text NOT NULL,
  max_marks int NOT NULL,
  guidance_md text
);

CREATE TABLE mark_scheme_points (
  id uuid PRIMARY KEY,
  mark_scheme_id uuid NOT NULL REFERENCES canonical_mark_schemes ON DELETE CASCADE,
  code text,
  text text NOT NULL,
  marks numeric(4,2) NOT NULL,
  accept jsonb,
  reject jsonb,
  requires jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_bod boolean NOT NULL DEFAULT false,
  group_id uuid,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE mark_scheme_groups (
  id uuid PRIMARY KEY,
  mark_scheme_id uuid NOT NULL REFERENCES canonical_mark_schemes ON DELETE CASCADE,
  label text,
  n_required int,
  marks_per_point numeric(4,2),
  max_marks numeric(4,2),
  award_mode text,
  sort_order int NOT NULL DEFAULT 0
);

DO $$
DECLARE
  statuses text[];
  join_nullable text;
BEGIN
  SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
    INTO statuses
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid=t.oid
  WHERE t.typname='live_exam_status';

  IF statuses IS DISTINCT FROM ARRAY[
    'draft','published','lobby','question_open','answers_locked',
    'marking','review','paused','finished','cancelled'
  ]::text[] THEN
    RAISE EXCEPTION 'unexpected live_exam_status order: %', statuses;
  END IF;

  SELECT is_nullable INTO join_nullable
  FROM information_schema.columns
  WHERE table_schema='public'
    AND table_name='live_exam_sessions'
    AND column_name='join_code';

  IF join_nullable <> 'YES' THEN
    RAISE EXCEPTION 'draft join_code must be nullable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='live_exam_sessions' AND column_name='published_at'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='live_exam_sessions' AND column_name='paused_at'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='live_exam_sessions' AND column_name='paused_from_status'
  ) THEN
    RAISE EXCEPTION 'builder lifecycle columns are incomplete';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='live_exam_answers' AND column_name='moderation_reason'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='live_exam_score_overrides' AND column_name='reason'
  ) THEN
    RAISE EXCEPTION 'moderation reason columns are incomplete';
  END IF;
END
$$;

INSERT INTO users(id,full_name) VALUES
  ('66666666-6666-4666-8666-666666666666','Teacher'),
  ('77777777-7777-4777-8777-777777777777','Student A'),
  ('99999999-9999-4999-8999-999999999999','Student B');

INSERT INTO syllabi(id,code,subject) VALUES
  ('11111111-1111-4111-8111-111111111111','9618','Computer Science');
INSERT INTO components(id,number) VALUES
  ('16161616-1616-4161-8161-161616161616',11);
INSERT INTO source_papers(id,syllabus_id,kind,year,series,component_id,variant,source_url,sha256) VALUES
  ('17171717-1717-4171-8171-171717171717','11111111-1111-4111-8111-111111111111','QP',2025,'M/J','16161616-1616-4161-8161-161616161616',1,'https://example.invalid/9618_qp_11.pdf',repeat('a',64)),
  ('18181818-1818-4181-8181-181818181818','11111111-1111-4111-8111-111111111111','MS',2025,'M/J','16161616-1616-4161-8161-161616161616',1,'https://example.invalid/9618_ms_11.pdf',repeat('b',64));
INSERT INTO topics(id,syllabus_id,number,title,sort_order) VALUES
  ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',1,'Information representation',1);
INSERT INTO subtopics(id,topic_id,code,title,sort_order) VALUES
  ('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','1.1','Data representation',1);
INSERT INTO learning_objectives(id,subtopic_id) VALUES
  ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333');
INSERT INTO classes(id,name,syllabus_id,school_id,owner_id) VALUES
  ('55555555-5555-4555-8555-555555555555','AS Integration','11111111-1111-4111-8111-111111111111','school','66666666-6666-4666-8666-666666666666');
INSERT INTO enrollments(class_id,student_id) VALUES
  ('55555555-5555-4555-8555-555555555555','77777777-7777-4777-8777-777777777777'),
  ('55555555-5555-4555-8555-555555555555','99999999-9999-4999-8999-999999999999');
INSERT INTO questions(
  id,status,marks,parent_id,source_paper_id,component_id,display_ref,stem_md,command_word,answer_kind,ao
) VALUES (
  '88888888-8888-4888-8888-888888888888','approved',2,
  '19191919-1919-4191-8191-191919191919',
  '17171717-1717-4171-8171-171717171717',
  '16161616-1616-4161-8161-161616161616',
  '9618/11/M/J/25 Q1','State two valid points.','State','text','AO1'
);
INSERT INTO question_subtopics(question_id,subtopic_id,is_primary) VALUES
  ('88888888-8888-4888-8888-888888888888','33333333-3333-4333-8333-333333333333',true);
INSERT INTO question_learning_objectives(question_id,lo_id,confidence) VALUES
  ('88888888-8888-4888-8888-888888888888','44444444-4444-4444-8444-444444444444',1.00);
INSERT INTO canonical_mark_schemes(id,question_id,source_paper_id,status,scheme_type,max_marks,guidance_md) VALUES
  ('14141414-1414-4141-8141-141414141414','88888888-8888-4888-8888-888888888888','18181818-1818-4181-8181-181818181818','approved','all_required',2,null);
INSERT INTO mark_scheme_points(id,mark_scheme_id,code,text,marks,sort_order) VALUES
  ('12121212-1212-4121-8121-121212121212','14141414-1414-4141-8141-141414141414','MP1','First mark point',1,1),
  ('13131313-1313-4131-8131-131313131313','14141414-1414-4141-8141-141414141414','MP2','Second mark point',1,2);


INSERT INTO live_exam_sessions(
  id,class_id,host_id,title,join_code,status,marking_mode
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
  'Preview DB smoke',
  NULL,
  'draft',
  'peer'
);

INSERT INTO live_exam_questions(
  id,session_id,question_id,position,marks,question_snapshot,mark_scheme_snapshot
) VALUES (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '88888888-8888-4888-8888-888888888888',
  0,2,'{}'::jsonb,'{}'::jsonb
);

INSERT INTO live_exam_participants(id,session_id,student_id) VALUES (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '77777777-7777-4777-8777-777777777777'
);

INSERT INTO live_exam_answers(
  id,session_question_id,participant_id,answer_text,final_score,score_source
) VALUES (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'test answer',0,'peer'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO live_exam_reviews(
      session_question_id,answer_id,reviewer_id,kind
    ) VALUES (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      '77777777-7777-4777-8777-777777777777',
      'peer'
    );
    RAISE EXCEPTION 'peer self-review unexpectedly succeeded';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'live_peer_assignment_impossible' THEN
        RAISE;
      END IF;
  END;
END
$$;

UPDATE live_exam_answers
SET final_score=1,
    score_source='teacher',
    moderated_by='66666666-6666-4666-8666-666666666666',
    moderation_reason='Corrected against canonical mark scheme',
    moderated_at=now()
WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';

DO $$
DECLARE
  audit_reason text;
BEGIN
  SELECT reason INTO audit_reason
  FROM live_exam_score_overrides
  WHERE answer_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  ORDER BY created_at DESC
  LIMIT 1;

  IF audit_reason IS DISTINCT FROM 'Corrected against canonical mark scheme' THEN
    RAISE EXCEPTION 'override reason was not preserved: %', audit_reason;
  END IF;
END
$$;

UPDATE live_exam_sessions
SET status='review'
WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

UPDATE live_exam_sessions
SET status='finished',finished_at=now()
WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

DO $$
DECLARE
  evidence_count int;
  earned numeric;
  possible numeric;
BEGIN
  SELECT count(*) INTO evidence_count
  FROM live_exam_learning_evidence
  WHERE answer_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  IF evidence_count <> 1 THEN
    RAISE EXCEPTION 'expected one learning evidence row, found %', evidence_count;
  END IF;

  SELECT marks_earned,marks_possible INTO earned,possible
  FROM mastery
  WHERE student_id='77777777-7777-4777-8777-777777777777'
    AND subtopic_id='33333333-3333-4333-8333-333333333333';

  IF earned IS DISTINCT FROM 1::numeric OR possible IS DISTINCT FROM 2::numeric THEN
    RAISE EXCEPTION 'unexpected mastery marks: earned %, possible %', earned, possible;
  END IF;
END
$$;

SELECT 'live_challenge_db_smoke_ok' AS result;
