-- Reconcile Chapter 1 Past Paper taxonomy after source + syllabus audit.
--
-- Safety rules:
--   * current corrections are pinned to canonical 9618 May/June 2026 Paper 1 refs;
--   * the mixed two's-complement/shift question is intentionally dual-mapped;
--   * historical cleanup removes only named false objective edges;
--   * pure shift questions move out of Chapter 1 to historical 4.3 bit manipulation;
--   * the historical sound-file-size question is removed from the bitmap pool but
--     is not force-mapped where the historical taxonomy has no proven exact target;
--   * existing compatibility relationships are not broadened by this migration.

DO $$
DECLARE
  v_current_questions integer;
  v_current_los integer;
  v_historical_questions integer;
BEGIN
  WITH refs(display_ref) AS (VALUES
    ('9618/11/M/J/26 Q1(b)'),
    ('9618/12/M/J/26 Q5(a)'),
    ('9618/12/M/J/26 Q5(b)'),
    ('9618/13/M/J/26 Q6(a)'),
    ('9618/13/M/J/26 Q6(d)'),
    ('9618/11/M/J/26 Q5(a)'),
    ('9618/11/M/J/26 Q5(b)'),
    ('9618/12/M/J/26 Q1(a)'),
    ('9618/12/M/J/26 Q1(b)'),
    ('9618/12/M/J/26 Q1(c)'),
    ('9618/12/M/J/26 Q1(d)(i)'),
    ('9618/12/M/J/26 Q1(d)(ii)'),
    ('9618/12/M/J/26 Q4(a)')
  )
  SELECT count(*) INTO v_current_questions
  FROM refs r
  JOIN public.questions q ON q.display_ref=r.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=q.component_id
  WHERE s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2026
    AND sp.series='MJ'::exam_series
    AND c.number=1;

  IF v_current_questions<>13 THEN
    RAISE EXCEPTION '0166 current identity gate failed: rows=% expected=13',v_current_questions;
  END IF;

  WITH codes(code) AS (VALUES
    ('1.1.2'),('1.1.3'),('1.1.6'),('1.1.7'),
    ('1.2.1'),('1.2.2'),('1.2.3'),('1.2.4'),('1.2.5'),('1.2.6'),('1.2.7'),
    ('1.3.1'),('1.3.3'),('4.3.1')
  )
  SELECT count(*) INTO v_current_los
  FROM codes x
  JOIN public.learning_objectives lo ON lo.code=x.code
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE s.code='9618' AND s.version_label='2026-2028';

  IF v_current_los<>14 THEN
    RAISE EXCEPTION '0166 current LO identity gate failed: rows=% expected=14',v_current_los;
  END IF;

  WITH refs(display_ref) AS (VALUES
    ('9618/11/M/J/22 Q1(a)'),
    ('9618/11/M/J/23 Q3(d)(i)'),
    ('9618/11/O/N/21 Q1(a)'),
    ('9618/12/O/N/23 Q3(a)'),
    ('9618/11/O/N/24 Q1(a)'),
    ('9618/12/M/J/24 Q7(a)'),
    ('9618/13/M/J/24 Q1(a)'),
    ('9618/11/M/J/23 Q3(d)(vi)'),
    ('9618/12/M/J/23 Q4(d)'),
    ('9618/12/O/N/23 Q3(c)'),
    ('9618/13/O/N/22 Q9(b)'),
    ('9618/12/M/J/25 Q2(c)'),
    ('9618/11/O/N/21 Q7(a)(ii)'),
    ('9618/12/O/N/22 Q6(b)(ii)'),
    ('9618/13/M/J/23 Q3(c)(i)'),
    ('9618/13/O/N/22 Q1(b)'),
    ('9618/12/O/N/21 Q5(b)(i)'),
    ('9618/12/O/N/22 Q8(b)')
  )
  SELECT count(*) INTO v_historical_questions
  FROM refs r
  JOIN public.questions q ON q.display_ref=r.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=q.component_id
  WHERE s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.year BETWEEN 2021 AND 2025
    AND c.number=1;

  IF v_historical_questions<>18 THEN
    RAISE EXCEPTION '0166 historical identity gate failed: rows=% expected=18',v_historical_questions;
  END IF;
END $$;

