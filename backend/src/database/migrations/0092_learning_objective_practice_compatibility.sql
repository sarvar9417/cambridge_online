-- Safe runtime compatibility between the active 2026-2028 syllabus and the
-- source-faithful 2021-2025 question corpus.
--
-- Historical question taxonomy is never rewritten to current syllabus UUIDs.
-- Practice selection may cross syllabus versions only through an explicit row
-- in this table. The initial seed is deliberately conservative: it accepts
-- only official LO statements whose normalized wording is identical inside the
-- same qualification/topic/subtopic. Broader semantic mappings require a
-- separate source-backed reviewed migration.

CREATE TABLE IF NOT EXISTS public.learning_objective_compatibility (
  target_lo_id uuid NOT NULL REFERENCES public.learning_objectives(id) ON DELETE CASCADE,
  source_lo_id uuid NOT NULL REFERENCES public.learning_objectives(id) ON DELETE CASCADE,
  relation text NOT NULL CHECK (relation IN ('equivalent', 'excluded')),
  evidence text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (target_lo_id, source_lo_id),
  CHECK (target_lo_id <> source_lo_id)
);

CREATE INDEX IF NOT EXISTS learning_objective_compatibility_source_idx
  ON public.learning_objective_compatibility(source_lo_id, target_lo_id)
  WHERE relation = 'equivalent';

ALTER TABLE public.learning_objective_compatibility ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.learning_objective_compatibility FROM anon, authenticated;

WITH current_los AS (
  SELECT lo.id, lo.text, st.code AS subtopic_code, t.number AS topic_number,
         s.code AS syllabus_code
  FROM public.learning_objectives lo
  JOIN public.subtopics st ON st.id = lo.subtopic_id
  JOIN public.topics t ON t.id = st.topic_id
  JOIN public.syllabi s ON s.id = t.syllabus_id
  WHERE s.code = '9618' AND s.version_label = '2026-2028'
), historical_los AS (
  SELECT lo.id, lo.text, st.code AS subtopic_code, t.number AS topic_number,
         s.code AS syllabus_code, s.version_label
  FROM public.learning_objectives lo
  JOIN public.subtopics st ON st.id = lo.subtopic_id
  JOIN public.topics t ON t.id = st.topic_id
  JOIN public.syllabi s ON s.id = t.syllabus_id
  WHERE s.code = '9618' AND s.version_label IN ('2021-2023', '2024-2025')
), exact_equivalents AS (
  SELECT current_los.id AS target_lo_id,
         historical_los.id AS source_lo_id,
         historical_los.version_label
  FROM current_los
  JOIN historical_los
    ON historical_los.syllabus_code = current_los.syllabus_code
   AND historical_los.topic_number = current_los.topic_number
   AND historical_los.subtopic_code = current_los.subtopic_code
   AND regexp_replace(lower(historical_los.text), '[^a-z0-9]+', '', 'g')
       = regexp_replace(lower(current_los.text), '[^a-z0-9]+', '', 'g')
)
INSERT INTO public.learning_objective_compatibility(
  target_lo_id, source_lo_id, relation, evidence
)
SELECT target_lo_id,
       source_lo_id,
       'equivalent',
       'Exact normalized official 9618 learning-objective wording match; source syllabus ' || version_label
FROM exact_equivalents
ON CONFLICT (target_lo_id, source_lo_id) DO UPDATE SET
  relation = EXCLUDED.relation,
  evidence = EXCLUDED.evidence;
