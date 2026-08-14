DO $$ BEGIN
  CREATE TYPE selection_item_role AS ENUM ('graded', 'context_only');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE selections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  uuid NOT NULL REFERENCES schools ON DELETE CASCADE,
  owner_id   uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX selections_owner_idx ON selections (owner_id, updated_at DESC);

CREATE TABLE selection_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_id uuid NOT NULL REFERENCES selections ON DELETE CASCADE,
  question_id  uuid NOT NULL REFERENCES questions ON DELETE CASCADE,
  role         selection_item_role NOT NULL DEFAULT 'graded',
  sort_order   int NOT NULL,
  source_ref   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (selection_id, question_id)
);

CREATE INDEX selection_items_selection_idx
  ON selection_items (selection_id, sort_order, created_at);