-- Current 2026 corrections proven by QP/MS semantics and the 2026-2028 syllabus.
WITH corrections(display_ref,old_code,new_code) AS (VALUES
  ('9618/11/M/J/26 Q1(b)','1.1.7','1.1.3'),
  ('9618/12/M/J/26 Q5(a)','1.1.6','1.1.3'),
  ('9618/12/M/J/26 Q5(b)','1.1.7','1.1.2'),
  ('9618/13/M/J/26 Q6(a)','1.1.6','1.1.2'),
  ('9618/13/M/J/26 Q6(d)','1.1.3','1.1.2'),
  ('9618/11/M/J/26 Q5(a)','1.2.5','1.2.1'),
  ('9618/11/M/J/26 Q5(b)','1.2.5','1.2.4'),
  ('9618/12/M/J/26 Q1(a)','1.2.2','1.2.1'),
  ('9618/12/M/J/26 Q1(b)','1.2.3','1.2.1'),
  ('9618/12/M/J/26 Q1(c)','1.2.2','1.2.1'),
  ('9618/12/M/J/26 Q1(d)(i)','1.2.3','1.2.1'),
  ('9618/12/M/J/26 Q1(d)(ii)','1.3.1','1.3.3'),
  ('9618/12/M/J/26 Q4(a)','1.2.7','1.2.6')
), resolved AS (
  SELECT q.id question_id,old_lo.id old_lo_id,new_lo.id new_lo_id
  FROM corrections x
  JOIN public.questions q ON q.display_ref=x.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi paper_s ON paper_s.id=sp.syllabus_id
  JOIN public.components c ON c.id=q.component_id
  JOIN public.learning_objectives old_lo ON old_lo.code=x.old_code
  JOIN public.subtopics old_st ON old_st.id=old_lo.subtopic_id
  JOIN public.topics old_t ON old_t.id=old_st.topic_id
  JOIN public.syllabi old_s ON old_s.id=old_t.syllabus_id
  JOIN public.learning_objectives new_lo ON new_lo.code=x.new_code
  JOIN public.subtopics new_st ON new_st.id=new_lo.subtopic_id
  JOIN public.topics new_t ON new_t.id=new_st.topic_id
  JOIN public.syllabi new_s ON new_s.id=new_t.syllabus_id
  WHERE paper_s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2026
    AND sp.series='MJ'::exam_series
    AND c.number=1
    AND old_s.code='9618' AND old_s.version_label='2026-2028'
    AND new_s.code='9618' AND new_s.version_label='2026-2028'
), deleted AS (
  DELETE FROM public.question_learning_objectives qlo
  USING resolved r
  WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.old_lo_id
  RETURNING qlo.question_id
)
INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
SELECT question_id,new_lo_id,1.0 FROM resolved
ON CONFLICT(question_id,lo_id) DO UPDATE SET confidence=EXCLUDED.confidence;

-- Q5(b) contains one two's-complement item and two shift items. Keep the
-- number-system target and add the exact current shift objective.
WITH resolved AS (
  SELECT q.id question_id,lo.id lo_id
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi paper_s ON paper_s.id=sp.syllabus_id
  JOIN public.components c ON c.id=q.component_id
  JOIN public.learning_objectives lo ON lo.code='4.3.1'
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE q.display_ref='9618/12/M/J/26 Q5(b)'
    AND paper_s.code='9618' AND sp.kind='QP'::paper_kind
    AND sp.year=2026 AND sp.series='MJ'::exam_series AND c.number=1
    AND s.code='9618' AND s.version_label='2026-2028'
)
INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
SELECT question_id,lo_id,1.0 FROM resolved
ON CONFLICT(question_id,lo_id) DO UPDATE SET confidence=EXCLUDED.confidence;

