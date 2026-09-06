-- Complete the explicit cross-version learning-objective graph used by Lesson Studio,
-- practice and results for the three source-complete lessons.
--
-- Rules:
--   * equivalent = the assessed scope is materially interchangeable;
--   * subtopic_compatible = the historical objective is a safe subset/superset of
--     the current objective inside the same Cambridge concept, useful for practice
--     without claiming identical mastery semantics;
--   * no row is inserted when the old objective introduces a materially different
--     assessment requirement.

WITH curated(target_code,source_code,relation,rationale) AS (
  VALUES
    ('1.1.2','1.1-lo-03','subtopic_compatible','Historical purpose/benefits of number bases is a safe part of current understanding of different number systems.'),
    ('1.1.3','1.1-lo-01','equivalent','Base/representation conversion is retained.'),
    ('1.1.5','1.1-lo-02','subtopic_compatible','Overflow is assessed as a representation consequence of fixed-width binary arithmetic.'),
    ('1.1.6','1.1-lo-03','subtopic_compatible','Historical number-base purpose/application questions safely cover hexadecimal/BCD application reasoning within the current subtopic.'),
    ('1.1.7','1.1-lo-04','subtopic_compatible','Historical character-set purpose is one part of the current character-data representation objective.'),
    ('1.1.7','1.1-lo-05','subtopic_compatible','Historical ASCII/Unicode representation is one part of the current character-data representation objective.'),
    ('1.2.2','1.2-lo-01','subtopic_compatible','Bitmap file-size calculation uses the pixel/bit-depth representation model in the historical bitmap objective.'),
    ('1.2.3','1.2-lo-01','subtopic_compatible','Changing resolution/bit depth and its file-size/quality effect remains inside the historical bitmap representation scope.'),
    ('1.2.4','1.2-lo-02','equivalent','Vector-graphic representation/storage is retained.'),
    ('1.2.5','1.2-lo-03','equivalent','Bitmap-versus-vector task choice and justification is retained.'),
    ('1.2.6','1.2-lo-04','equivalent','Analogue-sound digitisation/encoding is retained.'),
    ('1.2.7','1.2-lo-05','equivalent','Sampling-rate/resolution impact is retained.'),
    ('13.1.1','13.1-lo-01','equivalent','Need for user-defined data types is retained.'),
    ('13.1.2','13.1-lo-02','equivalent','Definition/use of non-composite user-defined types is retained.'),
    ('13.3.4','13.3-lo-04','equivalent','Consequences of approximate binary real-number representation are retained.'),
    ('13.3.5','13.3-lo-05','equivalent','Rounding-error consequences of binary representation are retained.')
), resolved AS (
  SELECT target_lo.id target_lo_id,source_lo.id source_lo_id,c.relation,
         'lesson-source-compatibility-0127: ' || c.rationale AS evidence
  FROM curated c
  JOIN public.learning_objectives target_lo ON target_lo.code=c.target_code
  JOIN public.subtopics target_st ON target_st.id=target_lo.subtopic_id
  JOIN public.topics target_t ON target_t.id=target_st.topic_id
  JOIN public.syllabi target_s ON target_s.id=target_t.syllabus_id
    AND target_s.code='9618' AND target_s.version_label='2026-2028'
  JOIN public.learning_objectives source_lo ON source_lo.code=c.source_code
  JOIN public.subtopics source_st ON source_st.id=source_lo.subtopic_id
  JOIN public.topics source_t ON source_t.id=source_st.topic_id
  JOIN public.syllabi source_s ON source_s.id=source_t.syllabus_id
    AND source_s.code='9618' AND source_s.version_label IN ('2021-2023','2024-2025')
  WHERE target_st.code=source_st.code
)
INSERT INTO public.learning_objective_compatibility(target_lo_id,source_lo_id,relation,evidence)
SELECT target_lo_id,source_lo_id,relation,evidence FROM resolved
ON CONFLICT (target_lo_id,source_lo_id) DO UPDATE
SET relation=EXCLUDED.relation,evidence=EXCLUDED.evidence;

