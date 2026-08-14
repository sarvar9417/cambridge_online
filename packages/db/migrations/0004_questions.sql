-- The question bank.
--
-- `questions` is a self-referencing tree: Q3 -> Q3(b) -> Q3(b)(ii). A parent
-- carries the shared scenario and no marks; only leaves carry marks. `path`
-- ('3.b.ii') makes ancestor and descendant queries cheap without recursion, and
-- the context chain is walked by ascending it.

CREATE TABLE source_papers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id  uuid NOT NULL REFERENCES syllabi,
  component_id uuid NOT NULL REFERENCES components,
  year         int NOT NULL,
  series       exam_series NOT NULL,
  variant      int NOT NULL,
  kind         paper_kind NOT NULL,
  storage_path text NOT NULL,                        -- S3 key
  sha256       text NOT NULL UNIQUE,                 -- idempotency key for ingestion
  page_count   int,
  uploaded_by  uuid REFERENCES users,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (syllabus_id, component_id, year, series, variant, kind)
);

CREATE TABLE questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_paper_id uuid NOT NULL REFERENCES source_papers ON DELETE CASCADE,
  component_id    uuid NOT NULL REFERENCES components,
  parent_id       uuid REFERENCES questions ON DELETE CASCADE,
  label           text NOT NULL,                     -- '3', 'b', 'ii'
  path            text NOT NULL,                     -- '3.b.ii'
  display_ref     text NOT NULL,                     -- '9618/12/M/J/23 Q3(b)(ii)'
  depth           int NOT NULL DEFAULT 0,
  sort_order      int NOT NULL,

  stem_md         text,
  context_md      text,                              -- shared scenario, parents only
  command_word    command_word,
  marks           int CHECK (marks >= 0),            -- NULL on parents
  ao              ao_type,
  answer_kind     answer_kind NOT NULL DEFAULT 'text',
  answer_lines    int,

  status             review_status NOT NULL DEFAULT 'needs_review',
  extract_confidence numeric(3, 2),
  prompt_version     text,
  reviewed_by        uuid REFERENCES users,
  reviewed_at        timestamptz,
  notes              text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_paper_id, path)
);

CREATE INDEX questions_source_paper_idx ON questions (source_paper_id);
CREATE INDEX questions_parent_idx ON questions (parent_id);
CREATE INDEX questions_status_idx ON questions (status);
CREATE INDEX questions_command_word_idx ON questions (command_word);
CREATE INDEX questions_leaf_idx ON questions (component_id) WHERE marks IS NOT NULL;
CREATE INDEX questions_stem_fts_idx ON questions
  USING gin (to_tsvector('english', coalesce(stem_md, '')));

CREATE TABLE question_assets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  kind         answer_kind NOT NULL,
  storage_path text,
  content_md   text,                                 -- tables and code as markdown
  alt_text     text NOT NULL DEFAULT '',
  sort_order   int NOT NULL DEFAULT 0,
  source_page  int
);

CREATE INDEX question_assets_question_idx ON question_assets (question_id);

-- A leaf may genuinely test several subtopics. `weight` keeps mastery honest:
-- awarding full credit to five subtopics for one 3-mark answer would inflate it
-- five-fold.
CREATE TABLE question_subtopics (
  question_id uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE,
  is_primary  boolean NOT NULL DEFAULT false,
  weight      numeric(3, 2) NOT NULL DEFAULT 1.0,
  confidence  numeric(3, 2),
  set_by      text NOT NULL DEFAULT 'ai',            -- 'ai' | 'teacher'
  PRIMARY KEY (question_id, subtopic_id)
);

CREATE INDEX question_subtopics_subtopic_idx ON question_subtopics (subtopic_id);

CREATE TABLE question_learning_objectives (
  question_id uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  lo_id       uuid NOT NULL REFERENCES learning_objectives ON DELETE CASCADE,
  confidence  numeric(3, 2),
  PRIMARY KEY (question_id, lo_id)
);

-- "Using your answer to part (b)". Extracting the dependent without its
-- dependency produces a question no student can answer, so selection warns.
CREATE TABLE question_dependencies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  depends_on_id uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  kind          text NOT NULL,                       -- 'answer' | 'context' | 'asset'
  strength      text NOT NULL DEFAULT 'hard',        -- 'hard' | 'soft'
  evidence      text,                                -- the phrase that shows it
  detected_by   text NOT NULL DEFAULT 'ai',          -- 'ai' | 'teacher'
  confidence    numeric(3, 2),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, depends_on_id),
  CHECK (question_id <> depends_on_id)
);

CREATE INDEX question_dependencies_depends_on_idx ON question_dependencies (depends_on_id);
