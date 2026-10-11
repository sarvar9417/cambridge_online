ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS response_json jsonb;

ALTER TABLE public.live_exam_answers
  ADD COLUMN IF NOT EXISTS response_json jsonb;

ALTER TABLE public.answers
  DROP CONSTRAINT IF EXISTS answers_response_json_shape_check;
ALTER TABLE public.answers
  ADD CONSTRAINT answers_response_json_shape_check
  CHECK (
    response_json IS NULL
    OR (
      jsonb_typeof(response_json)='object'
      AND response_json->>'version'='1'
    )
  );

ALTER TABLE public.live_exam_answers
  DROP CONSTRAINT IF EXISTS live_exam_answers_response_json_shape_check;
ALTER TABLE public.live_exam_answers
  ADD CONSTRAINT live_exam_answers_response_json_shape_check
  CHECK (
    response_json IS NULL
    OR (
      jsonb_typeof(response_json)='object'
      AND response_json->>'version'='1'
    )
  );

COMMENT ON COLUMN public.answers.response_json IS
  'Structured-response payload for source-faithful tables, matching and diagram annotations. Human-readable text remains in text for grading/search.';
COMMENT ON COLUMN public.live_exam_answers.response_json IS
  'Structured-response payload for Live Challenge. answer_text remains the human-readable grading summary.';
