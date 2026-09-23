-- Durable, append-only evidence for literal Cambridge source-to-render visual fidelity.
-- Evidence is keyed to the exact source occurrence and renderer target. Corrections
-- append a new row via supersedes_id; prior evidence is intentionally immutable.

CREATE TABLE visual_fidelity_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_paper_id uuid NOT NULL REFERENCES source_papers(id) ON DELETE RESTRICT,
  source_occurrence_id uuid REFERENCES question_source_occurrences(id) ON DELETE RESTRICT,
  question_id uuid REFERENCES questions(id) ON DELETE RESTRICT,
  asset_id uuid REFERENCES question_assets(id) ON DELETE RESTRICT,
  target_kind text NOT NULL CHECK (target_kind IN (
    'question',
    'structured_block',
    'asset',
    'shared_context',
    'mark_scheme'
  )),
  target_key text NOT NULL CHECK (btrim(target_key) <> ''),
  block_index integer CHECK (block_index IS NULL OR block_index >= 0),
  block_type text,
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
  CHECK (source_occurrence_id IS NULL OR question_id IS NOT NULL),
  CHECK (
    target_kind <> 'structured_block'
    OR (question_id IS NOT NULL AND block_index IS NOT NULL AND block_type IS NOT NULL)
  ),
  CHECK (
    target_kind NOT IN ('asset','shared_context')
    OR (question_id IS NOT NULL AND asset_id IS NOT NULL)
  ),
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
CREATE INDEX visual_fidelity_evidence_occurrence_target_idx
  ON visual_fidelity_evidence (source_occurrence_id, target_key, surface, verified_at DESC);
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
  occurrence_row question_source_occurrences%ROWTYPE;
  asset_question_id uuid;
  structured_block jsonb;
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

  IF NEW.source_occurrence_id IS NOT NULL THEN
    SELECT *
      INTO occurrence_row
    FROM question_source_occurrences
    WHERE id = NEW.source_occurrence_id;

    IF occurrence_row.id IS NULL
       OR occurrence_row.source_paper_id IS DISTINCT FROM NEW.source_paper_id
       OR occurrence_row.question_id IS DISTINCT FROM NEW.question_id THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'visual_fidelity_occurrence_key_mismatch';
    END IF;
  END IF;

  IF NEW.asset_id IS NOT NULL THEN
    SELECT qa.question_id
      INTO asset_question_id
    FROM question_assets qa
    WHERE qa.id = NEW.asset_id;

    IF asset_question_id IS NULL
       OR asset_question_id IS DISTINCT FROM NEW.question_id THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'visual_fidelity_asset_question_mismatch';
    END IF;
  END IF;

  IF NEW.target_kind = 'structured_block' THEN
    SELECT q.content_json->'blocks'->NEW.block_index
      INTO structured_block
    FROM questions q
    WHERE q.id = NEW.question_id;

    IF structured_block IS NULL
       OR structured_block->>'type' IS DISTINCT FROM NEW.block_type THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'visual_fidelity_structured_block_mismatch';
    END IF;
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
       OR previous.source_occurrence_id IS DISTINCT FROM NEW.source_occurrence_id
       OR previous.question_id IS DISTINCT FROM NEW.question_id
       OR previous.target_key IS DISTINCT FROM NEW.target_key
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
SELECT DISTINCT ON (source_paper_id, source_occurrence_id, target_key, surface)
  id,
  source_paper_id,
  source_occurrence_id,
  question_id,
  asset_id,
  target_kind,
  target_key,
  block_index,
  block_type,
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
  source_occurrence_id,
  target_key,
  surface,
  verified_at DESC,
  created_at DESC,
  id DESC;

ALTER TABLE visual_fidelity_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON visual_fidelity_evidence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON visual_fidelity_latest_evidence FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE visual_fidelity_evidence IS
  'Append-only source-to-render proof ledger keyed to an exact source occurrence and renderer target. VF-0/VF-1 are forbidden without durable rendered evidence.';
COMMENT ON COLUMN visual_fidelity_evidence.source_occurrence_id IS
  'Exact paper-specific question occurrence. Equivalent questions in another paper require separate evidence.';
COMMENT ON COLUMN visual_fidelity_evidence.target_key IS
  'Stable renderer target within an occurrence, for example question, block:2, asset:<uuid> or shared-context:<uuid>.';
COMMENT ON COLUMN visual_fidelity_evidence.block_index IS
  'Zero-based content_json.blocks index when target_kind=structured_block.';
COMMENT ON COLUMN visual_fidelity_evidence.source_bbox IS
  'Source element bbox as [x1,y1,x2,y2] in the exact source render coordinate space.';
COMMENT ON COLUMN visual_fidelity_evidence.supersedes_id IS
  'Prior evidence row for the same occurrence/target/surface. Evidence is never updated in place.';
