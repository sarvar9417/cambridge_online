CREATE TABLE IF NOT EXISTS api_rate_limit_buckets (
  bucket_key text PRIMARY KEY,
  request_count integer NOT NULL CHECK (request_count >= 0),
  reset_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_rate_limit_buckets_updated_idx
  ON api_rate_limit_buckets (updated_at);

ALTER TABLE api_rate_limit_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON api_rate_limit_buckets FROM anon, authenticated;