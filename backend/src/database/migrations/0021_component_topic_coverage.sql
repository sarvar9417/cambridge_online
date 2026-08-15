CREATE TABLE component_topics (
  component_id uuid NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (component_id, topic_id)
);

CREATE INDEX component_topics_topic_idx ON component_topics(topic_id, component_id);

-- Preserve every existing single-component topic assignment as the primary
-- compatibility mapping.
INSERT INTO component_topics(component_id, topic_id, is_primary)
SELECT component_id, id, true
FROM topics
WHERE component_id IS NOT NULL
ON CONFLICT (component_id, topic_id) DO UPDATE SET is_primary = true;

-- Cambridge 9618 Paper 3 assesses sections 13-20 while Paper 4 also assesses
-- practical application of sections 19-20. Existing seeds historically mapped
-- topics 19/20 only to Paper 4, so backfill both A2 component relationships.
INSERT INTO component_topics(component_id, topic_id, is_primary)
SELECT c.id, t.id, (c.number = 3)
FROM topics t
JOIN syllabi s ON s.id = t.syllabus_id AND s.code = '9618'
JOIN components c ON c.syllabus_id = t.syllabus_id AND c.number IN (3, 4)
WHERE t.number IN (19, 20)
ON CONFLICT (component_id, topic_id) DO UPDATE
SET is_primary = EXCLUDED.is_primary;

-- Keep the legacy FK deterministic for compatibility. It is no longer the
-- complete coverage model; component_topics is authoritative for coverage.
UPDATE topics t
SET component_id = c.id,
    level = 'A2'
FROM syllabi s
JOIN components c ON c.syllabus_id = s.id AND c.number = 3
WHERE t.syllabus_id = s.id
  AND s.code = '9618'
  AND t.number IN (19, 20);
