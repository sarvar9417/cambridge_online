CREATE TABLE IF NOT EXISTS ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id uuid NOT NULL REFERENCES syllabi ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES components ON DELETE CASCADE,
  year int NOT NULL,
  series exam_series NOT NULL,
  variant int NOT NULL,
  qp_paper_id uuid REFERENCES source_papers ON DELETE SET NULL,
  ms_paper_id uuid REFERENCES source_papers ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting_for_pair'
    CHECK(status IN ('waiting_for_pair','queued','processing','needs_review','approved','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(component_id,year,series,variant)
);

CREATE INDEX IF NOT EXISTS ingestion_runs_status_idx ON ingestion_runs(status,created_at);
