-- Direct Question Bank selection exports.
--
-- Export rows need a frozen, auditable snapshot of the selected portable
-- questions so a worksheet does not change while the background job runs.
-- file_format is introduced now so PDF and DOCX can share the same export
-- lifecycle/status/download model.

ALTER TABLE exports
  ADD COLUMN IF NOT EXISTS file_format text NOT NULL DEFAULT 'pdf';

ALTER TABLE exports
  ADD COLUMN IF NOT EXISTS request_payload jsonb;

DO $$ BEGIN
  ALTER TABLE exports
    ADD CONSTRAINT exports_file_format_check
    CHECK (file_format IN ('pdf', 'docx'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
