-- Cambridge Live Challenge foundation.
--
-- This migration establishes persistent, server-authoritative session state for
-- teacher-controlled live Cambridge assessment. It intentionally stores only
-- references/snapshots of the canonical question corpus: it does not create a
-- second editable question bank.
--
-- Security/integrity invariants established here:
--   * canonical questions remain FK-backed;
--   * active join codes are unique and six-character uppercase alpha-numeric;
--   * one participant/answer per student per challenge/round;
--   * locked answers cannot be rewritten;
--   * peer assignments carry the answer owner's id through a composite FK and
--     a CHECK constraint makes self-marking impossible at the database layer;
--   * teacher score changes are append-only audit rows rather than silent edits.

CREATE TYPE live_challenge_status AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'LOBBY',
  'QUESTION_ACTIVE',
  'ANSWERS_LOCKED',
  'PEER_MARKING',
  'ROUND_RESULTS',
  'FINISHED',
  'PAUSED',
  'CANCELLED'
);

CREATE TYPE live_challenge_participant_status AS ENUM (
  'JOINED',
  'LEFT',
  'REMOVED'
);

CREATE TYPE live_challenge_round_status AS ENUM (
  'PENDING',
  'QUESTION_ACTIVE',
  'ANSWERS_LOCKED',
  'PEER_MARKING',
  'ROUND_RESULTS',
  'CANCELLED'
);

CREATE TYPE live_challenge_peer_assignment_status AS ENUM (
  'ASSIGNED',
  'SUBMITTED',
  'CANCELLED'
);

CREATE TABLE live_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES users,
  class_id uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  title text NOT NULL CHECK (btrim(title) <> ''),
  syllabus_id uuid NOT NULL REFERENCES syllabi,
  topic_id uuid REFERENCES topics,
  subtopic_id uuid REFERENCES subtopics,
  join_code text,
  status live_challenge_status NOT NULL DEFAULT 'DRAFT',
  paused_from_status live_challenge_status,
  paused_at timestamptz,
  settings_json jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(settings_json) = 'object'),
  current_question_position int
    CHECK (current_question_position IS NULL OR current_question_position > 0),
  state_version bigint NOT NULL DEFAULT 0 CHECK (state_version >= 0),
  published_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (join_code IS NULL OR join_code ~ '^[A-Z0-9]{6}$'),
  CHECK (
    (status = 'PAUSED' AND paused_from_status IS NOT NULL AND paused_from_status <> 'PAUSED' AND paused_at IS NOT NULL)
    OR (status <> 'PAUSED' AND paused_from_status IS NULL AND paused_at IS NULL)
  )
);

CREATE UNIQUE INDEX live_challenges_active_join_code_idx
  ON live_challenges (join_code)
  WHERE join_code IS NOT NULL AND status NOT IN ('FINISHED', 'CANCELLED');
CREATE INDEX live_challenges_class_status_idx
  ON live_challenges (class_id, status, created_at DESC);
CREATE INDEX live_challenges_teacher_status_idx
  ON live_challenges (teacher_id, status, created_at DESC);

CREATE TABLE live_challenge_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES live_challenges ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions,
  position int NOT NULL CHECK (position > 0),
  max_marks_snapshot int NOT NULL CHECK (max_marks_snapshot > 0),
  source_occurrence_snapshot jsonb NOT NULL
    CHECK (jsonb_typeof(source_occurrence_snapshot) = 'object'),
  mark_scheme_snapshot jsonb NOT NULL
    CHECK (jsonb_typeof(mark_scheme_snapshot) = 'object'),
  time_limit_seconds int CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, position),
  UNIQUE (challenge_id, question_id)
);
CREATE INDEX live_challenge_questions_question_idx
  ON live_challenge_questions (question_id);

CREATE TABLE live_challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES live_challenges ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  status live_challenge_participant_status NOT NULL DEFAULT 'JOINED',
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  UNIQUE (challenge_id, student_id)
);
CREATE INDEX live_challenge_participants_student_idx
  ON live_challenge_participants (student_id, status);

