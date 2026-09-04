CREATE TABLE IF NOT EXISTS student_lesson_progress (
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_no int NOT NULL CHECK (chapter_no IN (1, 7, 13)),
  slide_id text NOT NULL CHECK (length(slide_id) BETWEEN 1 AND 160),
  visited_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (student_id, chapter_no, slide_id)
);

CREATE INDEX IF NOT EXISTS student_lesson_progress_student_idx
  ON student_lesson_progress(student_id, chapter_no, visited_at DESC);
