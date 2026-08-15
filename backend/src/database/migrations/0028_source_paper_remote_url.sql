ALTER TABLE source_papers
ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE source_papers
ADD CONSTRAINT source_papers_source_url_http
CHECK (source_url IS NULL OR source_url ~ '^https?://');

CREATE INDEX IF NOT EXISTS source_papers_remote_source_idx
ON source_papers(id)
WHERE source_url IS NOT NULL;
