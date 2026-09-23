-- Visual fidelity evidence ledger for Cambridge past-paper source verification.
--
-- This migration is intentionally additive. It does not change existing
-- question/content rows and is designed to support fail-closed source-vs-render
-- verification across Question Bank, PDF, DOCX and Live Challenge surfaces.

CREATE TABLE visual_fidelity_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id uuid NOT NULL REFERENCES syllabi(id),
  base_git_sha text NOT NULL,
  source_inventory_digest text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','blocked','ready_for_review','closed')),
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  CHECK (finished_at IS NULL OR finished_at >= started_at)
);

CREATE TABLE visual_fidelity_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES visual_fidelity_runs(id) ON DELETE CASCADE,
  element_key text NOT NULL,
  source_paper_id uuid NOT NULL REFERENCES source_papers(id),
  question_id uuid REFERENCES questions(id),
  question_asset_id uuid REFERENCES question_assets(id),
  mark_scheme_id uuid REFERENCES mark_schemes(id),
  element_kind text NOT NULL,
  source_sha256 text NOT NULL,
  source_page integer NOT NULL CHECK (source_page > 0),
  source_bbox jsonb,
  priority text NOT NULL DEFAULT 'P0'
    CHECK (priority IN ('P0','P1','P2')),
  classification text NOT NULL DEFAULT 'VF-5'
    CHECK (classification IN ('VF-0','VF-1','VF-2','VF-3','VF-4','VF-5')),
  disposition text NOT NULL DEFAULT 'verify'
    CHECK (disposition IN ('verify','repair','accepted','external_blocker','dormant_review')),
  defect_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, element_key),
  CHECK (
    question_id IS NOT NULL
    OR question_asset_id IS NOT NULL
    OR mark_scheme_id IS NOT NULL
  )
);

CREATE TABLE visual_fidelity_surface_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id uuid NOT NULL REFERENCES visual_fidelity_elements(id) ON DELETE CASCADE,
  surface text NOT NULL
    CHECK (surface IN ('source','question_bank','pdf','docx','live_challenge','mark_scheme')),
  status text NOT NULL DEFAULT 'not_verified'
    CHECK (status IN ('not_verified','captured','matched','mismatch','blocked')),
  artifact_ref text,
  artifact_sha256 text,
  comparison_method text,
  geometry_evidence jsonb,
  notes text,
  captured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (element_id, surface)
);

CREATE INDEX visual_fidelity_runs_syllabus_status_idx
  ON visual_fidelity_runs (syllabus_id, status, started_at DESC);
CREATE INDEX visual_fidelity_elements_source_idx
  ON visual_fidelity_elements (source_paper_id, source_page, element_kind);
CREATE INDEX visual_fidelity_elements_question_idx
  ON visual_fidelity_elements (question_id);
CREATE INDEX visual_fidelity_elements_asset_idx
  ON visual_fidelity_elements (question_asset_id);
CREATE INDEX visual_fidelity_elements_classification_idx
  ON visual_fidelity_elements (run_id, classification, priority);
CREATE INDEX visual_fidelity_surface_status_idx
  ON visual_fidelity_surface_evidence (surface, status);

ALTER TABLE visual_fidelity_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_fidelity_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_fidelity_surface_evidence ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON visual_fidelity_runs FROM anon, authenticated;
REVOKE ALL ON visual_fidelity_elements FROM anon, authenticated;
REVOKE ALL ON visual_fidelity_surface_evidence FROM anon, authenticated;

COMMENT ON TABLE visual_fidelity_runs IS
  'Audit runs for literal Cambridge source-vs-render visual fidelity verification.';
COMMENT ON TABLE visual_fidelity_elements IS
  'One canonical or paper-specific visual/structured element under visual fidelity review.';
COMMENT ON TABLE visual_fidelity_surface_evidence IS
  'Per-surface proof for source, Question Bank, PDF, DOCX, Live Challenge or mark scheme rendering.';
COMMENT ON COLUMN visual_fidelity_elements.classification IS
  'VF-0 perfect, VF-1 acceptable, VF-2 polish, VF-3 fidelity defect, VF-4 broken, VF-5 not verified.';
COMMENT ON COLUMN visual_fidelity_elements.source_sha256 IS
  'SHA256 of the exact source paper used for this evidence row; provenance must fail closed if it changes.';
