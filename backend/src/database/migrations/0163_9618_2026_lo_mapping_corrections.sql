-- Correct source-verifiable 9618 learning-objective mappings before exposing
-- the affected questions through chapter-scoped Past Papers.
--
-- Current-paper corrections are deliberately narrow. Each row is identified by
-- canonical display_ref inside the 9618/2026/MJ Paper 1 corpus and moves only
-- the specific low-confidence mapping whose assessed task contradicts the
-- current 2026-2028 learning objective. Unrelated mappings are preserved.
--
-- Historical compatibility is narrower still. The 2024-2025 source pool for
-- 3.1-lo-03 contains one RAM-performance question that does not assess RAM-vs-ROM.
-- Remove only that bad source assignment, then map current 3.1.5 to the cleaned
-- historical 3.1-lo-03 objective. Other Chapter 3 historical pools remain
-- intentionally unavailable until their own source mappings are audited.

DO $$
DECLARE
  v_questions integer;
  v_target_los integer;
  v_historical_question integer;
BEGIN
  WITH corrections(display_ref,old_code,new_code) AS (
    VALUES
      ('9618/11/M/J/26 Q6(a)','3.2.1','3.2.5'),
      ('9618/12/M/J/26 Q6(a)','3.1.8','3.1.2'),
      ('9618/12/M/J/26 Q8(a)','3.2.2','3.2.4'),
      ('9618/12/M/J/26 Q8(b)','3.2.6','3.2.5'),
      ('9618/13/M/J/26 Q2(a)','3.2.2','3.2.4'),
      ('9618/13/M/J/26 Q7(b)','3.1.8','4.3.2'),
      ('9618/13/M/J/26 Q8(a)','3.1.5','3.1.7'),
      ('9618/13/M/J/26 Q8(c)','3.1.3','3.1.4')
  )
  SELECT count(*) INTO v_questions
  FROM corrections c
  JOIN public.questions q ON q.display_ref=c.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components component ON component.id=q.component_id
  WHERE s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2026
    AND sp.series='MJ'::exam_series
    AND component.number=1;

  IF v_questions<>8 THEN
    RAISE EXCEPTION '0163 9618/2026 LO correction blocked: resolved questions=% expected=8',v_questions;
  END IF;

  WITH correction_codes(code) AS (
    VALUES
      ('3.2.1'),('3.2.5'),('3.1.8'),('3.1.2'),('3.2.2'),('3.2.4'),
      ('3.2.6'),('4.3.2'),('3.1.5'),('3.1.7'),('3.1.3'),('3.1.4')
  )
  SELECT count(*) INTO v_target_los
  FROM correction_codes c
  JOIN public.learning_objectives lo ON lo.code=c.code
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE s.code='9618' AND s.version_label='2026-2028';

  IF v_target_los<>12 THEN
    RAISE EXCEPTION '0163 9618/2026 LO correction blocked: current target LOs=% expected=12',v_target_los;
  END IF;

  SELECT count(*) INTO v_historical_question
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components component ON component.id=q.component_id
  WHERE q.display_ref='9618/11/M/J/25 Q6(a)(ii)'
    AND s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2025
    AND sp.series='MJ'::exam_series
    AND component.number=1;

  IF v_historical_question<>1 THEN
    RAISE EXCEPTION '0163 historical RAM-performance cleanup blocked: resolved questions=% expected=1',v_historical_question;
  END IF;
END $$;

WITH corrections(display_ref,old_code,new_code) AS (
  VALUES
    ('9618/11/M/J/26 Q6(a)','3.2.1','3.2.5'),
    ('9618/12/M/J/26 Q6(a)','3.1.8','3.1.2'),
    ('9618/12/M/J/26 Q8(a)','3.2.2','3.2.4'),
    ('9618/12/M/J/26 Q8(b)','3.2.6','3.2.5'),
    ('9618/13/M/J/26 Q2(a)','3.2.2','3.2.4'),
    ('9618/13/M/J/26 Q7(b)','3.1.8','4.3.2'),
    ('9618/13/M/J/26 Q8(a)','3.1.5','3.1.7'),
    ('9618/13/M/J/26 Q8(c)','3.1.3','3.1.4')
), resolved AS (
  SELECT q.id question_id,old_lo.id old_lo_id
  FROM corrections c
  JOIN public.questions q ON q.display_ref=c.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi paper_s ON paper_s.id=sp.syllabus_id
  JOIN public.components component ON component.id=q.component_id
  JOIN public.learning_objectives old_lo ON old_lo.code=c.old_code
  JOIN public.subtopics old_st ON old_st.id=old_lo.subtopic_id
  JOIN public.topics old_t ON old_t.id=old_st.topic_id
  JOIN public.syllabi old_s ON old_s.id=old_t.syllabus_id
  WHERE paper_s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2026
    AND sp.series='MJ'::exam_series
    AND component.number=1
    AND old_s.code='9618'
    AND old_s.version_label='2026-2028'
)
DELETE FROM public.question_learning_objectives qlo
USING resolved r
WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.old_lo_id;

