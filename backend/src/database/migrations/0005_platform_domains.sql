CREATE TYPE assignment_mode AS ENUM ('online', 'pdf', 'mock', 'practice');
CREATE TYPE submission_status AS ENUM ('not_started', 'in_progress', 'submitted', 'grading', 'graded', 'released', 'late');
CREATE TYPE grading_status AS ENUM ('queued', 'ai_done', 'needs_teacher', 'teacher_done', 'released', 'failed');
CREATE TYPE content_kind AS ENUM ('notes', 'slides', 'glossary', 'flashcard_deck', 'quiz', 'game', 'worked_example');
CREATE TYPE job_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');
CREATE TYPE finding_severity AS ENUM ('info', 'warning', 'error');

CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL, ref_table text, ref_id uuid,
  status job_status NOT NULL DEFAULT 'queued', priority int NOT NULL DEFAULT 100,
  attempts int NOT NULL DEFAULT 0, max_attempts int NOT NULL DEFAULT 3,
  payload jsonb NOT NULL DEFAULT '{}', idempotency_key text NOT NULL UNIQUE,
  result jsonb, error text, locked_at timestamptz, locked_by text,
  scheduled_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz,
  finished_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_queue_idx ON jobs (status, scheduled_at) WHERE status = 'queued';

CREATE TABLE validation_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rule_code text NOT NULL,
  severity finding_severity NOT NULL, ref_table text NOT NULL, ref_id uuid NOT NULL,
  message text NOT NULL, details jsonb, resolved_at timestamptz, resolved_by uuid REFERENCES users,
  resolution text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cross_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ref_table text NOT NULL, ref_id uuid NOT NULL,
  checker_prompt_version text NOT NULL, agrees boolean NOT NULL, disagreement jsonb,
  confidence numeric(3,2), created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users, title text NOT NULL, instructions_md text,
  mode assignment_mode NOT NULL DEFAULT 'online', total_marks int NOT NULL DEFAULT 0,
  opens_at timestamptz, due_at timestamptz, time_limit_min int, proctored boolean NOT NULL DEFAULT false,
  session_code text, session_opened_at timestamptz, counts_towards_grade boolean NOT NULL DEFAULT true,
  mastery_weight numeric(3,2) NOT NULL DEFAULT 1.0, release_policy text NOT NULL DEFAULT 'after_grading',
  released_at timestamptz, shuffle_questions boolean NOT NULL DEFAULT false,
  allow_late boolean NOT NULL DEFAULT true, published_at timestamptz, archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assignments_class_due_idx ON assignments (class_id, due_at);

CREATE TABLE assignment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assignment_id uuid NOT NULL REFERENCES assignments ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions, sort_order int NOT NULL, marks_override int,
  UNIQUE (assignment_id, question_id)
);

CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assignment_id uuid NOT NULL REFERENCES assignments ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  status submission_status NOT NULL DEFAULT 'not_started', started_at timestamptz,
  submitted_at timestamptz, time_spent_s int NOT NULL DEFAULT 0, active_session_id uuid,
  time_extension_min int NOT NULL DEFAULT 0, auto_submitted boolean NOT NULL DEFAULT false,
  integrity_flags jsonb NOT NULL DEFAULT '[]', total_score numeric(6,2), total_max int,
  percentage numeric(5,2), grade text, released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (assignment_id, student_id)
);
CREATE INDEX submissions_student_status_idx ON submissions (student_id, status);

CREATE TABLE answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), submission_id uuid NOT NULL REFERENCES submissions ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions, kind answer_kind NOT NULL DEFAULT 'text',
  text text, code text, language text, image_paths text[] NOT NULL DEFAULT '{}', ocr_text text,
  ocr_confidence numeric(3,2), word_count int, updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, question_id)
);

CREATE TABLE gradings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), answer_id uuid NOT NULL UNIQUE REFERENCES answers ON DELETE CASCADE,
  status grading_status NOT NULL DEFAULT 'queued', ai_score numeric(5,2), ai_confidence numeric(3,2),
  ai_feedback_md text, ai_raw jsonb, prompt_version text, model text, graded_at_ai timestamptz,
  teacher_score numeric(5,2), teacher_feedback_md text, graded_by uuid REFERENCES users,
  graded_at timestamptz, override_reason text, final_score numeric(5,2), max_marks int NOT NULL,
  released_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE grading_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), grading_id uuid NOT NULL REFERENCES gradings ON DELETE CASCADE,
  mark_scheme_point_id uuid NOT NULL REFERENCES mark_scheme_points ON DELETE CASCADE,
  ai_matched boolean, ai_evidence text, ai_reason text, ai_confidence numeric(3,2),
  teacher_matched boolean, changed_by_teacher boolean GENERATED ALWAYS AS
    (teacher_matched IS NOT NULL AND teacher_matched IS DISTINCT FROM ai_matched) STORED,
  final_matched boolean, awarded_marks numeric(4,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (grading_id, mark_scheme_point_id)
);

