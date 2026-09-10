-- Map the source-backed Chapter 3 primary-memory lesson targets to the
-- materially equivalent historical 9618 objectives used by approved 2021-2025
-- past-paper questions. The 2026 corpus can match the current targets directly.
--
-- This migration is intentionally narrow: only the three objectives explicitly
-- covered by the implemented Hodder pp.70-72 memory-family batch are mapped.

WITH curated(target_code,source_code,relation,rationale) AS (
  VALUES
    ('3.1.5','3.1-lo-03','equivalent','RAM versus ROM differences are retained without a material change in assessed scope.'),
    ('3.1.6','3.1-lo-04','equivalent','SRAM versus DRAM differences are retained without a material change in assessed scope.'),
    ('3.1.7','3.1-lo-05','equivalent','PROM, EPROM and EEPROM differences are retained without a material change in assessed scope.')
), resolved AS (
  SELECT target_lo.id AS target_lo_id,
         source_lo.id AS source_lo_id,
         c.relation,
         'chapter3-memory-compatibility-0163: ' || c.rationale AS evidence
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
ON CONFLICT (target_lo_id,source_lo_id) DO UPDATE
SET relation=EXCLUDED.relation,evidence=EXCLUDED.evidence;

-- Fail closed if taxonomy drift means the intended three-by-two compatibility
-- graph was not created. Each current target must resolve to the matching
-- historical objective in both 2021-2023 and 2024-2025 syllabus identities.
DO $$
DECLARE
  v_edges int;
  v_targets int;
BEGIN
  SELECT count(*), count(DISTINCT target_lo.code)
  INTO v_edges, v_targets
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
    AND target_st.code='3.1'
    AND ((target_lo.code='3.1.5' AND source_lo.code='3.1-lo-03')
      OR (target_lo.code='3.1.6' AND source_lo.code='3.1-lo-04')
      OR (target_lo.code='3.1.7' AND source_lo.code='3.1-lo-05'))
    AND source_s.code='9618' AND source_s.version_label IN ('2021-2023','2024-2025')
    AND source_st.code='3.1'
    AND c.relation='equivalent';

  IF v_edges<>6 OR v_targets<>3 THEN
    RAISE EXCEPTION 'Chapter 3 memory LO compatibility incomplete: edges=% targets=% expected_edges=6 expected_targets=3',
      v_edges, v_targets;
  END IF;
END $$;
