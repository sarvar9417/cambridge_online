-- Persist the exact official-source evidence used by source-backed cross-checks.
-- Legacy v1/v2 rows remain valid. A clean v3 verdict must be bound to exact QP/MS
-- SHA-256 values and non-empty source page lists before it can be stored.

ALTER TABLE public.cross_checks
  ADD COLUMN IF NOT EXISTS source_evidence jsonb;

COMMENT ON COLUMN public.cross_checks.source_evidence IS
  'Exact source provenance used by the checker: source mode, QP/MS paper IDs, SHA-256 values and page numbers.';

DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cross_checks_source_evidence_object'
      AND conrelid = 'public.cross_checks'::regclass
  ) THEN
    ALTER TABLE public.cross_checks
      ADD CONSTRAINT cross_checks_source_evidence_object
      CHECK (source_evidence IS NULL OR jsonb_typeof(source_evidence) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cross_checks_v3_verified_source_evidence'
      AND conrelid = 'public.cross_checks'::regclass
  ) THEN
    ALTER TABLE public.cross_checks
      ADD CONSTRAINT cross_checks_v3_verified_source_evidence
      CHECK (
        checker_prompt_version <> 'cross-check.v3'
        OR agrees = false
        OR (
          source_evidence IS NOT NULL
          AND jsonb_typeof(source_evidence) = 'object'
          AND source_evidence->>'sourceMode' = 'page_image+text_layer'
          AND nullif(source_evidence->>'qpPaperId', '') IS NOT NULL
          AND nullif(source_evidence->>'msPaperId', '') IS NOT NULL
          AND coalesce(source_evidence->>'qpSha256', '') ~ '^[0-9A-Fa-f]{64}$'
          AND coalesce(source_evidence->>'msSha256', '') ~ '^[0-9A-Fa-f]{64}$'
          AND jsonb_typeof(source_evidence->'qpPages') = 'array'
          AND jsonb_array_length(source_evidence->'qpPages') > 0
          AND jsonb_typeof(source_evidence->'msPages') = 'array'
          AND jsonb_array_length(source_evidence->'msPages') > 0
        )
      ) NOT VALID;
    ALTER TABLE public.cross_checks
      VALIDATE CONSTRAINT cross_checks_v3_verified_source_evidence;
  END IF;
END
$block$;