CREATE TABLE grading_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), prompt_version text NOT NULL, model text NOT NULL,
  sample_size int NOT NULL, point_agreement_pct numeric(5,2), score_exact_pct numeric(5,2),
  score_within_1_pct numeric(5,2), mean_abs_error numeric(4,2), false_positive_pct numeric(5,2),
  false_negative_pct numeric(5,2), by_command_word jsonb, by_topic jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE,
  kind content_kind NOT NULL, title text NOT NULL, body_md text, locale text NOT NULL DEFAULT 'uz',
  status review_status NOT NULL DEFAULT 'needs_review', version int NOT NULL DEFAULT 1,
  generated_by text, prompt_version text, reviewed_by uuid REFERENCES users,
  sort_order int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE glossary_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE,
  term text NOT NULL, definition_en text NOT NULL, definition_uz text, example_md text, source_ref text,
  status review_status NOT NULL DEFAULT 'needs_review', UNIQUE (subtopic_id, term)
);

CREATE TABLE flashcard_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE,
  title text NOT NULL, locale text NOT NULL DEFAULT 'uz', status review_status NOT NULL DEFAULT 'needs_review'
);
CREATE TABLE flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), deck_id uuid NOT NULL REFERENCES flashcard_decks ON DELETE CASCADE,
  front_md text NOT NULL, back_md text NOT NULL, hint_md text, glossary_term_id uuid REFERENCES glossary_terms,
  source_question_id uuid REFERENCES questions, sort_order int NOT NULL DEFAULT 0
);
CREATE TABLE flashcard_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  flashcard_id uuid NOT NULL REFERENCES flashcards ON DELETE CASCADE, ease_factor numeric(4,2) NOT NULL DEFAULT 2.5,
  interval_days int NOT NULL DEFAULT 0, repetitions int NOT NULL DEFAULT 0, lapses int NOT NULL DEFAULT 0,
  due_at timestamptz NOT NULL DEFAULT now(), last_grade int, last_reviewed_at timestamptz,
  UNIQUE (user_id, flashcard_id)
);

CREATE TABLE mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE, score numeric(4,3) NOT NULL DEFAULT 0,
  attempts int NOT NULL DEFAULT 0, marks_earned numeric(8,2) NOT NULL DEFAULT 0,
  marks_possible numeric(8,2) NOT NULL DEFAULT 0, last_activity_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (student_id, subtopic_id)
);
CREATE TABLE error_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  mark_scheme_point_id uuid NOT NULL REFERENCES mark_scheme_points ON DELETE CASCADE,
  miss_count int NOT NULL DEFAULT 0, hit_count int NOT NULL DEFAULT 0, last_seen_at timestamptz,
  UNIQUE (student_id, mark_scheme_point_id)
);

CREATE TABLE grade_boundaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), component_id uuid NOT NULL REFERENCES components,
  year int NOT NULL, series exam_series NOT NULL, grade text NOT NULL, min_mark int NOT NULL,
  UNIQUE (component_id, year, series, grade)
);

CREATE TABLE ai_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), purpose text NOT NULL, model text NOT NULL,
  prompt_version text, ref_table text, ref_id uuid, input_tokens int, output_tokens int,
  cache_read_tokens int, cache_write_tokens int, cost_usd numeric(10,6), latency_ms int,
  ok boolean NOT NULL DEFAULT true, error text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES users, action text NOT NULL,
  ref_table text, ref_id uuid, before jsonb, after jsonb, ip inet, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app_settings (
  key text PRIMARY KEY, value jsonb NOT NULL, updated_by uuid REFERENCES users,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings (key, value) VALUES
  ('grading.autopilot_enabled', 'false'),
  ('grading.confidence_threshold', '0.85'),
  ('grading.model', '"claude-sonnet-4-6"'),
  ('ai.monthly_budget_usd', '50');
