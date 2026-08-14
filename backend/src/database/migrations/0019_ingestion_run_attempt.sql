ALTER TABLE ingestion_runs
  ADD COLUMN IF NOT EXISTS attempt_no int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS run_key text;

CREATE INDEX IF NOT EXISTS ingestion_runs_run_key_idx ON ingestion_runs(run_key);
