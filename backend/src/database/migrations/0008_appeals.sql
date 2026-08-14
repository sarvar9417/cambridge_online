CREATE TABLE grading_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), grading_id uuid NOT NULL UNIQUE REFERENCES gradings ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE, reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','accepted','rejected')),
  resolved_by uuid REFERENCES users, resolution text, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE INDEX grading_appeals_open_idx ON grading_appeals(status,created_at) WHERE status='open';
