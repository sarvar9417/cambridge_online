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
  id uuid PRIMARY KEY
);

CREATE TABLE classes (
  id uuid PRIMARY KEY,
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

INSERT INTO users(id) VALUES
  ('66666666-6666-4666-8666-666666666666'),
  ('77777777-7777-4777-8777-777777777777'),
  ('99999999-9999-4999-8999-999999999999');

INSERT INTO topics(id,syllabus_id) VALUES
  ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111');
INSERT INTO subtopics(id,topic_id) VALUES
  ('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222');
INSERT INTO learning_objectives(id,subtopic_id) VALUES
  ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333');
INSERT INTO classes(id,syllabus_id,school_id,owner_id) VALUES
  ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','school','66666666-6666-4666-8666-666666666666');
INSERT INTO enrollments(class_id,student_id) VALUES
  ('55555555-5555-4555-8555-555555555555','77777777-7777-4777-8777-777777777777'),
  ('55555555-5555-4555-8555-555555555555','99999999-9999-4999-8999-999999999999');
INSERT INTO questions(id) VALUES
  ('88888888-8888-4888-8888-888888888888');
INSERT INTO question_learning_objectives(question_id,lo_id,confidence) VALUES
  ('88888888-8888-4888-8888-888888888888','44444444-4444-4444-8444-444444444444',1.00);

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