-- The 2023-2025 and 2026-2028 0478 Topic 7 objectives use the same LO codes and
-- materially the same assessed scope. They are separate database identities, so
-- explicit rows are still required for current-target practice to surface 2023-25 papers.
INSERT INTO public.learning_objective_compatibility(target_lo_id,source_lo_id,relation,evidence)
SELECT target_lo.id,source_lo.id,'equivalent',
       'lesson-source-compatibility-0127: 0478 Topic 7 objective retained from 2023-2025 into 2026-2028.'
FROM public.learning_objectives target_lo
JOIN public.subtopics target_st ON target_st.id=target_lo.subtopic_id
JOIN public.topics target_t ON target_t.id=target_st.topic_id
JOIN public.syllabi target_s ON target_s.id=target_t.syllabus_id
  AND target_s.code='0478' AND target_s.version_label='2026-2028'
JOIN public.learning_objectives source_lo ON source_lo.code=target_lo.code
JOIN public.subtopics source_st ON source_st.id=source_lo.subtopic_id
JOIN public.topics source_t ON source_t.id=source_st.topic_id
JOIN public.syllabi source_s ON source_s.id=source_t.syllabus_id
  AND source_s.code='0478' AND source_s.version_label='2023-2025'
WHERE target_st.code='7' AND source_st.code='7' AND target_lo.code LIKE '7-lo-%'
ON CONFLICT (target_lo_id,source_lo_id) DO UPDATE
SET relation=EXCLUDED.relation,evidence=EXCLUDED.evidence;

-- Older 2015-2022 0478 objectives are mapped only where the historical assessed
-- requirement is equivalent to, or a safe subset of, the current Topic 7 target.
-- In particular 2.1.1-lo-10 (comment on effectiveness) is intentionally omitted:
-- current 7-lo-09 is about writing/amending algorithms, not evaluating a solution.
WITH curated(target_code,source_code,relation,rationale) AS (
  VALUES
    ('7-lo-02','2.1.1-lo-01','subtopic_compatible','Historical subsystem understanding is one explicit part of the current decomposition/design objective.'),
    ('7-lo-02','2.1.1-lo-02','subtopic_compatible','Historical top-down/structure-diagram solution design is one explicit part of the current decomposition/design objective.'),
    ('7-lo-03','2.1.1-lo-03','equivalent','Purpose of a given algorithm is retained.'),
    ('7-lo-04','2.1.1-lo-04','equivalent','Standard methods of solution are retained.'),
    ('7-lo-04','2.1.2-lo-04','subtopic_compatible','Historical input/output, totalling and counting routines are standard solution methods inside the current objective.'),
    ('7-lo-05','2.1.1-lo-06','equivalent','Need for validation and verification checks is retained.'),
    ('7-lo-06','2.1.1-lo-05','equivalent','Selecting and applying suitable test data is retained.'),
    ('7-lo-07','2.1.1-lo-07','equivalent','Trace-table dry running is retained.'),
    ('7-lo-08','2.1.1-lo-08','equivalent','Identifying and correcting algorithm errors is retained.'),
    ('7-lo-09','2.1.1-lo-09','subtopic_compatible','Historical production of pseudocode/flowchart algorithms is a safe subset of current write/amend algorithms.'),
    ('7-lo-09','2.1.2-lo-01','subtopic_compatible','Historical pseudocode assignment syntax is a safe subset of current algorithm writing.'),
    ('7-lo-09','2.1.2-lo-02','subtopic_compatible','Historical selection syntax is a safe subset of current algorithm writing.'),
    ('7-lo-09','2.1.2-lo-03','subtopic_compatible','Historical iteration syntax is a safe subset of current algorithm writing.'),
    ('7-lo-09','2.1.2-lo-04','subtopic_compatible','Historical input/output, totalling and counting syntax is a safe subset of current algorithm writing.'),
    ('7-lo-09','2.1.2-lo-05','subtopic_compatible','Historical standard flowchart symbols are a safe subset of current flowchart algorithm writing.')
), resolved AS (
  SELECT target_lo.id target_lo_id,source_lo.id source_lo_id,c.relation,
         'lesson-source-compatibility-0127: ' || c.rationale AS evidence
  FROM curated c
  JOIN public.learning_objectives target_lo ON target_lo.code=c.target_code
  JOIN public.subtopics target_st ON target_st.id=target_lo.subtopic_id
  JOIN public.topics target_t ON target_t.id=target_st.topic_id
  JOIN public.syllabi target_s ON target_s.id=target_t.syllabus_id
    AND target_s.code='0478' AND target_s.version_label='2026-2028'
  JOIN public.learning_objectives source_lo ON source_lo.code=c.source_code
  JOIN public.subtopics source_st ON source_st.id=source_lo.subtopic_id
  JOIN public.topics source_t ON source_t.id=source_st.topic_id
  JOIN public.syllabi source_s ON source_s.id=source_t.syllabus_id
    AND source_s.code='0478' AND source_s.version_label='2015-2022'
)
INSERT INTO public.learning_objective_compatibility(target_lo_id,source_lo_id,relation,evidence)
SELECT target_lo_id,source_lo_id,relation,evidence FROM resolved
ON CONFLICT (target_lo_id,source_lo_id) DO UPDATE
SET relation=EXCLUDED.relation,evidence=EXCLUDED.evidence;

