-- Study groups inside a class.
--
-- A class is '11-A'; a group is '2-guruh' inside it. Assigning a student to a
-- class alone is not enough to say where they sit, and the approval screen is
-- the moment the placement is decided.
--
-- The live database already carries all of this: it arrived with an earlier
-- migration on the branch that became this repository's history, and there are
-- already four groups defined against two classes. None of it was ever declared
-- in this migration line, so a database built from 0001 has no groups at all and
-- the code could not reference them. Every step below is idempotent so it is a
-- no-op against the live database and a create against a fresh one.

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, name),
  -- Composite key so an enrollment can prove its group belongs to the same
  -- class it enrols into. Without it a student could be placed in 11-A and in a
  -- group of 11-B at the same time.
  UNIQUE (id, class_id)
);

CREATE INDEX IF NOT EXISTS groups_class_idx ON groups (class_id) WHERE archived_at IS NULL;

ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS group_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_group_matches_class'
  ) THEN
    ALTER TABLE enrollments
      ADD CONSTRAINT enrollments_group_matches_class
      FOREIGN KEY (group_id, class_id) REFERENCES groups (id, class_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS enrollments_group_idx ON enrollments (group_id) WHERE left_at IS NULL;
