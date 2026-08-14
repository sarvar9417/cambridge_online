ALTER TABLE question_assets
  ADD COLUMN IF NOT EXISTS size_bytes int;
ALTER TABLE question_assets
  ADD COLUMN IF NOT EXISTS content_hash text;

ALTER TABLE question_assets
  DROP CONSTRAINT IF EXISTS question_assets_size_bytes_check;
ALTER TABLE question_assets
  ADD CONSTRAINT question_assets_size_bytes_check CHECK (
    size_bytes IS NULL OR size_bytes >= 0
  );

CREATE INDEX IF NOT EXISTS question_assets_content_hash_idx
  ON question_assets (content_hash)
  WHERE content_hash IS NOT NULL;
