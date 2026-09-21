-- Allow source-faithful historical Cambridge questions to contribute mastery
-- without inventing a one-to-one current-syllabus learning-objective mapping.
--
-- Direct current LO mappings and explicitly reviewed compatibility edges remain
-- preferred. Only when neither exists may a high-confidence primary subtopic
-- fall back to the same stable topic number + subtopic code in the class
-- syllabus. Such rows intentionally carry learning_objective_id = NULL.

ALTER TABLE live_exam_learning_evidence
  ALTER COLUMN learning_objective_id DROP NOT NULL;

ALTER TABLE live_exam_learning_evidence
  ADD COLUMN IF NOT EXISTS mapping_basis text NOT NULL DEFAULT 'legacy_lo';

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='live_exam_learning_evidence_mapping_basis_check'
      AND conrelid='live_exam_learning_evidence'::regclass
  ) THEN
    ALTER TABLE live_exam_learning_evidence
      ADD CONSTRAINT live_exam_learning_evidence_mapping_basis_check
      CHECK (mapping_basis IN ('legacy_lo','direct_lo','reviewed_compatibility','stable_subtopic'));
  END IF;
END
$migration$;

ALTER TABLE live_exam_learning_evidence
  DROP CONSTRAINT IF EXISTS live_exam_learning_evidence_answer_id_learning_objective_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS live_exam_learning_evidence_answer_lo_unique
  ON live_exam_learning_evidence (answer_id, learning_objective_id)
  WHERE learning_objective_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS live_exam_learning_evidence_answer_subtopic_fallback_unique
  ON live_exam_learning_evidence (answer_id, subtopic_id)
  WHERE learning_objective_id IS NULL;

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

  SELECT c.syllabus_id INTO target_syllabus_id
  FROM classes c
  WHERE c.id = NEW.class_id;

  IF target_syllabus_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'live_exam_analytics_target_syllabus_missing';
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

  -- Fail closed if a question cannot resolve either to an explicit current LO
  -- or, as a last resort, to a reviewed high-confidence stable subtopic.
  IF EXISTS (
    WITH direct_candidates AS (
      SELECT leq.id session_question_id
      FROM live_exam_questions leq
      JOIN question_learning_objectives qlo ON qlo.question_id = leq.question_id
      JOIN learning_objectives direct_lo ON direct_lo.id = qlo.lo_id
      JOIN subtopics direct_st ON direct_st.id = direct_lo.subtopic_id
      JOIN topics direct_t ON direct_t.id = direct_st.topic_id
      WHERE leq.session_id = NEW.id
        AND direct_t.syllabus_id = target_syllabus_id
    ), compatibility_candidates AS (
      SELECT leq.id session_question_id
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
    ), explicit_candidates AS (
      SELECT session_question_id FROM direct_candidates
      UNION
      SELECT session_question_id FROM compatibility_candidates
    ), fallback_candidates AS (
      SELECT DISTINCT leq.id session_question_id
      FROM live_exam_questions leq
      JOIN question_subtopics qst
        ON qst.question_id = leq.question_id
       AND qst.is_primary
       AND coalesce(qst.confidence,0) >= 0.95
      JOIN subtopics source_st ON source_st.id = qst.subtopic_id
      JOIN topics source_t ON source_t.id = source_st.topic_id
      JOIN topics target_t
        ON target_t.syllabus_id = target_syllabus_id
       AND target_t.number = source_t.number
      JOIN subtopics target_st
        ON target_st.topic_id = target_t.id
       AND target_st.code = source_st.code
      WHERE leq.session_id = NEW.id
        AND NOT EXISTS (
          SELECT 1 FROM explicit_candidates mapped
          WHERE mapped.session_question_id = leq.id
        )
    ), all_candidates AS (
      SELECT session_question_id FROM explicit_candidates
      UNION
      SELECT session_question_id FROM fallback_candidates
    )
    SELECT 1
    FROM live_exam_questions leq
    WHERE leq.session_id = NEW.id
      AND NOT EXISTS (
        SELECT 1 FROM all_candidates mapped
        WHERE mapped.session_question_id = leq.id
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'live_exam_analytics_unmapped_question';
  END IF;

  WITH direct_candidates AS (
    SELECT
      leq.id session_question_id,
      leq.question_id,
      qlo.lo_id learning_objective_id,
      direct_lo.subtopic_id,
      qlo.confidence mapping_confidence,
      'direct_lo'::text mapping_basis
    FROM live_exam_questions leq
    JOIN question_learning_objectives qlo ON qlo.question_id = leq.question_id
    JOIN learning_objectives direct_lo ON direct_lo.id = qlo.lo_id
    JOIN subtopics direct_st ON direct_st.id = direct_lo.subtopic_id
    JOIN topics direct_t ON direct_t.id = direct_st.topic_id
    WHERE leq.session_id = NEW.id
      AND direct_t.syllabus_id = target_syllabus_id
  ), compatibility_candidates AS (
    SELECT
      leq.id session_question_id,
      leq.question_id,
      target_lo.id learning_objective_id,
      target_lo.subtopic_id,
      qlo.confidence mapping_confidence,
      'reviewed_compatibility'::text mapping_basis
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
  ), explicit_candidates_raw AS (
    SELECT * FROM direct_candidates
    UNION ALL
    SELECT * FROM compatibility_candidates
  ), explicit_candidates AS (
    SELECT
      session_question_id,
      question_id,
      learning_objective_id,
      subtopic_id,
      max(mapping_confidence) mapping_confidence,
      CASE
        WHEN bool_or(mapping_basis='direct_lo') THEN 'direct_lo'
        ELSE 'reviewed_compatibility'
      END mapping_basis
    FROM explicit_candidates_raw
    GROUP BY session_question_id,question_id,learning_objective_id,subtopic_id
  ), fallback_candidates AS (
    SELECT DISTINCT
      leq.id session_question_id,
      leq.question_id,
      NULL::uuid learning_objective_id,
      target_st.id subtopic_id,
      qst.confidence mapping_confidence,
      'stable_subtopic'::text mapping_basis
    FROM live_exam_questions leq
    JOIN question_subtopics qst
      ON qst.question_id = leq.question_id
     AND qst.is_primary
     AND coalesce(qst.confidence,0) >= 0.95
    JOIN subtopics source_st ON source_st.id = qst.subtopic_id
    JOIN topics source_t ON source_t.id = source_st.topic_id
    JOIN topics target_t
      ON target_t.syllabus_id = target_syllabus_id
     AND target_t.number = source_t.number
    JOIN subtopics target_st
      ON target_st.topic_id = target_t.id
     AND target_st.code = source_st.code
    WHERE leq.session_id = NEW.id
      AND NOT EXISTS (
        SELECT 1
        FROM explicit_candidates mapped
        WHERE mapped.session_question_id = leq.id
      )
  ), resolved_mapping AS (
    SELECT * FROM explicit_candidates
    UNION ALL
    SELECT * FROM fallback_candidates
  ), inserted AS (
    INSERT INTO live_exam_learning_evidence(
      session_id,session_question_id,answer_id,student_id,question_id,
      learning_objective_id,subtopic_id,mapping_confidence,mapping_basis,
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
      mapped.mapping_basis,
      a.final_score,
      leq.marks,
      a.score_source,
      (a.moderated_by IS NOT NULL),
      coalesce(NEW.finished_at,now())
    FROM resolved_mapping mapped
    JOIN live_exam_questions leq ON leq.id = mapped.session_question_id
    JOIN live_exam_answers a ON a.session_question_id = mapped.session_question_id
    JOIN live_exam_participants lep ON lep.id = a.participant_id
    ON CONFLICT DO NOTHING
    RETURNING student_id,subtopic_id,learning_objective_id,answer_id,marks_earned,marks_possible
  ), subtopic_answers AS (
    -- A question may map to several LOs in one subtopic. Count its Cambridge
    -- marks once in subtopic mastery. Stable-subtopic fallback naturally has
    -- one NULL-LO row per answer/subtopic.
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
