CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  device_label text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_active_user_idx ON refresh_tokens (user_id)
  WHERE revoked_at IS NULL;
