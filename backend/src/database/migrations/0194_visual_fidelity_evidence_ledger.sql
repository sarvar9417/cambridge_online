-- Durable, append-only evidence for literal Cambridge source-to-render visual fidelity.
-- This table records one verification event for one paper-specific visual occurrence
-- and one product surface. Corrections append a new row via supersedes_id; prior
-- evidence is intentionally immutable.

CREATE TABLE visual_fidelity_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_paper_id uuid NOT NULL REFERENCES source_papers(id) ON DELETE RESTRICT,
  question_id uuid REFERENCES questions(id) ON DELETE RESTRICT,
  asset_id uuid REFERENCES question_assets(id) ON DELETE RESTRICT,
  surface text NOT NULL CHECK (surface IN (
    'question_bank_desktop',
    'question_bank_mobile',
    'pdf',
    'docx',
    'live_student',
    'live_teacher',
    'mark_scheme_pdf',
    'mark_scheme_docx',
    'mark_scheme_live'
  )),
  source_page integer NOT NULL CHECK (source_page > 0),
  source_bbox jsonb,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[0-9a-fA-F]{64}$'),
  rendered_sha256 text CHECK (rendered_sha256 IS NULL OR rendered_sha256 ~ '^[0-9a-fA-F]{64}$'),
  classification text NOT NULL CHECK (classification IN ('VF-0','VF-1','VF-2','VF-3','VF-4','VF-5')),
  evidence_path text,
  verifier text NOT NULL CHECK (btrim(verifier) <> ''),
  verification_method text NOT NULL DEFAULT 'manual'
    CHECK (verification_method IN ('manual','automated','hybrid')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  notes text,
  supersedes_id uuid REFERENCES visual_fidelity_evidence(id) ON DELETE RESTRICT,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (asset_id IS NULL OR question_id IS NOT NULL),
  CHECK (
    source_bbox IS NULL
    OR (jsonb_typeof(source_bbox) = 'array' AND jsonb_array_length(source_bbox) = 4)
  ),
  CHECK (evidence_path IS NULL OR btrim(evidence_path) <> ''),
  CHECK (
    classification = 'VF-5'
    OR (rendered_sha256 IS NOT NULL AND evidence_path IS NOT NULL)
  )
);

CREATE INDEX visual_fidelity_evidence_source_page_idx
  ON visual_fidelity_evidence (source_paper_id, source_page);
CREATE INDEX visual_fidelity_evidence_question_idx
  ON visual_fidelity_evidence (question_id, verified_at DESC);
CREATE INDEX visual_fidelity_evidence_asset_idx
  ON visual_fidelity_evidence (asset_id, verified_at DESC);
CREATE INDEX visual_fidelity_evidence_surface_classification_idx
  ON visual_fidelity_evidence (surface, classification, verified_at DESC);
CREATE INDEX visual_fidelity_evidence_open_idx
  ON visual_fidelity_evidence (classification, verified_at DESC)
  WHERE classification IN ('VF-3','VF-4','VF-5');

CREATE OR REPLACE FUNCTION validate_visual_fidelity_evidence_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_sha text;
  previous visual_fidelity_evidence%ROWTYPE;
BEGIN
  SELECT sp.sha256
    INTO expected_sha
  FROM source_papers sp
  WHERE sp.id = NEW.source_paper_id;

  IF expected_sha IS NULL OR lower(expected_sha) <> lower(NEW.source_sha256) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'visual_fidelity_source_sha_mismatch';
  END IF;

  IF NEW.source_bbox IS NOT NULL THEN
    IF NOT (
      jsonb_typeof(NEW.source_bbox->0) = 'number'
      AND jsonb_typeof(NEW.source_bbox->1) = 'number'
      AND jsonb_typeof(NEW.source_bbox->2) = 'number'
      AND jsonb_typeof(NEW.source_bbox->3) = 'number'
      AND (NEW.source_bbox->>2)::numeric > (NEW.source_bbox->>0)::numeric
      AND (NEW.source_bbox->>3)::numeric > (NEW.source_bbox->>1)::numeric
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'visual_fidelity_source_bbox_invalid';
    END IF;
  END IF;

  IF NEW.supersedes_id IS NOT NULL THEN
    SELECT *
      INTO previous
    FROM visual_fidelity_evidence
    WHERE id = NEW.supersedes_id;

    IF previous.id IS NULL
       OR previous.source_paper_id IS DISTINCT FROM NEW.source_paper_id
       OR previous.question_id IS DISTINCT FROM NEW.question_id
       OR previous.asset_id IS DISTINCT FROM NEW.asset_id
       OR previous.surface IS DISTINCT FROM NEW.surface THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'visual_fidelity_supersedes_key_mismatch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER visual_fidelity_evidence_validate_insert
BEFORE INSERT ON visual_fidelity_evidence
FOR EACH ROW
EXECUTE FUNCTION validate_visual_fidelity_evidence_insert();

CREATE OR REPLACE FUNCTION prevent_visual_fidelity_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'visual_fidelity_evidence_append_only';
END;
$$;

CREATE TRIGGER visual_fidelity_evidence_append_only
BEFORE UPDATE OR DELETE ON visual_fidelity_evidence
FOR EACH ROW
EXECUTE FUNCTION prevent_visual_fidelity_evidence_mutation();

CREATE VIEW visual_fidelity_latest_evidence
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (source_paper_id, question_id, asset_id, surface)
  id,
  source_paper_id,
  question_id,
  asset_id,
  surface,
  source_page,
  source_bbox,
  source_sha256,
  rendered_sha256,
  classification,
  evidence_path,
  verifier,
  verification_method,
  metadata,
  notes,
  supersedes_id,
  verified_at,
  created_at
FROM visual_fidelity_evidence
ORDER BY
  source_paper_id,
  question_id,
  asset_id,
  surface,
  verified_at DESC,
  created_at DESC,
  id DESC;

ALTER TABLE visual_fidelity_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON visual_fidelity_evidence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON visual_fidelity_latest_evidence FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE visual_fidelity_evidence IS
  'Append-only source-to-render proof ledger. VF-0/VF-1 are forbidden without durable rendered evidence.';
COMMENT ON COLUMN visual_fidelity_evidence.source_bbox IS
  'Source element bbox as [x1,y1,x2,y2] in the exact source render coordinate space.';
COMMENT ON COLUMN visual_fidelity_evidence.supersedes_id IS
  'Prior evidence row for the same paper/question/asset/surface. Evidence is never updated in place.';
