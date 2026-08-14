-- Preserve the source location of extracted figures/tables so a later crop worker
-- can reproduce the exact asset without re-running the extraction model.
-- 0018 is intentional: stacked PR #4 already reserves 0017 on another branch.

ALTER TABLE question_assets
  ADD COLUMN IF NOT EXISTS source_bbox jsonb;
ALTER TABLE question_assets
  ADD COLUMN IF NOT EXISTS crop_status text NOT NULL DEFAULT 'not_needed';
ALTER TABLE question_assets
  ADD COLUMN IF NOT EXISTS crop_error text;

ALTER TABLE question_assets
  DROP CONSTRAINT IF EXISTS question_assets_source_bbox_shape;
ALTER TABLE question_assets
  ADD CONSTRAINT question_assets_source_bbox_shape CHECK (
    source_bbox IS NULL OR (
      jsonb_typeof(source_bbox) = 'array'
      AND jsonb_array_length(source_bbox) = 4
    )
  );

ALTER TABLE question_assets
  DROP CONSTRAINT IF EXISTS question_assets_crop_status_check;
ALTER TABLE question_assets
  ADD CONSTRAINT question_assets_crop_status_check CHECK (
    crop_status IN ('not_needed','pending','ready','failed')
  );

CREATE INDEX IF NOT EXISTS question_assets_pending_crop_idx
  ON question_assets (source_page)
  WHERE crop_status='pending';
