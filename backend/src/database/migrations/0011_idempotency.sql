CREATE TYPE idempotency_status AS ENUM ('processing', 'completed');

CREATE TABLE idempotency_records (
  actor_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  key text NOT NULL,
  request_hash text NOT NULL,
  status idempotency_status NOT NULL DEFAULT 'processing',
  response_status int,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  PRIMARY KEY (actor_id, key),
  CHECK (char_length(key) BETWEEN 8 AND 200),
  CHECK ((status = 'processing' AND response_status IS NULL) OR
         (status = 'completed' AND response_status BETWEEN 100 AND 599))
);

CREATE INDEX idempotency_records_expiry_idx ON idempotency_records (expires_at);
