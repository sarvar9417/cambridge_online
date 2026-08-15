-- Self-registration with admin approval, and password recovery.
--
-- Until now an account could only be created by redeeming a class invite, which
-- made every account implicitly approved. Students now register themselves and
-- wait: the account exists but cannot sign in until an owner decides its role
-- and where it belongs. A forgotten password had no path at all.
--
-- The live database already carries users.status, approved_by and approved_at --
-- they arrived with the data, ahead of any migration here -- while a database
-- built from 0001 does not. Every step is therefore written to be true either
-- way rather than assuming one of the two.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended');
  END IF;
END $$;

-- 'rejected' is not 'suspended': one never got in, the other was let in and then
-- stopped. The admin screen says different things about them and only one is
-- worth re-applying after.
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'rejected';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users ON DELETE SET NULL,
  -- Shown to the applicant, so a rejection says why and a suspension is not a
  -- silent lockout.
  ADD COLUMN IF NOT EXISTS status_reason text;

COMMENT ON COLUMN users.status IS
  'pending: registered, awaiting a decision. active: may sign in. rejected: never approved. suspended: was active, now blocked.';

-- Sign-in matches identifiers case-insensitively (lower(email) = lower($1)) but
-- the uniqueness constraints were case-sensitive, so Sarvar@x.uz and sarvar@x.uz
-- could both exist and a login would match whichever row the planner happened to
-- return first. These make the constraint agree with the lookup.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_key ON users (lower(username)) WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_pending_idx ON users (created_at DESC) WHERE status = 'pending';

-- Reset tokens are stored hashed for the same reason refresh tokens are: a leak
-- of this table must not hand anyone a working password reset.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  -- NULL when the user asked for it themselves; set when a teacher issued the
  -- code by hand for someone whose email never arrived.
  issued_by uuid REFERENCES users ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON password_reset_tokens (user_id, created_at DESC);
