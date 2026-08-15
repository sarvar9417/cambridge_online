-- Proving the email address belongs to the person who typed it.
--
-- Registration asked for an email and never checked it. That address is the
-- only self-service route back into a forgotten account, so a typo locked the
-- student out permanently and a deliberate wrong address let someone register
-- under an email they do not hold.
--
-- Verification is separate from approval and comes first: the applicant proves
-- the address, then an owner decides the role. Approving an unverified address
-- is still possible -- a teacher may know the person -- but the screen says so.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

COMMENT ON COLUMN users.email_verified_at IS
  'When the address was proven. NULL means unverified; accounts that predate this column are backfilled as verified.';

-- Everyone who already had an account got in through an invite or an approval,
-- so their address was accepted by a person. Leaving them unverified would lock
-- out every existing user the moment sign-in starts checking.
UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;

-- Hashed for the same reason password reset tokens are: a leak of this table
-- must not let anyone claim someone else's address.
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_idx
  ON email_verification_tokens (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS users_unverified_idx
  ON users (created_at DESC) WHERE email_verified_at IS NULL;
