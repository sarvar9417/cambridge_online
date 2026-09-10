-- Reconcile Chapter 3 Past Paper taxonomy after the initial memory compatibility
-- migration exposed historically misclassified questions through otherwise valid
-- current-target compatibility edges.
--
-- This migration is deliberately fail-closed and narrow:
--   * eight source-verifiable May/June 2026 mappings are moved to their exact
--     2026-2028 learning objectives;
--   * six audited historical false-positive mappings are removed, with the one
--     generic ROM question moved to the historical RAM/ROM objective;
--   * the three Chapter 3 memory compatibility pairs remain enabled only after
--     their source pools have been explicitly adjudicated;
--   * unrelated question/LO mappings are preserved.

DO $$
DECLARE
  v_current_questions integer;
  v_current_los integer;
  v_historical_questions integer;
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
  SELECT count(*) INTO v_current_questions
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

  IF v_current_questions<>8 THEN
    RAISE EXCEPTION '0164 current question identity gate failed: resolved=% expected=8',v_current_questions;
  END IF;

  WITH codes(code) AS (
    VALUES
      ('3.2.1'),('3.2.5'),('3.1.8'),('3.1.2'),('3.2.2'),('3.2.4'),
      ('3.2.6'),('4.3.2'),('3.1.5'),('3.1.7'),('3.1.3'),('3.1.4')
  )
  SELECT count(*) INTO v_current_los
  FROM codes c
  JOIN public.learning_objectives lo ON lo.code=c.code
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE s.code='9618' AND s.version_label='2026-2028';

  IF v_current_los<>12 THEN
    RAISE EXCEPTION '0164 current LO identity gate failed: resolved=% expected=12',v_current_los;
  END IF;

  WITH cleanup(display_ref,old_code,new_code) AS (
    VALUES
      ('9618/11/M/J/25 Q6(a)(ii)','3.1-lo-03',NULL::text),
      ('9618/12/M/J/22 Q9(b)','3.1-lo-05',NULL::text),
      ('9618/12/O/N/22 Q3(c)','3.1-lo-05','3.1-lo-03'),
      ('9618/13/O/N/22 Q4(b)','3.1-lo-05',NULL::text),
      ('9618/12/O/N/23 Q1(c)(i)','3.1-lo-05',NULL::text),
      ('9618/13/O/N/25 Q7(d)','3.1-lo-05',NULL::text)
  )
  SELECT count(*) INTO v_historical_questions
  FROM cleanup c
  JOIN public.questions q ON q.display_ref=c.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components component ON component.id=q.component_id
  WHERE s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.year BETWEEN 2022 AND 2025
    AND component.number=1;

  IF v_historical_questions<>6 THEN
    RAISE EXCEPTION '0164 historical question identity gate failed: resolved=% expected=6',v_historical_questions;
  END IF;
END $$;

-- Move the eight adjudicated 2026 questions away from their low-confidence
-- source-inconsistent objective and onto the exact current objective.
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

