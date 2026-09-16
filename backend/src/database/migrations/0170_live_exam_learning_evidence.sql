-- Persist finished Live Exam scores as idempotent learning-objective evidence
-- and fold those marks into the existing subtopic mastery aggregate. Cambridge
-- marks remain the unit of evidence; speed and leaderboard position never
-- affect mastery.

CREATE TABLE live_exam_learning_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_exam_sessions ON DELETE CASCADE,
  session_question_id uuid NOT NULL REFERENCES live_exam_questions ON DELETE CASCADE,
  answer_id uuid NOT NULL REFERENCES live_exam_answers ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions,
  learning_objective_id uuid NOT NULL REFERENCES learning_objectives,
  subtopic_id uuid NOT NULL REFERENCES subtopics,
  mapping_confidence numeric(3,2),
  marks_earned numeric(8,2) NOT NULL CHECK (marks_earned >= 0),
  marks_possible numeric(8,2) NOT NULL CHECK (marks_possible > 0),
  score_source live_exam_marking_mode NOT NULL,
  teacher_overridden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (answer_id, learning_objective_id),
  CHECK (marks_earned <= marks_possible)
);

CREATE INDEX live_exam_learning_evidence_student_lo_idx
  ON live_exam_learning_evidence (student_id, learning_objective_id, created_at DESC);
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
DECLARE
  target_syllabus_id uuid;
