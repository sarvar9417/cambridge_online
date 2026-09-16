-- Persist finished Live Exam scores as idempotent analytics evidence and fold
-- them into the existing mastery aggregate. Cambridge marks remain the unit of
-- evidence; speed and leaderboard position never affect mastery.

CREATE TABLE live_exam_learning_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_exam_sessions ON DELETE CASCADE,
  session_question_id uuid NOT NULL REFERENCES live_exam_questions ON DELETE CASCADE,
  answer_id uuid NOT NULL REFERENCES live_exam_answers ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions,
  subtopic_id uuid NOT NULL REFERENCES subtopics ON DELETE CASCADE,
  marks_earned numeric(8,2) NOT NULL CHECK (marks_earned >= 0),
  marks_possible numeric(8,2) NOT NULL CHECK (marks_possible > 0),
  score_source live_exam_marking_mode NOT NULL,
  teacher_overridden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (answer_id, subtopic_id),
  CHECK (marks_earned <= marks_possible)
);

CREATE INDEX live_exam_learning_evidence_student_subtopic_idx
  ON live_exam_learning_evidence (student_id, subtopic_id, created_at DESC);
CREATE INDEX live_exam_learning_evidence_session_idx
  ON live_exam_learning_evidence (session_id, session_question_id);
CREATE INDEX live_exam_learning_evidence_question_idx
  ON live_exam_learning_evidence (question_id);

CREATE OR REPLACE FUNCTION persist_live_exam_learning_evidence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'finished' OR OLD.status = 'finished' THEN
    RETURN NEW;
  END IF;

  -- A finished assessment must be analytically complete. Do not silently
  -- publish partial mastery when a question has no syllabus mapping or an
  -- answer somehow reached the terminal transition without a final score.
  IF EXISTS (
    SELECT 1
    FROM live_exam_questions leq
    WHERE leq.session_id = NEW.id
      AND NOT EXISTS (
        SELECT 1 FROM question_subtopics qs WHERE qs.question_id = leq.question_id
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'live_exam_analytics_unmapped_question';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM live_exam_answers a
    JOIN live_exam_questions leq ON leq.id = a.session_question_id
    WHERE leq.session_id = NEW.id
      AND a.final_score IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'live_exam_analytics_ungraded_answer';
  END IF;

  WITH inserted AS (
    INSERT INTO live_exam_learning_evidence(
      session_id,session_question_id,answer_id,student_id,question_id,subtopic_id,
      marks_earned,marks_possible,score_source,teacher_overridden,created_at
    )
    SELECT
      NEW.id,
      leq.id,
      a.id,
      lep.student_id,
      leq.question_id,
      qs.subtopic_id,
      a.final_score,
      leq.marks,
      a.score_source,
      (a.moderated_by IS NOT NULL),
      coalesce(NEW.finished_at,now())
    FROM live_exam_questions leq
    JOIN live_exam_answers a ON a.session_question_id = leq.id
    JOIN live_exam_participants lep ON lep.id = a.participant_id
    JOIN question_subtopics qs ON qs.question_id = leq.question_id
    WHERE leq.session_id = NEW.id
    ON CONFLICT (answer_id,subtopic_id) DO NOTHING
    RETURNING student_id,subtopic_id,answer_id,marks_earned,marks_possible
  ), aggregated AS (
    SELECT
      student_id,
      subtopic_id,
      count(DISTINCT answer_id)::int attempts,
      sum(marks_earned)::numeric(8,2) marks_earned,
      sum(marks_possible)::numeric(8,2) marks_possible
    FROM inserted
    GROUP BY student_id,subtopic_id
  )
  INSERT INTO mastery(
    student_id,subtopic_id,score,attempts,marks_earned,marks_possible,last_activity_at
  )
  SELECT
    student_id,
    subtopic_id,
    CASE WHEN marks_possible > 0 THEN marks_earned / marks_possible ELSE 0 END,
    attempts,
    marks_earned,
    marks_possible,
    coalesce(NEW.finished_at,now())
  FROM aggregated
  ON CONFLICT(student_id,subtopic_id) DO UPDATE SET
    marks_earned = mastery.marks_earned + excluded.marks_earned,
    marks_possible = mastery.marks_possible + excluded.marks_possible,
    attempts = mastery.attempts + excluded.attempts,
    score = (mastery.marks_earned + excluded.marks_earned)
      / nullif(mastery.marks_possible + excluded.marks_possible,0),
    last_activity_at = excluded.last_activity_at,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS live_exam_finish_learning_evidence ON live_exam_sessions;
CREATE TRIGGER live_exam_finish_learning_evidence
AFTER UPDATE OF status ON live_exam_sessions
FOR EACH ROW
WHEN (NEW.status = 'finished' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION persist_live_exam_learning_evidence();

ALTER TABLE live_exam_learning_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON live_exam_learning_evidence FROM anon, authenticated;
