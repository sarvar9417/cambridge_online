-- Keep refresh-token inserts compatible with the session_id constraint.
-- Production already requires session_id; fresh databases must get the same
-- shape, and existing callers may omit it safely because Postgres creates one.

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS session_id uuid;

UPDATE refresh_tokens
SET session_id = gen_random_uuid()
WHERE session_id IS NULL;

ALTER TABLE refresh_tokens
  ALTER COLUMN session_id SET DEFAULT gen_random_uuid();

ALTER TABLE refresh_tokens
  ALTER COLUMN session_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS refresh_tokens_session_idx
  ON refresh_tokens (user_id, session_id)
  WHERE revoked_at IS NULL;
