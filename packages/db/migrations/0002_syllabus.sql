-- The 9618 syllabus tree. Questions are classified against subtopics: topic level
-- is too coarse (40 questions per topic), learning-objective level is too fine
-- for reliable classification.

CREATE TABLE syllabi (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL,                      -- '9618'
  subject       text NOT NULL,                      -- 'Computer Science'
  version_label text NOT NULL,                      -- '2026-2028'
  valid_from    int NOT NULL,
  valid_to      int NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, version_label)
);

CREATE TABLE components (                            -- Paper 1..4
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id  uuid NOT NULL REFERENCES syllabi ON DELETE CASCADE,
  number       int NOT NULL CHECK (number BETWEEN 1 AND 4),
  name         text NOT NULL,
  level        level_type NOT NULL,
  duration_min int NOT NULL,
  total_marks  int NOT NULL,
  weight_pct   numeric(5, 2),
  UNIQUE (syllabus_id, number)
);

CREATE TABLE topics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id  uuid NOT NULL REFERENCES syllabi ON DELETE CASCADE,
  number       int NOT NULL,                         -- 1..20
  title        text NOT NULL,
  level        level_type NOT NULL,
  component_id uuid REFERENCES components,
  sort_order   int NOT NULL,
  UNIQUE (syllabus_id, number)
);

CREATE TABLE subtopics (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id   uuid NOT NULL REFERENCES topics ON DELETE CASCADE,
  code       text NOT NULL,                          -- '1.1'
  title      text NOT NULL,
  sort_order int NOT NULL,
  UNIQUE (topic_id, code)
);

CREATE TABLE learning_objectives (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE,
  code        text NOT NULL,                         -- '1.1.1'
  text        text NOT NULL,
  sort_order  int NOT NULL,
  UNIQUE (subtopic_id, code)
);
