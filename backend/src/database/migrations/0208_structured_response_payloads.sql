-- First-class structured learner responses for source-faithful Cambridge tasks.
--
-- The printed question remains immutable in questions.content_json / source assets.
-- Learner interaction (table cells, matching, labels, lines and freehand strokes)
-- is stored separately so a table/diagram can be completed without flattening the
-- answer into one ambiguous textarea.

ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS response_json jsonb;

ALTER TABLE public.live_exam_answers
  ADD COLUMN IF NOT EXISTS response_json jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='answers_structured_response_v1'
      AND conrelid='public.answers'::regclass
  ) THEN
    ALTER TABLE public.answers
      ADD CONSTRAINT answers_structured_response_v1 CHECK (
        response_json IS NULL OR (
          jsonb_typeof(response_json)='object'
          AND response_json->>'version'='1'
          AND jsonb_typeof(coalesce(response_json->'tableCells','[]'::jsonb))='array'
          AND jsonb_typeof(coalesce(response_json->'matches','[]'::jsonb))='array'
          AND jsonb_typeof(coalesce(response_json->'annotations','[]'::jsonb))='array'
          AND pg_column_size(response_json)<=262144
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='live_exam_answers_structured_response_v1'
      AND conrelid='public.live_exam_answers'::regclass
  ) THEN
    ALTER TABLE public.live_exam_answers
      ADD CONSTRAINT live_exam_answers_structured_response_v1 CHECK (
        response_json IS NULL OR (
          jsonb_typeof(response_json)='object'
          AND response_json->>'version'='1'
          AND jsonb_typeof(coalesce(response_json->'tableCells','[]'::jsonb))='array'
          AND jsonb_typeof(coalesce(response_json->'matches','[]'::jsonb))='array'
          AND jsonb_typeof(coalesce(response_json->'annotations','[]'::jsonb))='array'
          AND pg_column_size(response_json)<=262144
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.answers.response_json IS
  'Versioned structured learner response. Printed/source content stays in questions.content_json.';
COMMENT ON COLUMN public.live_exam_answers.response_json IS
  'Versioned structured Live response for table/matching/diagram annotation tasks.';