WITH corrections(display_ref,old_code,new_code) AS (
  VALUES
    ('9618/11/M/J/26 Q6(a)','3.2.1','3.2.5'),
    ('9618/12/M/J/26 Q6(a)','3.1.8','3.1.2'),
    ('9618/12/M/J/26 Q8(a)','3.2.2','3.2.4'),
    ('9618/12/M/J/26 Q8(b)','3.2.6','3.2.5'),
    ('9618/13/M/J/26 Q2(a)','3.2.2','3.2.4'),
    ('9618/13/M/J/26 Q7(b)','3.1.8','4.3.2'),
    ('9618/13/M/J/26 Q8(a)','3.1.5','3.1.7'),
    ('9618/13/M/J/26 Q8(c)','3.1.3','3.1.4')
), resolved AS (
  SELECT q.id question_id,new_lo.id new_lo_id
  FROM corrections c
  JOIN public.questions q ON q.display_ref=c.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi paper_s ON paper_s.id=sp.syllabus_id
  JOIN public.components component ON component.id=q.component_id
  JOIN public.learning_objectives new_lo ON new_lo.code=c.new_code
  JOIN public.subtopics new_st ON new_st.id=new_lo.subtopic_id
  JOIN public.topics new_t ON new_t.id=new_st.topic_id
  JOIN public.syllabi new_s ON new_s.id=new_t.syllabus_id
  WHERE paper_s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2026
    AND sp.series='MJ'::exam_series
    AND component.number=1
    AND new_s.code='9618'
    AND new_s.version_label='2026-2028'
)
INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
SELECT question_id,new_lo_id,1.0 FROM resolved
ON CONFLICT(question_id,lo_id) DO UPDATE SET confidence=EXCLUDED.confidence;

-- Remove one historical source assignment that would otherwise leak a RAM
-- performance question into current RAM-vs-ROM practice through compatibility.
WITH resolved AS (
  SELECT q.id question_id,lo.id lo_id
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi paper_s ON paper_s.id=sp.syllabus_id
  JOIN public.components component ON component.id=q.component_id
  JOIN public.learning_objectives lo ON lo.code='3.1-lo-03'
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi lo_s ON lo_s.id=t.syllabus_id
  WHERE q.display_ref='9618/11/M/J/25 Q6(a)(ii)'
    AND paper_s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2025
    AND sp.series='MJ'::exam_series
    AND component.number=1
    AND lo_s.code='9618'
    AND lo_s.version_label='2024-2025'
)
DELETE FROM public.question_learning_objectives qlo
USING resolved r
WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.lo_id;

-- Only the audited RAM-vs-ROM historical pool is enabled now. 3.1.6 and 3.1.7
-- remain fail-closed until every question already assigned to their historical
-- source objectives has been adjudicated.
WITH curated(target_code,source_code,relation,rationale) AS (
  VALUES
    ('3.1.5','3.1-lo-03','equivalent','RAM versus ROM assessed scope is retained after removing the one source-misclassified RAM-performance leaf.')
), resolved AS (
  SELECT target_lo.id target_lo_id,source_lo.id source_lo_id,c.relation,
         'chapter3-ram-rom-compatibility-0163: ' || c.rationale AS evidence
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
  WHERE target_st.code='3.1' AND source_st.code='3.1'
)
INSERT INTO public.learning_objective_compatibility(target_lo_id,source_lo_id,relation,evidence)
SELECT target_lo_id,source_lo_id,relation,evidence FROM resolved
ON CONFLICT(target_lo_id,source_lo_id) DO UPDATE
SET relation=EXCLUDED.relation,evidence=EXCLUDED.evidence;

