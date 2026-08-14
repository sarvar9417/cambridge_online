CREATE TYPE export_status AS ENUM ('queued','running','succeeded','failed');
CREATE TABLE exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), requested_by uuid NOT NULL REFERENCES users,
  kind text NOT NULL CHECK(kind IN ('question_paper','mark_scheme','combined','feedback')),
  ref_table text NOT NULL, ref_id uuid NOT NULL, status export_status NOT NULL DEFAULT 'queued',
  storage_path text, error text, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE INDEX exports_requester_idx ON exports(requested_by,created_at DESC);