BEGIN
  IF NEW.status <> 'finished' OR OLD.status = 'finished' THEN
    RETURN NEW;
  END IF;

  -- Mastery belongs to the syllabus assigned to the class, not necessarily the
  -- historical syllabus version from which a source-faithful past-paper
  -- question originated. Direct current-syllabus LO mappings are accepted;
  -- historical mappings may cross into the class syllabus only through an
  -- explicitly reviewed compatibility edge.
  SELECT c.syllabus_id INTO target_syllabus_id
  FROM classes c
  WHERE c.id = NEW.class_id;

  IF target_syllabus_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'live_exam_analytics_target_syllabus_missing';
  END IF;

  -- Every question must resolve to at least one LO in the class's target
  -- syllabus. Historical source LOs never become mastery buckets by accident.
  IF EXISTS (
    WITH mapping_candidates AS (
      SELECT leq.id session_question_id, qlo.lo_id learning_objective_id
      FROM live_exam_questions leq
      JOIN question_learning_objectives qlo ON qlo.question_id = leq.question_id
      JOIN learning_objectives direct_lo ON direct_lo.id = qlo.lo_id
      JOIN subtopics direct_st ON direct_st.id = direct_lo.subtopic_id
      JOIN topics direct_t ON direct_t.id = direct_st.topic_id
      WHERE leq.session_id = NEW.id
        AND direct_t.syllabus_id = target_syllabus_id

      UNION

      SELECT leq.id session_question_id, target_lo.id learning_objective_id
      FROM live_exam_questions leq
      JOIN question_learning_objectives qlo ON qlo.question_id = leq.question_id
      JOIN learning_objective_compatibility compat
        ON compat.source_lo_id = qlo.lo_id
       AND compat.relation IN ('equivalent','subtopic_compatible')
      JOIN learning_objectives target_lo ON target_lo.id = compat.target_lo_id
      JOIN subtopics target_st ON target_st.id = target_lo.subtopic_id
      JOIN topics target_t ON target_t.id = target_st.topic_id
      WHERE leq.session_id = NEW.id
        AND target_t.syllabus_id = target_syllabus_id
    )
    SELECT 1
    FROM live_exam_questions leq
    WHERE leq.session_id = NEW.id
      AND NOT EXISTS (
        SELECT 1
        FROM mapping_candidates mapped
        WHERE mapped.session_question_id = leq.id
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'live_exam_analytics_unmapped_question';
  END IF;

  -- Every participant answer must have a final Cambridge score before the
  -- terminal transition can publish evidence.
  IF EXISTS (
    SELECT 1
    FROM live_exam_answers a
    JOIN live_exam_questions leq ON leq.id = a.session_question_id
    WHERE leq.session_id = NEW.id
      AND (a.final_score IS NULL OR a.score_source IS NULL)
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'live_exam_analytics_ungraded_answer';
  END IF;

  WITH mapping_candidates AS (
    SELECT
      leq.id session_question_id,
      leq.question_id,
      qlo.lo_id learning_objective_id,
      direct_lo.subtopic_id,
      qlo.confidence mapping_confidence
    FROM live_exam_questions leq
    JOIN question_learning_objectives qlo ON qlo.question_id = leq.question_id
    JOIN learning_objectives direct_lo ON direct_lo.id = qlo.lo_id
    JOIN subtopics direct_st ON direct_st.id = direct_lo.subtopic_id
    JOIN topics direct_t ON direct_t.id = direct_st.topic_id
    WHERE leq.session_id = NEW.id
      AND direct_t.syllabus_id = target_syllabus_id

    UNION ALL

    SELECT
      leq.id session_question_id,
      leq.question_id,
      target_lo.id learning_objective_id,
      target_lo.subtopic_id,
      qlo.confidence mapping_confidence
    FROM live_exam_questions leq
    JOIN question_learning_objectives qlo ON qlo.question_id = leq.question_id
    JOIN learning_objective_compatibility compat
      ON compat.source_lo_id = qlo.lo_id
     AND compat.relation IN ('equivalent','subtopic_compatible')
    JOIN learning_objectives target_lo ON target_lo.id = compat.target_lo_id
    JOIN subtopics target_st ON target_st.id = target_lo.subtopic_id
    JOIN topics target_t ON target_t.id = target_st.topic_id
    WHERE leq.session_id = NEW.id
      AND target_t.syllabus_id = target_syllabus_id
  ), resolved_mapping AS (
    -- Multiple historical source LOs can intentionally resolve to the same
    -- current LO. Collapse those paths before inserting evidence so retries and
    -- compatibility fan-in cannot duplicate one target objective.
    SELECT
      session_question_id,
      question_id,
      learning_objective_id,
      subtopic_id,
      max(mapping_confidence) mapping_confidence
    FROM mapping_candidates
    GROUP BY session_question_id,question_id,learning_objective_id,subtopic_id
  ), inserted AS (
    INSERT INTO live_exam_learning_evidence(
      session_id,session_question_id,answer_id,student_id,question_id,
      learning_objective_id,subtopic_id,mapping_confidence,
      marks_earned,marks_possible,score_source,teacher_overridden,created_at
    )
    SELECT
      NEW.id,
      mapped.session_question_id,
      a.id,
      lep.student_id,
      mapped.question_id,
      mapped.learning_objective_id,
      mapped.subtopic_id,
      mapped.mapping_confidence,
      a.final_score,
      leq.marks,
      a.score_source,
      (a.moderated_by IS NOT NULL),
      coalesce(NEW.finished_at,now())
    FROM resolved_mapping mapped
    JOIN live_exam_questions leq ON leq.id = mapped.session_question_id
    JOIN live_exam_answers a ON a.session_question_id = mapped.session_question_id
    JOIN live_exam_participants lep ON lep.id = a.participant_id
    ON CONFLICT (answer_id,learning_objective_id) DO NOTHING
    RETURNING student_id,subtopic_id,learning_objective_id,answer_id,marks_earned,marks_possible
  ), subtopic_answers AS (
    -- A question may map to several learning objectives in one subtopic. Keep
    -- every LO evidence row, but count that question's Cambridge marks only
    -- once in the existing subtopic-level mastery aggregate.
    SELECT DISTINCT
      student_id,subtopic_id,answer_id,marks_earned,marks_possible
    FROM inserted
  ), aggregated AS (
    SELECT
      student_id,
      subtopic_id,
      count(DISTINCT answer_id)::int attempts,
      sum(marks_earned)::numeric(8,2) marks_earned,
      sum(marks_possible)::numeric(8,2) marks_possible
    FROM subtopic_answers
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