DO $$
DECLARE
  v_new_mappings integer;
  v_old_mappings integer;
  v_bad_historical_mapping integer;
  v_compatibility integer;
BEGIN
  WITH corrections(display_ref,old_code,new_code) AS (
    VALUES
      ('9618/11/M/J/26 Q6(a)','3.2.1','3.2.5'),
      ('9618/12/M/J/26 Q6(a)','3.1.8','3.1.2'),
      ('9618/12/M/J/26 Q8(a)','3.2.2','3.2.4'),
      ('9618/12/M/J/26 Q8(b)','3.2.6','3.2.5'),
      ('9618/13/M/J/26 Q2(a)','3.2.2','3.2.4'),
      ('9618/13/M/J/26 Q7(b)','3.1.8','4.3.2'),
      ('9618/13/M/J/26 Q8(a)','3.1.5','3.1.7'),
      ('9618/13/M/J/26 Q8(c)','3.1.3','3.1.4')
  ), current_los AS (
    SELECT lo.id,lo.code
    FROM public.learning_objectives lo
    JOIN public.subtopics st ON st.id=lo.subtopic_id
    JOIN public.topics t ON t.id=st.topic_id
    JOIN public.syllabi s ON s.id=t.syllabus_id
    WHERE s.code='9618' AND s.version_label='2026-2028'
  ), resolved AS (
    SELECT q.id question_id,old_lo.id old_lo_id,new_lo.id new_lo_id
    FROM corrections c
    JOIN public.questions q ON q.display_ref=c.display_ref
    JOIN public.source_papers sp ON sp.id=q.source_paper_id
    JOIN public.syllabi ps ON ps.id=sp.syllabus_id
    JOIN public.components component ON component.id=q.component_id
    JOIN current_los old_lo ON old_lo.code=c.old_code
    JOIN current_los new_lo ON new_lo.code=c.new_code
    WHERE ps.code='9618' AND sp.kind='QP'::paper_kind
      AND sp.year=2026 AND sp.series='MJ'::exam_series AND component.number=1
  )
  SELECT
    count(*) FILTER(WHERE EXISTS(
      SELECT 1 FROM public.question_learning_objectives qlo
      WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.new_lo_id AND qlo.confidence=1.0
    )),
    count(*) FILTER(WHERE EXISTS(
      SELECT 1 FROM public.question_learning_objectives qlo
      WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.old_lo_id
    ))
  INTO v_new_mappings,v_old_mappings
  FROM resolved r;

  IF v_new_mappings<>8 OR v_old_mappings<>0 THEN
    RAISE EXCEPTION '0163 mapping postcondition failed: new=% old=%',v_new_mappings,v_old_mappings;
  END IF;

  SELECT count(*) INTO v_bad_historical_mapping
  FROM public.questions q
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id
  JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE q.display_ref='9618/11/M/J/25 Q6(a)(ii)'
    AND s.code='9618' AND s.version_label='2024-2025'
    AND lo.code='3.1-lo-03';

  IF v_bad_historical_mapping<>0 THEN
    RAISE EXCEPTION '0163 historical RAM-performance mapping still present';
  END IF;

  SELECT count(*) INTO v_compatibility
  FROM public.learning_objective_compatibility c
  JOIN public.learning_objectives target_lo ON target_lo.id=c.target_lo_id
  JOIN public.subtopics target_st ON target_st.id=target_lo.subtopic_id
  JOIN public.topics target_t ON target_t.id=target_st.topic_id
  JOIN public.syllabi target_s ON target_s.id=target_t.syllabus_id
  JOIN public.learning_objectives source_lo ON source_lo.id=c.source_lo_id
  JOIN public.subtopics source_st ON source_st.id=source_lo.subtopic_id
  JOIN public.topics source_t ON source_t.id=source_st.topic_id
  JOIN public.syllabi source_s ON source_s.id=source_t.syllabus_id
  WHERE target_s.code='9618' AND target_s.version_label='2026-2028'
    AND source_s.code='9618' AND source_s.version_label IN ('2021-2023','2024-2025')
    AND target_lo.code='3.1.5'
    AND source_lo.code='3.1-lo-03'
    AND c.relation='equivalent';

  IF v_compatibility<>2 THEN
    RAISE EXCEPTION '0163 Chapter 3 RAM-vs-ROM compatibility postcondition failed: edges=% expected=2',v_compatibility;
  END IF;
END $$;
