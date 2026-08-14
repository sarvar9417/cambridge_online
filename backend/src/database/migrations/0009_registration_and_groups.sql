-- Self-service student registration and study groups inside a class.
--
-- A student registers on their own and lands in 'pending'. A teacher or the owner
-- then assigns them to a class and a group, which is what activates the account.
-- Until then the account can authenticate but is enrolled nowhere, so every
-- class-scoped query already returns nothing for it.

CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended');

ALTER TABLE users
  ADD COLUMN status user_status NOT NULL DEFAULT 'active',
  ADD COLUMN approved_by uuid REFERENCES users,
  ADD COLUMN approved_at timestamptz;

CREATE INDEX ON users (status) WHERE status = 'pending';

-- A class is subdivided into groups (e.g. '10-A CS' -> 'Guruh 1', 'Guruh 2').
CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, name),
  -- Composite key so enrollments can prove the group belongs to the same class.
  UNIQUE (id, class_id)
);

CREATE INDEX ON groups (class_id) WHERE archived_at IS NULL;

ALTER TABLE enrollments
  ADD COLUMN group_id uuid,
  ADD CONSTRAINT enrollments_group_matches_class
    FOREIGN KEY (group_id, class_id) REFERENCES groups (id, class_id) ON DELETE SET NULL;

CREATE INDEX ON enrollments (group_id) WHERE left_at IS NULL;