-- Historical false edges. NULL new_code means remove the proven false mapping
-- without inventing a replacement target.
WITH corrections(display_ref,old_code,new_code) AS (VALUES
  ('9618/11/M/J/22 Q1(a)','1.1-lo-01',NULL::text),
  ('9618/11/M/J/23 Q3(d)(i)','1.1-lo-01',NULL::text),
  ('9618/11/O/N/21 Q1(a)','1.1-lo-01',NULL::text),
  ('9618/12/O/N/23 Q3(a)','1.1-lo-01',NULL::text),
  ('9618/11/O/N/24 Q1(a)','1.1-lo-01',NULL::text),
  ('9618/12/M/J/24 Q7(a)','1.1-lo-01',NULL::text),
  ('9618/13/M/J/24 Q1(a)','1.1-lo-01',NULL::text),
  ('9618/11/M/J/23 Q3(d)(vi)','1.1-lo-01','4.3-lo-01'),
  ('9618/12/M/J/23 Q4(d)','1.1-lo-01','4.3-lo-01'),
  ('9618/12/O/N/23 Q3(c)','1.1-lo-01','1.1-lo-03'),
  ('9618/13/O/N/22 Q9(b)','1.1-lo-01','1.1-lo-03'),
  ('9618/12/M/J/25 Q2(c)','1.1-lo-01','1.1-lo-03'),
  ('9618/11/O/N/21 Q7(a)(ii)','1.2-lo-01','1.2-lo-05'),
  ('9618/12/O/N/22 Q6(b)(ii)','1.2-lo-01','1.2-lo-05'),
  ('9618/13/M/J/23 Q3(c)(i)','1.2-lo-01','1.2-lo-04'),
  ('9618/13/O/N/22 Q1(b)','1.2-lo-01',NULL::text),
  ('9618/12/O/N/21 Q5(b)(i)','1.2-lo-01',NULL::text),
  ('9618/12/O/N/22 Q8(b)','1.2-lo-01','1.2-lo-03')
), resolved AS (
  SELECT q.id question_id,old_lo.id old_lo_id,x.new_code,sp.year
  FROM corrections x
  JOIN public.questions q ON q.display_ref=x.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi paper_s ON paper_s.id=sp.syllabus_id
  JOIN public.components c ON c.id=q.component_id
  JOIN public.learning_objectives old_lo ON old_lo.code=x.old_code
  JOIN public.subtopics old_st ON old_st.id=old_lo.subtopic_id
  JOIN public.topics old_t ON old_t.id=old_st.topic_id
  JOIN public.syllabi old_s ON old_s.id=old_t.syllabus_id
  WHERE paper_s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.year BETWEEN 2021 AND 2025
    AND c.number=1
    AND old_s.code='9618'
    AND old_s.version_label=CASE WHEN sp.year<=2023 THEN '2021-2023' ELSE '2024-2025' END
)
DELETE FROM public.question_learning_objectives qlo
USING resolved r
WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.old_lo_id;

WITH corrections(display_ref,new_code) AS (VALUES
  ('9618/11/M/J/23 Q3(d)(vi)','4.3-lo-01'),
  ('9618/12/M/J/23 Q4(d)','4.3-lo-01'),
  ('9618/12/O/N/23 Q3(c)','1.1-lo-03'),
  ('9618/13/O/N/22 Q9(b)','1.1-lo-03'),
  ('9618/12/M/J/25 Q2(c)','1.1-lo-03'),
  ('9618/11/O/N/21 Q7(a)(ii)','1.2-lo-05'),
  ('9618/12/O/N/22 Q6(b)(ii)','1.2-lo-05'),
  ('9618/13/M/J/23 Q3(c)(i)','1.2-lo-04'),
  ('9618/12/O/N/22 Q8(b)','1.2-lo-03')
), resolved AS (
  SELECT q.id question_id,new_lo.id new_lo_id
  FROM corrections x
  JOIN public.questions q ON q.display_ref=x.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi paper_s ON paper_s.id=sp.syllabus_id
  JOIN public.components c ON c.id=q.component_id
  JOIN public.learning_objectives new_lo ON new_lo.code=x.new_code
  JOIN public.subtopics new_st ON new_st.id=new_lo.subtopic_id
  JOIN public.topics new_t ON new_t.id=new_st.topic_id
  JOIN public.syllabi new_s ON new_s.id=new_t.syllabus_id
  WHERE paper_s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.year BETWEEN 2021 AND 2025
    AND c.number=1
    AND new_s.code='9618'
    AND new_s.version_label=CASE WHEN sp.year<=2023 THEN '2021-2023' ELSE '2024-2025' END
)
INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
SELECT question_id,new_lo_id,1.0 FROM resolved
ON CONFLICT(question_id,lo_id) DO UPDATE SET confidence=EXCLUDED.confidence;

DO $$
DECLARE
  v_current_new integer;
  v_current_old integer;
  v_mixed_dual integer;
  v_historical_old integer;
  v_historical_new integer;
  v_prefix_preserved integer;
  v_vector_choice_preserved integer;
