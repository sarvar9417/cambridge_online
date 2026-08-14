CREATE TABLE quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), content_item_id uuid NOT NULL REFERENCES content_items ON DELETE CASCADE,
  prompt_md text NOT NULL, options jsonb NOT NULL, correct_ids int[] NOT NULL,
  explanation_md text NOT NULL, learning_objective_id uuid REFERENCES learning_objectives,
  sort_order int NOT NULL DEFAULT 0, CHECK(jsonb_typeof(options)='array'), CHECK(cardinality(correct_ids)>0)
);
CREATE TABLE quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  content_item_id uuid NOT NULL REFERENCES content_items ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}', score int NOT NULL DEFAULT 0, max_score int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE INDEX quiz_attempts_user_idx ON quiz_attempts(user_id,completed_at DESC);
