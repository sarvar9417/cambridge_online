-- Restore the quantum-cryptography guidance that appears in the official
-- 2021-2023 and 2024-2025 Cambridge 9618 syllabuses under 17.1.
--
-- This is intentionally historical-only. The 2026 canonical syllabus no
-- longer carries this guidance, so do not add it to the 2026 catalog.

WITH target_subtopics AS (
  SELECT st.id AS subtopic_id
  FROM syllabi s
  JOIN topics t ON t.syllabus_id = s.id
  JOIN subtopics st ON st.topic_id = t.id
  WHERE s.code = '9618'
    AND s.version_label IN ('2021-2023', '2024-2025')
    AND st.code = '17.1'
)
INSERT INTO learning_objectives (subtopic_id, code, text, sort_order)
SELECT
  subtopic_id,
  '17.1-lo-05',
  'Explain the purpose, benefits and drawbacks of quantum cryptography.',
  5
FROM target_subtopics
ON CONFLICT (subtopic_id, code) DO UPDATE
SET text = EXCLUDED.text,
    sort_order = EXCLUDED.sort_order;

INSERT INTO component_learning_objectives (component_id, learning_objective_id)
SELECT c.id, lo.id
FROM syllabi s
JOIN components c
  ON c.syllabus_id = s.id
 AND c.number = 3
JOIN topics t
  ON t.syllabus_id = s.id
JOIN subtopics st
  ON st.topic_id = t.id
 AND st.code = '17.1'
JOIN learning_objectives lo
  ON lo.subtopic_id = st.id
 AND lo.code = '17.1-lo-05'
WHERE s.code = '9618'
  AND s.version_label IN ('2021-2023', '2024-2025')
  AND EXISTS (
    SELECT 1
    FROM component_topics ct
    WHERE ct.component_id = c.id
      AND ct.topic_id = t.id
  )
ON CONFLICT DO NOTHING;
