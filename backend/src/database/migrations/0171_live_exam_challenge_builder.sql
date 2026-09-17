-- Converge the richer Cambridge Live Challenge builder onto the canonical
-- live_exam_* persistence model. This migration is additive and keeps every
-- existing lobby/question/marking/review/finished session valid.

ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'lobby';
ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'published' BEFORE 'lobby';

-- Drafts do not have a room code. The existing CHECK accepts NULL, and the
-- UNIQUE constraint naturally permits multiple NULL drafts while preserving
-- uniqueness once a challenge is published.
ALTER TABLE live_exam_sessions
  ALTER COLUMN join_code DROP NOT NULL;

ALTER TABLE live_exam_sessions
  ADD COLUMN syllabus_id uuid REFERENCES syllabi,
  ADD COLUMN topic_id uuid REFERENCES topics,
  ADD COLUMN subtopic_id uuid REFERENCES subtopics,
  ADD COLUMN published_at timestamptz;

-- Existing sessions predate the builder scope columns. Their class syllabus is
-- the authoritative target syllabus for analytics and is therefore the correct
-- backfill for builder provenance too.
UPDATE live_exam_sessions les
SET syllabus_id = c.syllabus_id
FROM classes c
WHERE c.id = les.class_id
  AND les.syllabus_id IS NULL;

ALTER TABLE live_exam_sessions
  ALTER COLUMN syllabus_id SET NOT NULL;

ALTER TABLE live_exam_sessions
  ADD CONSTRAINT live_exam_builder_subtopic_requires_topic
    CHECK (subtopic_id IS NULL OR topic_id IS NOT NULL);

CREATE INDEX live_exam_sessions_builder_scope_idx
  ON live_exam_sessions (syllabus_id, topic_id, subtopic_id, created_at DESC);

CREATE INDEX live_exam_sessions_host_draft_idx
  ON live_exam_sessions (host_id, updated_at DESC)
  WHERE status IN ('draft', 'published');