-- Guard the lesson-source scope itself. This does not claim every syllabus LO in
-- the whole qualification is cross-version compatible; it proves that every
-- current target used by these three lessons has at least one explicit historical
-- source edge where historical practice is intended.
DO $$
DECLARE
  v_9618_targets int;
  v_9618_mapped int;
  v_0478_targets int;
  v_0478_mapped int;
BEGIN
  SELECT count(*) INTO v_9618_targets
  FROM public.learning_objectives lo
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE s.code='9618' AND s.version_label='2026-2028'
    AND st.code IN ('1.1','1.2','1.3','13.1','13.2','13.3');

  SELECT count(DISTINCT lo.id) INTO v_9618_mapped
  FROM public.learning_objectives lo
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  JOIN public.learning_objective_compatibility c ON c.target_lo_id=lo.id
    AND c.relation IN ('equivalent','subtopic_compatible')
  WHERE s.code='9618' AND s.version_label='2026-2028'
    AND st.code IN ('1.1','1.2','1.3','13.1','13.2','13.3');

  IF v_9618_targets<>29 OR v_9618_mapped<>v_9618_targets THEN
    RAISE EXCEPTION 'Lesson 9618 LO compatibility incomplete: targets=% mapped=% expected=29',v_9618_targets,v_9618_mapped;
  END IF;

  SELECT count(*) INTO v_0478_targets
  FROM public.learning_objectives lo
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE s.code='0478' AND s.version_label='2026-2028' AND st.code='7' AND lo.code LIKE '7-lo-%';

  SELECT count(DISTINCT lo.id) INTO v_0478_mapped
  FROM public.learning_objectives lo
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  JOIN public.learning_objective_compatibility c ON c.target_lo_id=lo.id
    AND c.relation IN ('equivalent','subtopic_compatible')
  WHERE s.code='0478' AND s.version_label='2026-2028' AND st.code='7' AND lo.code LIKE '7-lo-%';

  IF v_0478_targets<>9 OR v_0478_mapped<>v_0478_targets THEN
    RAISE EXCEPTION 'Lesson 0478 LO compatibility incomplete: targets=% mapped=% expected=9',v_0478_targets,v_0478_mapped;
  END IF;
END $$;
