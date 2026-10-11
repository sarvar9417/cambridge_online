-- Structured learner responses for source-faithful Cambridge question workspaces.
--
-- Keep the legacy text columns as a readable grading/audit summary while
-- preserving table cells, matching choices and drawing strokes in JSONB.
-- Existing text-only answers remain valid.

ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS response_payload jsonb;

ALTER TABLE public.live_exam_answers
  ADD COLUMN IF NOT EXISTS response_payload jsonb;

ALTER TABLE public.answers
  DROP CONSTRAINT IF EXISTS answers_response_payload_shape_chk;
ALTER TABLE public.answers
  ADD CONSTRAINT answers_response_payload_shape_chk CHECK (
    response_payload IS NULL OR (
      jsonb_typeof(response_payload)='object'
      AND response_payload->>'version'='1'
      AND jsonb_typeof(coalesce(response_payload->'values','{}'::jsonb))='object'
      AND jsonb_typeof(coalesce(response_payload->'matches','{}'::jsonb))='object'
      AND jsonb_typeof(coalesce(response_payload->'drawings','{}'::jsonb))='object'
      AND pg_column_size(response_payload) <= 262144
    )
  );

ALTER TABLE public.live_exam_answers
  DROP CONSTRAINT IF EXISTS live_exam_answers_response_payload_shape_chk;
ALTER TABLE public.live_exam_answers
  ADD CONSTRAINT live_exam_answers_response_payload_shape_chk CHECK (
    response_payload IS NULL OR (
      jsonb_typeof(response_payload)='object'
      AND response_payload->>'version'='1'
      AND jsonb_typeof(coalesce(response_payload->'values','{}'::jsonb))='object'
      AND jsonb_typeof(coalesce(response_payload->'matches','{}'::jsonb))='object'
      AND jsonb_typeof(coalesce(response_payload->'drawings','{}'::jsonb))='object'
      AND pg_column_size(response_payload) <= 262144
    )
  );

COMMENT ON COLUMN public.answers.response_payload IS
  'Structured Cambridge response v1: editable table/stack values, matching choices and normalized drawing strokes. answers.text remains the readable summary.';
COMMENT ON COLUMN public.live_exam_answers.response_payload IS
  'Immutable-by-round structured response v1. answer_text remains the readable summary used by existing review/report surfaces.';
