-- Reconcile the final 9618 pre-deploy corpus contracts after canonical source-occurrence
-- identity and source-fidelity hardening were materialized in 0144-0153.
--
-- This migration deliberately does not weaken source trust:
--   * historical 1.1-lo-00 is attached to its own historical Paper 1 component and
--     explicitly mapped to the text-identical 2026-2028 objective 1.1.1;
--   * 2025 explicit answer/program dependencies are rebuilt by the deterministic,
--     source-scoped reconciler introduced in 0132;
--   * every expected postcondition is proved before the migration can complete.

-- Historical 1.1-lo-00 was present in the syllabus catalog but omitted from the
-- historical component-learning-objective join table. The objective is plainly a
-- Paper 1 Information Representation objective in both historical versions.
INSERT INTO public.component_learning_objectives(component_id,learning_objective_id)
SELECT c.id,lo.id
FROM public.syllabi s
JOIN public.components c ON c.syllabus_id=s.id AND c.number=1
JOIN public.topics t ON t.syllabus_id=s.id AND t.number=1
JOIN public.subtopics st ON st.topic_id=t.id AND st.code='1.1'
JOIN public.learning_objectives lo ON lo.subtopic_id=st.id AND lo.code='1.1-lo-00'
WHERE s.code='9618' AND s.version_label IN ('2021-2023','2024-2025')
ON CONFLICT(component_id,learning_objective_id) DO NOTHING;

-- The historical objective text is identical to current 1.1.1. Preserve the
-- historical question identity while giving current-target Lesson Studio/practice
-- an explicit reviewed compatibility edge rather than relying on text similarity.
INSERT INTO public.learning_objective_compatibility(target_lo_id,source_lo_id,relation,evidence)
SELECT target_lo.id,source_lo.id,'equivalent',
       'predeploy-0154: Historical 1.1-lo-00 is text-identical to current 1.1.1 (binary magnitudes and binary-versus-decimal prefixes).'
FROM public.learning_objectives target_lo
JOIN public.subtopics target_st ON target_st.id=target_lo.subtopic_id AND target_st.code='1.1'
JOIN public.topics target_t ON target_t.id=target_st.topic_id
JOIN public.syllabi target_s ON target_s.id=target_t.syllabus_id
  AND target_s.code='9618' AND target_s.version_label='2026-2028'
JOIN public.learning_objectives source_lo ON source_lo.code='1.1-lo-00'
JOIN public.subtopics source_st ON source_st.id=source_lo.subtopic_id AND source_st.code='1.1'
JOIN public.topics source_t ON source_t.id=source_st.topic_id
JOIN public.syllabi source_s ON source_s.id=source_t.syllabus_id
  AND source_s.code='9618' AND source_s.version_label IN ('2021-2023','2024-2025')
WHERE target_lo.code='1.1.1'
  AND target_lo.text=source_lo.text
ON CONFLICT(target_lo_id,source_lo_id) DO UPDATE
SET relation=EXCLUDED.relation,evidence=EXCLUDED.evidence;

-- Canonicalization changed physical question ownership but retained every official
-- source occurrence. Re-run the deterministic source reconciler for 2025 so explicit
-- "answer to part ..." and Paper 4 test/screenshot dependencies point at the current
-- canonical question IDs. The function is idempotent and fail-closed on unresolved
-- source wording.
SELECT public.reconcile_source_question_dependencies_v1('9618',2025);

DO $$
DECLARE
  v_component_edges integer;
  v_compatibility_edges integer;
  v_missing_answer integer;
  v_missing_practical integer;
BEGIN
  SELECT count(*) INTO v_component_edges
  FROM public.syllabi s
  JOIN public.components c ON c.syllabus_id=s.id AND c.number=1
  JOIN public.component_learning_objectives clo ON clo.component_id=c.id
  JOIN public.learning_objectives lo ON lo.id=clo.learning_objective_id
  JOIN public.subtopics st ON st.id=lo.subtopic_id AND st.code='1.1'
  WHERE s.code='9618'
    AND s.version_label IN ('2021-2023','2024-2025')
    AND lo.code='1.1-lo-00';

  SELECT count(*) INTO v_compatibility_edges
  FROM public.learning_objective_compatibility lc
  JOIN public.learning_objectives source_lo ON source_lo.id=lc.source_lo_id
  JOIN public.subtopics source_st ON source_st.id=source_lo.subtopic_id
  JOIN public.topics source_t ON source_t.id=source_st.topic_id
  JOIN public.syllabi source_s ON source_s.id=source_t.syllabus_id
  JOIN public.learning_objectives target_lo ON target_lo.id=lc.target_lo_id
  JOIN public.subtopics target_st ON target_st.id=target_lo.subtopic_id
  JOIN public.topics target_t ON target_t.id=target_st.topic_id
  JOIN public.syllabi target_s ON target_s.id=target_t.syllabus_id
  WHERE source_s.code='9618'
    AND source_s.version_label IN ('2021-2023','2024-2025')
    AND source_st.code='1.1'
    AND source_lo.code='1.1-lo-00'
    AND target_s.code='9618'
    AND target_s.version_label='2026-2028'
    AND target_st.code='1.1'
    AND target_lo.code='1.1.1'
    AND lc.relation='equivalent';

  SELECT count(*) INTO v_missing_answer
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.source_url IS NOT NULL
    AND sp.year=2025
    AND q.marks>0
    AND q.stem_md ~* '((your|the) answer (to|from|for) part|use your answer (from|to|for) part|using your answer (from|to|for) part)'
    AND NOT EXISTS(
      SELECT 1 FROM public.question_dependencies qd
      WHERE qd.question_id=q.id AND qd.kind='answer_ref' AND qd.strength='required'
    );

  SELECT count(*) INTO v_missing_practical
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=q.component_id
  WHERE s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.source_url IS NOT NULL
    AND sp.year=2025
    AND c.number=4
    AND q.marks>0
    AND q.stem_md ~* 'test (your|the) program|test the program|take (a|one or more) screenshots?|screenshot.*output'
    AND NOT EXISTS(
      SELECT 1 FROM public.question_dependencies qd
      WHERE qd.question_id=q.id AND qd.kind='answer_ref' AND qd.strength='required'
    );

  IF v_component_edges<>2 OR v_compatibility_edges<>2
     OR v_missing_answer<>0 OR v_missing_practical<>0 THEN
    RAISE EXCEPTION
      'predeploy 9618 reconciliation failed component_edges=% compatibility_edges=% missing_answer=% missing_practical=%',
      v_component_edges,v_compatibility_edges,v_missing_answer,v_missing_practical;
  END IF;
END $$;
