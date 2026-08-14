-- Job audit, validation findings, AI cost tracking and settings.
--
-- `jobs` is an audit trail, not a queue: BullMQ on Redis runs the work. A row is
-- written when a job is enqueued and updated as it progresses, so a failure is
-- still explainable after Redis has dropped the job.

CREATE TABLE jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL,                     -- 'ingest_qp' | 'grade' | 'export_pdf' | ...
  queue_job_id    text,                              -- BullMQ id, for correlation
  ref_table       text,
  ref_id          uuid,
  status          job_status NOT NULL DEFAULT 'queued',
  priority        int NOT NULL DEFAULT 100,
  attempts        int NOT NULL DEFAULT 0,
  max_attempts    int NOT NULL DEFAULT 3,
  payload         jsonb NOT NULL DEFAULT '{}',
  idempotency_key text NOT NULL UNIQUE,              -- 'ingest:{sha256}', 'grade:{answerId}:{promptVersion}'
  result          jsonb,
  error           text,
  scheduled_at    timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  finished_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX jobs_status_idx ON jobs (status, scheduled_at);
CREATE INDEX jobs_ref_idx ON jobs (ref_table, ref_id);

-- R6: anything failing deterministic validation lands here and is never
-- silently accepted.
CREATE TABLE validation_findings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code   text NOT NULL,                         -- 'V03'
  severity    finding_severity NOT NULL,
  ref_table   text NOT NULL,
  ref_id      uuid NOT NULL,
  message     text NOT NULL,
  details     jsonb,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users,
  resolution  text,                                  -- 'fixed' | 'accepted' | 'false_positive'
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX validation_findings_open_idx ON validation_findings (ref_table, ref_id)
  WHERE resolved_at IS NULL;
CREATE INDEX validation_findings_rule_idx ON validation_findings (rule_code, severity)
  WHERE resolved_at IS NULL;

-- Second-model audit of an extraction. The checker reports, never corrects: a
-- fixing checker replaces the first model's error with its own, undetectably.
CREATE TABLE cross_checks (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_table              text NOT NULL,
  ref_id                 uuid NOT NULL,
  checker_prompt_version text NOT NULL,
  agrees                 boolean NOT NULL,
  disagreement           jsonb,
  confidence             numeric(3, 2),
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- R7: every model call is logged with cost, so the monthly budget is a fact,
-- not an estimate.
CREATE TABLE ai_calls (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose           text NOT NULL,                   -- 'grade' | 'extract_qp' | 'ocr' | ...
  model             text NOT NULL,
  prompt_version    text,
  ref_table         text,
  ref_id            uuid,
  input_tokens      int,
  output_tokens     int,
  cache_read_tokens int,
  cache_write_tokens int,
  cost_usd          numeric(10, 6),
  latency_ms        int,
  ok                boolean NOT NULL DEFAULT true,
  error             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_calls_created_idx ON ai_calls (created_at DESC);
CREATE INDEX ai_calls_purpose_idx ON ai_calls (purpose, created_at DESC);

CREATE TABLE audit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   uuid REFERENCES users,
  action     text NOT NULL,                          -- 'grading.override' | 'question.approve'
  ref_table  text,
  ref_id     uuid,
  before     jsonb,
  after      jsonb,
  ip         inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_ref_idx ON audit_log (ref_table, ref_id, created_at DESC);

CREATE TABLE app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_by uuid REFERENCES users,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings (key, value) VALUES
  ('grading.autopilot_enabled', 'false'),
  ('grading.confidence_threshold', '0.85'),
  ('grading.model', '"claude-sonnet-4-6"'),
  ('ai.monthly_budget_usd', '50');
