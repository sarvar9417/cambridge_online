-- Blocking semantic taxonomy audit for source-backed 9618 corrections.
-- Run after the structural corpus completion audit.
-- It intentionally checks narrow semantic invariants with low false-positive risk.

DO $$
DECLARE
  v_count integer;
BEGIN
  -- AS-level leaves explicitly asking about Artificial Intelligence belong to
  -- historical 7.1 Ethics and Ownership, not 6.1 Data Security.
  SELECT count(*) INTO v_count
  FROM questions q
  JOIN source_papers sp ON sp.id = q.source_paper_id AND sp.kind = 'QP'
  JOIN syllabi sy ON sy.id = sp.syllabus_id AND sy.code = '9618'
  JOIN components c ON c.id = q.component_id AND c.number IN (1,2)
  JOIN question_subtopics qs ON qs.question_id = q.id AND qs.is_primary
  JOIN subtopics st ON st.id = qs.subtopic_id
  WHERE sp.year BETWEEN 2021 AND 2025
    AND q.marks > 0
    AND q.stem_md ~* 'Artificial Intelligence|\mAI\M'
    AND st.code <> '7.1';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'semantic taxonomy audit: % AS AI leaves are not primary 7.1', v_count;
  END IF;

  -- Curated exact-reference LO invariants. These are backed by syllabus wording
  -- or by exact duplicate Cambridge items in another variant.
  WITH expected(display_ref, subtopic_code, lo_code) AS (VALUES
    ('9618/12/M/J/21 Q2(b)',       '7.1',  '7.1-lo-05'),
    ('9618/12/M/J/22 Q8',          '7.1',  '7.1-lo-05'),
    ('9618/12/O/N/22 Q9',          '7.1',  '7.1-lo-06'),
    ('9618/13/O/N/22 Q8(b)',       '7.1',  '7.1-lo-06'),
    ('9618/11/M/J/23 Q4(c)',       '7.1',  '7.1-lo-05'),
    ('9618/12/M/J/23 Q7(d)',       '7.1',  '7.1-lo-05'),
    ('9618/13/M/J/23 Q3(b)',       '7.1',  '7.1-lo-05'),
    ('9618/11/M/J/24 Q5(c)(ii)',   '7.1',  '7.1-lo-05'),
    ('9618/11/O/N/24 Q6',          '7.1',  '7.1-lo-05'),
    ('9618/11/M/J/25 Q4(a)',       '7.1',  '7.1-lo-05'),
    ('9618/12/O/N/21 Q1',          '6.1',  '6.1-lo-01'),
    ('9618/23/M/J/22 Q2',          '12.3', '12.3-lo-07'),
    ('9618/13/M/J/21 Q5(c)',       '3.1',  '3.1-lo-10'),
    ('9618/13/O/N/24 Q3',          '3.1',  '3.1-lo-10'),
    ('9618/33/O/N/22 Q12(b)(i)',   '19.1', '19.1-lo-10'),
    ('9618/33/O/N/22 Q12(b)(ii)',  '19.1', '19.1-lo-10'),
    ('9618/33/O/N/22 Q6(a)',       '17.1', '17.1-lo-02'),
    ('9618/31/O/N/22 Q10(a)',      '15.1', '15.1-lo-01'),
    ('9618/33/O/N/22 Q10(a)',      '15.1', '15.1-lo-01')
  ), matched AS (
    SELECT e.display_ref
    FROM expected e
    JOIN questions q ON q.display_ref = e.display_ref
    JOIN question_subtopics qs ON qs.question_id = q.id AND qs.is_primary
    JOIN subtopics st ON st.id = qs.subtopic_id AND st.code = e.subtopic_code
    JOIN question_learning_objectives qlo ON qlo.question_id = q.id
    JOIN learning_objectives lo ON lo.id = qlo.lo_id AND lo.code = e.lo_code
    GROUP BY e.display_ref
  )
  SELECT 19 - count(*) INTO v_count FROM matched;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'semantic taxonomy audit: % curated exact-reference mappings do not match', v_count;
  END IF;

  -- Exact repeated Big-O leaves across O/N/22 variants must agree on the Big-O LO.
  SELECT count(*) INTO v_count
  FROM questions q
  JOIN question_learning_objectives qlo ON qlo.question_id = q.id
  JOIN learning_objectives lo ON lo.id = qlo.lo_id
  WHERE q.display_ref IN ('9618/31/O/N/22 Q12(b)(i)','9618/31/O/N/22 Q12(b)(ii)',
                          '9618/33/O/N/22 Q12(b)(i)','9618/33/O/N/22 Q12(b)(ii)')
    AND lo.code <> '19.1-lo-10';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'semantic taxonomy audit: Big-O duplicate variants disagree with 19.1-lo-10';
  END IF;

  RAISE NOTICE 'PASS: 9618 semantic taxonomy source audit';
END $$;
