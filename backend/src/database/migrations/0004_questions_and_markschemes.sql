CREATE TYPE exam_series AS ENUM ('MJ', 'ON', 'FM');
CREATE TYPE paper_kind AS ENUM ('QP', 'MS', 'IN', 'ER', 'GT');
CREATE TYPE ao_type AS ENUM ('AO1', 'AO2', 'AO3');
CREATE TYPE review_status AS ENUM ('draft', 'needs_review', 'approved', 'rejected', 'archived');
CREATE TYPE scheme_type AS ENUM ('all_required', 'any_n_from_m', 'levels_of_response', 'exact_match', 'code_output', 'manual_only');
CREATE TYPE command_word AS ENUM ('State', 'Give', 'Name', 'Identify', 'Define', 'Describe', 'Explain', 'Compare', 'Calculate', 'Complete', 'Draw', 'Write', 'Evaluate', 'Justify', 'Suggest', 'Show', 'Other');
CREATE TYPE answer_kind AS ENUM ('text', 'pseudocode', 'code', 'image', 'table', 'diagram');

CREATE TABLE source_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id uuid NOT NULL REFERENCES syllabi,
  component_id uuid NOT NULL REFERENCES components,
  year int NOT NULL,
  series exam_series NOT NULL,
  variant int NOT NULL,
  kind paper_kind NOT NULL,
  storage_path text NOT NULL,
  sha256 text NOT NULL UNIQUE,
  page_count int,
  uploaded_by uuid REFERENCES users,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (syllabus_id, component_id, year, series, variant, kind)
);

CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_paper_id uuid NOT NULL REFERENCES source_papers ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES components,
  parent_id uuid REFERENCES questions ON DELETE CASCADE,
  label text NOT NULL,
  path text NOT NULL,
  display_ref text NOT NULL,
  depth int NOT NULL DEFAULT 0,
  sort_order int NOT NULL,
  stem_md text,
  context_md text,
  command_word command_word,
  marks int CHECK (marks >= 0),
  ao ao_type,
  answer_kind answer_kind NOT NULL DEFAULT 'text',
  answer_lines int,
  status review_status NOT NULL DEFAULT 'needs_review',
  extract_confidence numeric(3,2),
  prompt_version text,
  reviewed_by uuid REFERENCES users,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_paper_id, path)
);

CREATE INDEX questions_source_paper_idx ON questions (source_paper_id);
CREATE INDEX questions_parent_idx ON questions (parent_id);
CREATE INDEX questions_status_idx ON questions (status);
CREATE INDEX questions_command_word_idx ON questions (command_word);
CREATE INDEX questions_search_idx ON questions USING gin (to_tsvector('english', coalesce(stem_md, '')));

CREATE TABLE question_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  kind answer_kind NOT NULL,
  storage_path text,
  content_md text,
  alt_text text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  source_page int
);

CREATE TABLE question_subtopics (
  question_id uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  weight numeric(3,2) NOT NULL DEFAULT 1.0,
  confidence numeric(3,2),
  set_by text NOT NULL DEFAULT 'ai',
  PRIMARY KEY (question_id, subtopic_id)
);

CREATE TABLE question_learning_objectives (
  question_id uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  lo_id uuid NOT NULL REFERENCES learning_objectives ON DELETE CASCADE,
  confidence numeric(3,2),
  PRIMARY KEY (question_id, lo_id)
);

CREATE TABLE mark_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL UNIQUE REFERENCES questions ON DELETE CASCADE,
  source_paper_id uuid REFERENCES source_papers,
  scheme_type scheme_type NOT NULL,
  max_marks int NOT NULL CHECK (max_marks > 0),
  guidance_md text,
  status review_status NOT NULL DEFAULT 'needs_review',
  extract_confidence numeric(3,2),
  prompt_version text,
  reviewed_by uuid REFERENCES users,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mark_scheme_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_scheme_id uuid NOT NULL REFERENCES mark_schemes ON DELETE CASCADE,
  label text,
  n_required int NOT NULL,
  marks_per_point int NOT NULL DEFAULT 1,
  max_marks int NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE mark_scheme_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_scheme_id uuid NOT NULL REFERENCES mark_schemes ON DELETE CASCADE,
  group_id uuid REFERENCES mark_scheme_groups ON DELETE CASCADE,
  code text NOT NULL,
  text text NOT NULL,
  marks int NOT NULL DEFAULT 1,
  accept jsonb NOT NULL DEFAULT '[]',
  reject jsonb NOT NULL DEFAULT '[]',
  requires jsonb NOT NULL DEFAULT '[]',
  is_bod boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (mark_scheme_id, code)
);

CREATE TABLE mark_scheme_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_scheme_id uuid NOT NULL REFERENCES mark_schemes ON DELETE CASCADE,
  level_number int NOT NULL,
  min_marks int NOT NULL,
  max_marks int NOT NULL,
  descriptor_md text NOT NULL,
  indicative_content_md text
);
