CREATE TABLE component_learning_objectives (
  component_id uuid NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  learning_objective_id uuid NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (component_id, learning_objective_id)
);

CREATE INDEX component_learning_objectives_lo_idx
  ON component_learning_objectives(learning_objective_id, component_id);

-- Existing databases predate explicit LO/component coverage. Preserve the
-- historical broad topic mapping as a compatibility baseline. Catalog imports
-- can write more precise mappings for new syllabus versions.
INSERT INTO component_learning_objectives(component_id, learning_objective_id)
SELECT ct.component_id, lo.id
FROM component_topics ct
JOIN subtopics st ON st.topic_id = ct.topic_id
JOIN learning_objectives lo ON lo.subtopic_id = st.id
ON CONFLICT (component_id, learning_objective_id) DO NOTHING;
