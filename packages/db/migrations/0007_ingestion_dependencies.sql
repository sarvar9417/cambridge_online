-- Sibling dependencies between sub-parts, plus BullMQ correlation on jobs.
--
-- Everything else the ingestion pipeline needs already exists: this database
-- carries the schema the previous stack built, and a column-level diff against
-- the Drizzle definitions showed only these two gaps.
--
-- Written with IF NOT EXISTS because the same file has to be safe against a
-- database created from 0001-0006 and against one adopted from the old stack.

-- "Using your answer to part (b)". Extracting 3(c) without 3(b) produces a
-- question nobody can answer, so selection warns on a hard dependency and
-- carries (b)'s printed material when the reference is only to text.
CREATE TABLE IF NOT EXISTS question_dependencies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  depends_on_id uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  -- 'text_ref' needs the other part's printed material; 'answer_ref' needs what
  -- the candidate wrote there and cannot be satisfied by carrying anything.
  kind          text NOT NULL,
  strength      text NOT NULL DEFAULT 'required',
  evidence      text,
  detected_by   text NOT NULL DEFAULT 'ai',
  confidence    numeric(3, 2),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, depends_on_id),
  CHECK (question_id <> depends_on_id)
);

CREATE INDEX IF NOT EXISTS question_dependencies_depends_on_idx
  ON question_dependencies (depends_on_id);

-- Correlates a jobs row with the BullMQ job that ran it, so a failure in Redis
-- is still explainable from Postgres after the queue has dropped it.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS queue_job_id text;