WITH corrections(display_ref,new_code) AS (
  VALUES
    ('9618/11/M/J/26 Q6(a)','3.2.5'),
    ('9618/12/M/J/26 Q6(a)','3.1.2'),
    ('9618/12/M/J/26 Q8(a)','3.2.4'),
    ('9618/12/M/J/26 Q8(b)','3.2.5'),
    ('9618/13/M/J/26 Q2(a)','3.2.4'),
    ('9618/13/M/J/26 Q7(b)','4.3.2'),
    ('9618/13/M/J/26 Q8(a)','3.1.7'),
    ('9618/13/M/J/26 Q8(c)','3.1.4')
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

-- Remove six adjudicated historical false positives from the memory-family
-- compatibility source pools. Other mappings on the same questions are untouched.
WITH cleanup(display_ref,old_code) AS (
  VALUES
    ('9618/11/M/J/25 Q6(a)(ii)','3.1-lo-03'),
    ('9618/12/M/J/22 Q9(b)','3.1-lo-05'),
    ('9618/12/O/N/22 Q3(c)','3.1-lo-05'),
    ('9618/13/O/N/22 Q4(b)','3.1-lo-05'),
    ('9618/12/O/N/23 Q1(c)(i)','3.1-lo-05'),
    ('9618/13/O/N/25 Q7(d)','3.1-lo-05')
), resolved AS (
  SELECT q.id question_id,old_lo.id old_lo_id
  FROM cleanup c
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
    AND sp.year BETWEEN 2022 AND 2025
    AND component.number=1
    AND old_s.code='9618'
    AND old_s.version_label=CASE WHEN sp.year<=2023 THEN '2021-2023' ELSE '2024-2025' END
)
DELETE FROM public.question_learning_objectives qlo
USING resolved r
WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.old_lo_id;

-- The 2022 embedded-system ROM question assesses ROM characteristics rather
-- than PROM/EPROM/EEPROM. Move it to the historical RAM/ROM objective so it can
-- surface through current 3.1.5 instead of current 3.1.7.
WITH resolved AS (
  SELECT q.id question_id,target_lo.id target_lo_id
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi paper_s ON paper_s.id=sp.syllabus_id
  JOIN public.components component ON component.id=q.component_id
  JOIN public.learning_objectives target_lo ON target_lo.code='3.1-lo-03'
  JOIN public.subtopics target_st ON target_st.id=target_lo.subtopic_id
  JOIN public.topics target_t ON target_t.id=target_st.topic_id
  JOIN public.syllabi target_s ON target_s.id=target_t.syllabus_id
  WHERE q.display_ref='9618/12/O/N/22 Q3(c)'
    AND paper_s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2022
    AND component.number=1
    AND target_s.code='9618'
    AND target_s.version_label='2021-2023'
)
INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
SELECT question_id,target_lo_id,1.0 FROM resolved
ON CONFLICT(question_id,lo_id) DO UPDATE SET confidence=EXCLUDED.confidence;

-- Preserve the three source-backed Chapter 3 compatibility pairs, but replace
-- their evidence with the explicit post-audit provenance from this migration.
WITH curated(target_code,source_code,relation,rationale) AS (
  VALUES
    ('3.1.5','3.1-lo-03','equivalent','RAM/ROM historical pool audited; false RAM-performance mapping removed and generic ROM mapping reconciled.'),
    ('3.1.6','3.1-lo-04','equivalent','SRAM/DRAM historical pool audited question-by-question and retained.'),
    ('3.1.7','3.1-lo-05','equivalent','PROM/EPROM/EEPROM historical pool audited; five non-ROM-family mappings removed.')
), resolved AS (
  SELECT target_lo.id target_lo_id,source_lo.id source_lo_id,c.relation,
         'chapter3-memory-compatibility-0164-audited: ' || c.rationale AS evidence
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
  v_new_current integer;
  v_old_current integer;
  v_bad_historical integer;
  v_rom_reclassified integer;
  v_expected_rom_family integer;
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
  INTO v_new_current,v_old_current
  FROM resolved r;

  IF v_new_current<>8 OR v_old_current<>0 THEN
    RAISE EXCEPTION '0164 current mapping postcondition failed: new=% old=%',v_new_current,v_old_current;
  END IF;

  WITH bad(display_ref,old_code) AS (
    VALUES
      ('9618/11/M/J/25 Q6(a)(ii)','3.1-lo-03'),
      ('9618/12/M/J/22 Q9(b)','3.1-lo-05'),
      ('9618/12/O/N/22 Q3(c)','3.1-lo-05'),
      ('9618/13/O/N/22 Q4(b)','3.1-lo-05'),
      ('9618/12/O/N/23 Q1(c)(i)','3.1-lo-05'),
      ('9618/13/O/N/25 Q7(d)','3.1-lo-05')
  )
  SELECT count(*) INTO v_bad_historical
  FROM bad b
  JOIN public.questions q ON q.display_ref=b.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id
  JOIN public.learning_objectives lo ON lo.id=qlo.lo_id AND lo.code=b.old_code
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE s.code='9618'
    AND s.version_label=CASE WHEN sp.year<=2023 THEN '2021-2023' ELSE '2024-2025' END;

  IF v_bad_historical<>0 THEN
    RAISE EXCEPTION '0164 historical cleanup postcondition failed: stale_bad_mappings=%',v_bad_historical;
  END IF;

  SELECT count(*) INTO v_rom_reclassified
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id AND qlo.confidence=1.0
  JOIN public.learning_objectives lo ON lo.id=qlo.lo_id AND lo.code='3.1-lo-03'
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE q.display_ref='9618/12/O/N/22 Q3(c)'
    AND sp.year=2022
    AND s.code='9618' AND s.version_label='2021-2023';

  IF v_rom_reclassified<>1 THEN
    RAISE EXCEPTION '0164 generic ROM reclassification failed: rows=% expected=1',v_rom_reclassified;
  END IF;

  WITH expected(ref) AS (
    VALUES
      ('9618/11/M/J/22 Q2(a)(ii)'),
      ('9618/11/O/N/22 Q9(b)'),
      ('9618/13/O/N/23 Q7(b)'),
      ('9618/12/M/J/24 Q2(c)'),
      ('9618/12/O/N/24 Q2(c)'),
      ('9618/13/O/N/25 Q4(c)')
  )
  SELECT count(*) INTO v_expected_rom_family
  FROM expected e
  JOIN public.questions q ON q.display_ref=e.ref
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id
  JOIN public.learning_objectives lo ON lo.id=qlo.lo_id AND lo.code='3.1-lo-05'
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  WHERE s.code='9618'
    AND s.version_label=CASE WHEN sp.year<=2023 THEN '2021-2023' ELSE '2024-2025' END;

  IF v_expected_rom_family<>6 THEN
    RAISE EXCEPTION '0164 audited ROM-family retention failed: rows=% expected=6',v_expected_rom_family;
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
    AND ((target_lo.code='3.1.5' AND source_lo.code='3.1-lo-03')
      OR (target_lo.code='3.1.6' AND source_lo.code='3.1-lo-04')
      OR (target_lo.code='3.1.7' AND source_lo.code='3.1-lo-05'))
    AND c.relation='equivalent'
    AND c.evidence LIKE 'chapter3-memory-compatibility-0164-audited:%';

  IF v_compatibility<>6 THEN
    RAISE EXCEPTION '0164 compatibility postcondition failed: edges=% expected=6',v_compatibility;
  END IF;
END $$;
