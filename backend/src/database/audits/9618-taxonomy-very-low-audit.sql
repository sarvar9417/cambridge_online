-- Blocking audit after 0096: every supplied 2021-2025 9618 leaf with a primary
-- taxonomy confidence below 0.72 has been manually source-reviewed.

DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM questions q
  JOIN source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
  JOIN syllabi sy ON sy.id=sp.syllabus_id AND sy.code='9618'
  JOIN question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  WHERE sp.year BETWEEN 2021 AND 2025 AND q.marks>0 AND qs.confidence<0.72;
  IF v_count<>0 THEN
    RAISE EXCEPTION 'taxonomy review audit: % primary mappings remain below 0.72',v_count;
  END IF;

  WITH expected(display_ref,subtopic_code,lo_code) AS (VALUES
    ('9618/22/M/J/21 Q4','9.2','9.2-lo-02'),
    ('9618/21/O/N/22 Q3','9.2','9.2-lo-02'),
    ('9618/22/O/N/22 Q5','11.2','11.2-lo-01'),
    ('9618/23/O/N/22 Q3','9.2','9.2-lo-02'),
    ('9618/21/M/J/21 Q5','11.3','11.3-lo-01'),
    ('9618/23/M/J/21 Q5','11.3','11.3-lo-01'),
    ('9618/21/O/N/22 Q5','11.3','11.3-lo-01'),
    ('9618/21/M/J/23 Q6','11.3','11.3-lo-01'),
    ('9618/21/O/N/24 Q2','11.3','11.3-lo-01')
  ), matched AS (
    SELECT e.display_ref
    FROM expected e
    JOIN questions q ON q.display_ref=e.display_ref
    JOIN question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
    JOIN subtopics st ON st.id=qs.subtopic_id AND st.code=e.subtopic_code
    JOIN question_learning_objectives qlo ON qlo.question_id=q.id
    JOIN learning_objectives lo ON lo.id=qlo.lo_id AND lo.code=e.lo_code
    GROUP BY e.display_ref
  )
  SELECT 9-count(*) INTO v_count FROM matched;
  IF v_count<>0 THEN
    RAISE EXCEPTION 'taxonomy review audit: % corrected very-low mappings do not match',v_count;
  END IF;

  RAISE NOTICE 'PASS: 9618 very-low taxonomy audit';
END $$;