BEGIN
  WITH corrections(display_ref,old_code,new_code) AS (VALUES
    ('9618/11/M/J/26 Q1(b)','1.1.7','1.1.3'),
    ('9618/12/M/J/26 Q5(a)','1.1.6','1.1.3'),
    ('9618/12/M/J/26 Q5(b)','1.1.7','1.1.2'),
    ('9618/13/M/J/26 Q6(a)','1.1.6','1.1.2'),
    ('9618/13/M/J/26 Q6(d)','1.1.3','1.1.2'),
    ('9618/11/M/J/26 Q5(a)','1.2.5','1.2.1'),
    ('9618/11/M/J/26 Q5(b)','1.2.5','1.2.4'),
    ('9618/12/M/J/26 Q1(a)','1.2.2','1.2.1'),
    ('9618/12/M/J/26 Q1(b)','1.2.3','1.2.1'),
    ('9618/12/M/J/26 Q1(c)','1.2.2','1.2.1'),
    ('9618/12/M/J/26 Q1(d)(i)','1.2.3','1.2.1'),
    ('9618/12/M/J/26 Q1(d)(ii)','1.3.1','1.3.3'),
    ('9618/12/M/J/26 Q4(a)','1.2.7','1.2.6')
  ), current_los AS (
    SELECT lo.id,lo.code
    FROM public.learning_objectives lo
    JOIN public.subtopics st ON st.id=lo.subtopic_id
    JOIN public.topics t ON t.id=st.topic_id
    JOIN public.syllabi s ON s.id=t.syllabus_id
    WHERE s.code='9618' AND s.version_label='2026-2028'
  ), resolved AS (
    SELECT q.id question_id,old_lo.id old_lo_id,new_lo.id new_lo_id
    FROM corrections x
    JOIN public.questions q ON q.display_ref=x.display_ref
    JOIN current_los old_lo ON old_lo.code=x.old_code
    JOIN current_los new_lo ON new_lo.code=x.new_code
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
  INTO v_current_new,v_current_old
  FROM resolved r;

  IF v_current_new<>13 OR v_current_old<>0 THEN
    RAISE EXCEPTION '0166 current postcondition failed: new=% old=%',v_current_new,v_current_old;
  END IF;

  SELECT count(*) INTO v_mixed_dual
  FROM public.questions q
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id AND qlo.confidence=1.0
  JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE q.display_ref='9618/12/M/J/26 Q5(b)'
    AND s.code='9618' AND s.version_label='2026-2028'
    AND lo.code IN ('1.1.2','4.3.1');

  IF v_mixed_dual<>2 THEN
    RAISE EXCEPTION '0166 mixed number-system/shift postcondition failed: rows=% expected=2',v_mixed_dual;
  END IF;

  WITH corrections(display_ref,old_code,new_code) AS (VALUES
    ('9618/11/M/J/22 Q1(a)','1.1-lo-01',NULL::text),
    ('9618/11/M/J/23 Q3(d)(i)','1.1-lo-01',NULL::text),
    ('9618/11/O/N/21 Q1(a)','1.1-lo-01',NULL::text),
    ('9618/12/O/N/23 Q3(a)','1.1-lo-01',NULL::text),
    ('9618/11/O/N/24 Q1(a)','1.1-lo-01',NULL::text),
    ('9618/12/M/J/24 Q7(a)','1.1-lo-01',NULL::text),
    ('9618/13/M/J/24 Q1(a)','1.1-lo-01',NULL::text),
    ('9618/11/M/J/23 Q3(d)(vi)','1.1-lo-01','4.3-lo-01'),
    ('9618/12/M/J/23 Q4(d)','1.1-lo-01','4.3-lo-01'),
    ('9618/12/O/N/23 Q3(c)','1.1-lo-01','1.1-lo-03'),
    ('9618/13/O/N/22 Q9(b)','1.1-lo-01','1.1-lo-03'),
    ('9618/12/M/J/25 Q2(c)','1.1-lo-01','1.1-lo-03'),
    ('9618/11/O/N/21 Q7(a)(ii)','1.2-lo-01','1.2-lo-05'),
    ('9618/12/O/N/22 Q6(b)(ii)','1.2-lo-01','1.2-lo-05'),
    ('9618/13/M/J/23 Q3(c)(i)','1.2-lo-01','1.2-lo-04'),
    ('9618/13/O/N/22 Q1(b)','1.2-lo-01',NULL::text),
    ('9618/12/O/N/21 Q5(b)(i)','1.2-lo-01',NULL::text),
    ('9618/12/O/N/22 Q8(b)','1.2-lo-01','1.2-lo-03')
  ), historical_los AS (
    SELECT lo.id,lo.code,s.version_label
    FROM public.learning_objectives lo
    JOIN public.subtopics st ON st.id=lo.subtopic_id
    JOIN public.topics t ON t.id=st.topic_id
    JOIN public.syllabi s ON s.id=t.syllabus_id
    WHERE s.code='9618' AND s.version_label IN ('2021-2023','2024-2025')
  ), resolved AS (
    SELECT q.id question_id,sp.year,old_lo.id old_lo_id,x.new_code
    FROM corrections x
    JOIN public.questions q ON q.display_ref=x.display_ref
    JOIN public.source_papers sp ON sp.id=q.source_paper_id
    JOIN historical_los old_lo ON old_lo.code=x.old_code
      AND old_lo.version_label=CASE WHEN sp.year<=2023 THEN '2021-2023' ELSE '2024-2025' END
  )
  SELECT count(*) INTO v_historical_old
  FROM resolved r
  WHERE EXISTS(
    SELECT 1 FROM public.question_learning_objectives qlo
    WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.old_lo_id
  );

  IF v_historical_old<>0 THEN
    RAISE EXCEPTION '0166 historical cleanup postcondition failed: stale_old_edges=%',v_historical_old;
  END IF;

  WITH corrections(display_ref,new_code) AS (VALUES
    ('9618/11/M/J/23 Q3(d)(vi)','4.3-lo-01'),
    ('9618/12/M/J/23 Q4(d)','4.3-lo-01'),
    ('9618/12/O/N/23 Q3(c)','1.1-lo-03'),
    ('9618/13/O/N/22 Q9(b)','1.1-lo-03'),
    ('9618/12/M/J/25 Q2(c)','1.1-lo-03'),
    ('9618/11/O/N/21 Q7(a)(ii)','1.2-lo-05'),
    ('9618/12/O/N/22 Q6(b)(ii)','1.2-lo-05'),
    ('9618/13/M/J/23 Q3(c)(i)','1.2-lo-04'),
    ('9618/12/O/N/22 Q8(b)','1.2-lo-03')
  ), historical_los AS (
    SELECT lo.id,lo.code,s.version_label
    FROM public.learning_objectives lo
    JOIN public.subtopics st ON st.id=lo.subtopic_id
    JOIN public.topics t ON t.id=st.topic_id
    JOIN public.syllabi s ON s.id=t.syllabus_id
    WHERE s.code='9618' AND s.version_label IN ('2021-2023','2024-2025')
  ), resolved AS (
    SELECT q.id question_id,new_lo.id new_lo_id
    FROM corrections x
    JOIN public.questions q ON q.display_ref=x.display_ref
    JOIN public.source_papers sp ON sp.id=q.source_paper_id
    JOIN historical_los new_lo ON new_lo.code=x.new_code
      AND new_lo.version_label=CASE WHEN sp.year<=2023 THEN '2021-2023' ELSE '2024-2025' END
  )
  SELECT count(*) INTO v_historical_new
  FROM resolved r
  WHERE EXISTS(
    SELECT 1 FROM public.question_learning_objectives qlo
    WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.new_lo_id AND qlo.confidence=1.0
  );

  IF v_historical_new<>9 THEN
    RAISE EXCEPTION '0166 historical remap postcondition failed: new=% expected=9',v_historical_new;
  END IF;

  WITH expected(display_ref) AS (VALUES
    ('9618/11/M/J/22 Q1(a)'),('9618/11/M/J/23 Q3(d)(i)'),
    ('9618/11/O/N/21 Q1(a)'),('9618/12/O/N/23 Q3(a)'),
    ('9618/11/O/N/24 Q1(a)'),('9618/12/M/J/24 Q7(a)'),
    ('9618/13/M/J/24 Q1(a)')
  )
  SELECT count(*) INTO v_prefix_preserved
  FROM expected e
  JOIN public.questions q ON q.display_ref=e.display_ref
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id
  JOIN public.learning_objectives lo ON lo.id=qlo.lo_id AND lo.code='1.1-lo-00'
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE s.code='9618'
    AND s.version_label=CASE WHEN sp.year<=2023 THEN '2021-2023' ELSE '2024-2025' END;

  IF v_prefix_preserved<>7 THEN
    RAISE EXCEPTION '0166 prefix preservation failed: rows=% expected=7',v_prefix_preserved;
  END IF;

  SELECT count(*) INTO v_vector_choice_preserved
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id
  JOIN public.learning_objectives lo ON lo.id=qlo.lo_id AND lo.code='1.2-lo-03'
  JOIN public.subtopics st ON st.id=lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE q.display_ref='9618/12/O/N/21 Q5(b)(i)'
    AND s.code='9618' AND s.version_label='2021-2023';

  IF v_vector_choice_preserved<>1 THEN
    RAISE EXCEPTION '0166 vector-choice preservation failed: rows=% expected=1',v_vector_choice_preserved;
  END IF;
END $$;