CREATE TABLE live_challenge_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES live_challenges ON DELETE CASCADE,
  challenge_question_id uuid NOT NULL REFERENCES live_challenge_questions ON DELETE CASCADE,
  round_number int NOT NULL CHECK (round_number > 0),
  status live_challenge_round_status NOT NULL DEFAULT 'PENDING',
  started_at timestamptz,
  locked_at timestamptz,
  marking_started_at timestamptz,
  results_released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, round_number),
  UNIQUE (challenge_id, challenge_question_id)
);
CREATE INDEX live_challenge_rounds_status_idx
  ON live_challenge_rounds (challenge_id, status);

CREATE TABLE live_challenge_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES live_challenge_rounds ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  answer_text text NOT NULL CHECK (btrim(answer_text) <> ''),
  submission_duration_ms int CHECK (submission_duration_ms IS NULL OR submission_duration_ms >= 0),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, student_id),
  UNIQUE (id, student_id)
);
CREATE INDEX live_challenge_answers_round_submitted_idx
  ON live_challenge_answers (round_id, submitted_at);

CREATE OR REPLACE FUNCTION public.guard_locked_live_challenge_answer_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public','pg_temp'
AS $function$
BEGIN
  IF NEW.round_id IS DISTINCT FROM OLD.round_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id THEN
    RAISE EXCEPTION 'live_challenge_answer_identity_immutable';
  END IF;

  IF OLD.locked_at IS NOT NULL
     AND (
       NEW.answer_text IS DISTINCT FROM OLD.answer_text
       OR NEW.submission_duration_ms IS DISTINCT FROM OLD.submission_duration_ms
       OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
       OR NEW.locked_at IS DISTINCT FROM OLD.locked_at
     ) THEN
    RAISE EXCEPTION 'live_challenge_answer_locked';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END
$function$;

CREATE TRIGGER live_challenge_answers_locked_guard
BEFORE UPDATE ON live_challenge_answers
FOR EACH ROW
EXECUTE FUNCTION public.guard_locked_live_challenge_answer_v1();

CREATE TABLE live_challenge_peer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES live_challenge_rounds ON DELETE CASCADE,
  marker_student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  answer_id uuid NOT NULL,
  answer_student_id uuid NOT NULL,
  status live_challenge_peer_assignment_status NOT NULL DEFAULT 'ASSIGNED',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  FOREIGN KEY (answer_id, answer_student_id)
    REFERENCES live_challenge_answers (id, student_id) ON DELETE CASCADE,
  CHECK (marker_student_id <> answer_student_id),
  UNIQUE (round_id, marker_student_id)
);
CREATE INDEX live_challenge_peer_assignments_answer_idx
  ON live_challenge_peer_assignments (round_id, answer_id);

CREATE TABLE live_challenge_peer_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  peer_assignment_id uuid NOT NULL UNIQUE REFERENCES live_challenge_peer_assignments ON DELETE CASCADE,
  awarded_marks numeric(6,2) NOT NULL CHECK (awarded_marks >= 0),
  mark_points_json jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(mark_points_json) = 'array'),
  feedback_text text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE live_challenge_score_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES live_challenge_rounds ON DELETE CASCADE,
  answer_id uuid NOT NULL REFERENCES live_challenge_answers ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES users,
  previous_score numeric(6,2) CHECK (previous_score IS NULL OR previous_score >= 0),
  new_score numeric(6,2) NOT NULL CHECK (new_score >= 0),
  reason text CHECK (reason IS NULL OR btrim(reason) <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_challenge_score_overrides_answer_idx
  ON live_challenge_score_overrides (answer_id, created_at DESC);

CREATE TABLE live_challenge_events (
  id bigserial PRIMARY KEY,
  challenge_id uuid NOT NULL REFERENCES live_challenges ON DELETE CASCADE,
  actor_id uuid REFERENCES users,
  event_type text NOT NULL CHECK (btrim(event_type) <> ''),
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(payload_json) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_challenge_events_challenge_idx
  ON live_challenge_events (challenge_id, id);

COMMENT ON COLUMN live_challenge_questions.mark_scheme_snapshot IS
  'Approved mark-scheme snapshot for audit/replay. Student APIs must withhold this field until PEER_MARKING or later.';
COMMENT ON COLUMN live_challenges.state_version IS
  'Optimistic-concurrency counter for compare-and-set state transitions.';
COMMENT ON COLUMN live_challenges.paused_at IS
  'Server timestamp used to exclude paused duration from active-question timing when a session resumes.';
