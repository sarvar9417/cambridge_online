CREATE TYPE live_exam_status AS ENUM (
  'lobby',
  'question_open',
  'marking',
  'review',
  'finished',
  'cancelled'
);

CREATE TYPE live_exam_marking_mode AS ENUM ('teacher', 'peer', 'self');
CREATE TYPE live_exam_review_status AS ENUM ('assigned', 'submitted', 'moderated');

CREATE TABLE live_exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES users,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  join_code text NOT NULL UNIQUE CHECK (join_code ~ '^[0-9]{6}$'),
  status live_exam_status NOT NULL DEFAULT 'lobby',
  marking_mode live_exam_marking_mode NOT NULL,
  question_time_limit_s int CHECK (question_time_limit_s BETWEEN 30 AND 7200),
  current_question_index int NOT NULL DEFAULT -1 CHECK (current_question_index >= -1),
  question_started_at timestamptz,
  answers_locked_at timestamptz,
  mark_scheme_revealed_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX live_exam_sessions_class_created_idx
  ON live_exam_sessions (class_id, created_at DESC);
CREATE INDEX live_exam_sessions_host_active_idx
  ON live_exam_sessions (host_id, updated_at DESC)
  WHERE status NOT IN ('finished', 'cancelled');

CREATE TABLE live_exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_exam_sessions ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions,
  position int NOT NULL CHECK (position >= 0),
  marks int NOT NULL CHECK (marks > 0),
  question_snapshot jsonb NOT NULL,
  mark_scheme_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, position),
  UNIQUE (session_id, question_id)
);

CREATE INDEX live_exam_questions_session_position_idx
  ON live_exam_questions (session_id, position);

CREATE TABLE live_exam_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_exam_sessions ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);

CREATE INDEX live_exam_participants_session_active_idx
  ON live_exam_participants (session_id, last_seen_at DESC)
  WHERE left_at IS NULL;

CREATE TABLE live_exam_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_question_id uuid NOT NULL REFERENCES live_exam_questions ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES live_exam_participants ON DELETE CASCADE,
  answer_text text NOT NULL DEFAULT '' CHECK (char_length(answer_text) <= 20000),
  word_count int NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  submitted_at timestamptz,
  final_score numeric(5,2),
  final_feedback_md text,
  score_source live_exam_marking_mode,
  moderated_by uuid REFERENCES users,
  moderated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_question_id, participant_id)
);

CREATE INDEX live_exam_answers_question_submit_idx
  ON live_exam_answers (session_question_id, submitted_at);

CREATE TABLE live_exam_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_question_id uuid NOT NULL REFERENCES live_exam_questions ON DELETE CASCADE,
  answer_id uuid NOT NULL REFERENCES live_exam_answers ON DELETE CASCADE,
  reviewer_id uuid REFERENCES users ON DELETE SET NULL,
  kind live_exam_marking_mode NOT NULL,
  status live_exam_review_status NOT NULL DEFAULT 'assigned',
  awarded_marks numeric(5,2) CHECK (awarded_marks >= 0),
  feedback_md text CHECK (char_length(feedback_md) <= 5000),
  submitted_at timestamptz,
  moderated_by uuid REFERENCES users,
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_question_id, answer_id, kind)
);

CREATE INDEX live_exam_reviews_reviewer_status_idx
  ON live_exam_reviews (reviewer_id, status, session_question_id);

CREATE TABLE live_exam_review_points (
  review_id uuid NOT NULL REFERENCES live_exam_reviews ON DELETE CASCADE,
  -- Deliberately not a FK: this ID belongs to the immutable scheme snapshot.
  -- A later edit or deletion in the source bank must not alter a live result.
  mark_scheme_point_id uuid NOT NULL,
  matched boolean NOT NULL DEFAULT false,
  awarded_marks numeric(4,2) NOT NULL DEFAULT 0 CHECK (awarded_marks >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, mark_scheme_point_id)
);

CREATE TABLE live_exam_events (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES live_exam_sessions ON DELETE CASCADE,
  actor_id uuid REFERENCES users ON DELETE SET NULL,
  event_type text NOT NULL,
  session_version bigint NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX live_exam_events_session_version_idx
  ON live_exam_events (session_id, session_version);

-- The browser never reads these tables through Supabase's Data API. All access
-- goes through the authenticated Express API, so leave no accidental second
-- authorization surface in the public schema.
ALTER TABLE live_exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_exam_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_exam_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_exam_review_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_exam_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON live_exam_sessions, live_exam_questions, live_exam_participants,
  live_exam_answers, live_exam_reviews, live_exam_review_points, live_exam_events
  FROM anon, authenticated;
REVOKE ALL ON SEQUENCE live_exam_events_id_seq FROM anon, authenticated;
