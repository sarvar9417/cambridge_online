-- 9618-lesson-checkpoint-coverage.sql
-- Every exact historical LO used by the source-faithful Hodder Chapter 1 and
-- Chapter 13 lesson checkpoints must resolve to at least one approved 2021-2025
-- past-paper question. Hodder-only extension parts intentionally use the
-- explicit no-exact-question state and are not listed here.

DO $$
DECLARE
  v_missing integer;
BEGIN
  WITH required(code) AS (
    VALUES
      ('1.1-lo-01'),('1.1-lo-02'),('1.1-lo-03'),('1.1-lo-04'),('1.1-lo-05'),
      ('1.2-lo-01'),('1.2-lo-02'),('1.2-lo-03'),('1.2-lo-04'),('1.2-lo-05'),
      ('1.3-lo-01'),('1.3-lo-02'),('1.3-lo-03'),('1.3-lo-04'),
      ('13.1-lo-01'),('13.1-lo-02'),('13.1-lo-03'),('13.1-lo-04'),
      ('13.2-lo-01'),('13.2-lo-02'),('13.2-lo-03'),('13.2-lo-04'),
      ('13.3-lo-01'),('13.3-lo-02'),('13.3-lo-03'),('13.3-lo-04'),('13.3-lo-05')
  ), coverage AS (
    SELECT r.code,count(distinct q.id)::int question_count
    FROM required r
    LEFT JOIN learning_objectives lo ON lo.code=r.code
    LEFT JOIN subtopics st ON st.id=lo.subtopic_id
    LEFT JOIN topics t ON t.id=st.topic_id
    LEFT JOIN syllabi sy ON sy.id=t.syllabus_id
      AND sy.code='9618'
      AND sy.version_label IN ('2021-2023','2024-2025')
    LEFT JOIN question_learning_objectives qlo ON qlo.lo_id=lo.id
    LEFT JOIN questions q ON q.id=qlo.question_id
      AND q.status='approved'
      AND q.marks IS NOT NULL
    LEFT JOIN source_papers sp ON sp.id=q.source_paper_id
      AND sp.kind='QP'
      AND sp.year BETWEEN 2021 AND 2025
    GROUP BY r.code
  )
  SELECT count(*) INTO v_missing FROM coverage WHERE question_count=0;

  IF v_missing<>0 THEN
    RAISE EXCEPTION '9618 exact lesson checkpoint coverage has % LO(s) with zero approved 2021-2025 questions',v_missing;
  END IF;
END $$;

WITH required(code) AS (
  VALUES
    ('1.1-lo-01'),('1.1-lo-02'),('1.1-lo-03'),('1.1-lo-04'),('1.1-lo-05'),
    ('1.2-lo-01'),('1.2-lo-02'),('1.2-lo-03'),('1.2-lo-04'),('1.2-lo-05'),
    ('1.3-lo-01'),('1.3-lo-02'),('1.3-lo-03'),('1.3-lo-04'),
    ('13.1-lo-01'),('13.1-lo-02'),('13.1-lo-03'),('13.1-lo-04'),
    ('13.2-lo-01'),('13.2-lo-02'),('13.2-lo-03'),('13.2-lo-04'),
    ('13.3-lo-01'),('13.3-lo-02'),('13.3-lo-03'),('13.3-lo-04'),('13.3-lo-05')
)
SELECT r.code,count(distinct q.id)::int approved_questions,
       min(sp.year)::int min_year,max(sp.year)::int max_year
FROM required r
LEFT JOIN learning_objectives lo ON lo.code=r.code
LEFT JOIN subtopics st ON st.id=lo.subtopic_id
LEFT JOIN topics t ON t.id=st.topic_id
LEFT JOIN syllabi sy ON sy.id=t.syllabus_id
  AND sy.code='9618'
  AND sy.version_label IN ('2021-2023','2024-2025')
LEFT JOIN question_learning_objectives qlo ON qlo.lo_id=lo.id
LEFT JOIN questions q ON q.id=qlo.question_id
  AND q.status='approved'
  AND q.marks IS NOT NULL
LEFT JOIN source_papers sp ON sp.id=q.source_paper_id
  AND sp.kind='QP'
  AND sp.year BETWEEN 2021 AND 2025
GROUP BY r.code
ORDER BY split_part(r.code,'-',1),r.code;
