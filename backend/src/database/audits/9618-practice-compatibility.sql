-- Read-only audit for current-syllabus personalized practice backed by the
-- historical source-faithful Cambridge 9618 corpus.
--
-- Compatibility coverage and integrity are release invariants. Practice
-- readiness is measured separately because approved question supply and online
-- renderability can legitimately leave a mapped subtopic below five questions.
-- Textual/Markdown assets are online-portable; storage-only assets still fail
-- closed because the attempt payload cannot safely embed their binary content.

DO $$
DECLARE
  bad_scope int;
  bad_versions int;
  historical_quantum int;
  mapped_subtopics int;
  ready_subtopics int;
BEGIN
  SELECT count(*) INTO bad_scope
  FROM public.learning_objective_compatibility c
  JOIN public.learning_objectives target_lo ON target_lo.id=c.target_lo_id
  JOIN public.subtopics target_st ON target_st.id=target_lo.subtopic_id
  JOIN public.topics target_t ON target_t.id=target_st.topic_id
  JOIN public.syllabi target_s ON target_s.id=target_t.syllabus_id
  JOIN public.learning_objectives source_lo ON source_lo.id=c.source_lo_id
  JOIN public.subtopics source_st ON source_st.id=source_lo.subtopic_id
  JOIN public.topics source_t ON source_t.id=source_st.topic_id
  JOIN public.syllabi source_s ON source_s.id=source_t.syllabus_id
  WHERE c.relation IN ('equivalent','subtopic_compatible')
    AND (
      target_s.code<>source_s.code
      OR target_t.number<>source_t.number
      OR target_st.code<>source_st.code
    );

  SELECT count(*) INTO bad_versions
  FROM public.learning_objective_compatibility c
  JOIN public.learning_objectives target_lo ON target_lo.id=c.target_lo_id
  JOIN public.subtopics target_st ON target_st.id=target_lo.subtopic_id
  JOIN public.topics target_t ON target_t.id=target_st.topic_id
  JOIN public.syllabi target_s ON target_s.id=target_t.syllabus_id
  JOIN public.learning_objectives source_lo ON source_lo.id=c.source_lo_id
  JOIN public.subtopics source_st ON source_st.id=source_lo.subtopic_id
  JOIN public.topics source_t ON source_t.id=source_st.topic_id
  JOIN public.syllabi source_s ON source_s.id=source_t.syllabus_id
  WHERE c.relation IN ('equivalent','subtopic_compatible')
    AND (
      target_s.code<>'9618'
      OR target_s.version_label<>'2026-2028'
      OR source_s.version_label NOT IN ('2021-2023','2024-2025')
    );

  SELECT count(*) INTO historical_quantum
  FROM public.learning_objective_compatibility c
  JOIN public.learning_objectives source_lo ON source_lo.id=c.source_lo_id
  WHERE c.relation IN ('equivalent','subtopic_compatible')
    AND lower(source_lo.text) LIKE '%quantum cryptograph%';

  SELECT count(DISTINCT target_lo.subtopic_id) INTO mapped_subtopics
  FROM public.learning_objective_compatibility c
  JOIN public.learning_objectives target_lo ON target_lo.id=c.target_lo_id
  JOIN public.subtopics st ON st.id=target_lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE s.code='9618' AND s.version_label='2026-2028'
    AND c.relation IN ('equivalent','subtopic_compatible');

  WITH current_subtopics AS (
    SELECT st.id
    FROM public.subtopics st
    JOIN public.topics t ON t.id=st.topic_id
    JOIN public.syllabi s ON s.id=t.syllabus_id
    WHERE s.code='9618' AND s.version_label='2026-2028'
  ), eligible AS (
    SELECT DISTINCT target_lo.subtopic_id,q.id question_id
    FROM public.learning_objective_compatibility compat
    JOIN public.learning_objectives target_lo ON target_lo.id=compat.target_lo_id
    JOIN public.question_learning_objectives qlo ON qlo.lo_id=compat.source_lo_id
    JOIN public.questions q ON q.id=qlo.question_id
    JOIN public.mark_schemes ms ON ms.question_id=q.id AND ms.status='approved'
    JOIN public.components source_component ON source_component.id=q.component_id
    WHERE compat.relation IN ('equivalent','subtopic_compatible')
      AND q.status='approved' AND q.parent_id IS NOT NULL AND q.marks IS NOT NULL
      AND q.answer_kind NOT IN ('diagram','image')
      AND NOT EXISTS (SELECT 1 FROM public.question_dependencies dep WHERE dep.question_id=q.id)
      AND NOT EXISTS (
        WITH RECURSIVE context_chain AS (
          SELECT q.id,q.parent_id
          UNION ALL
          SELECT parent.id,parent.parent_id FROM public.questions parent JOIN context_chain chain ON parent.id=chain.parent_id
        )
        SELECT 1
        FROM context_chain chain
        JOIN public.question_assets asset ON asset.question_id=chain.id
        WHERE asset.storage_path IS NOT NULL
          AND nullif(btrim(coalesce(asset.content_md,'')),'') IS NULL
      )
      AND EXISTS (
        SELECT 1 FROM public.component_learning_objectives tc
        JOIN public.components target_component ON target_component.id=tc.component_id
        WHERE tc.learning_objective_id=target_lo.id AND target_component.number=source_component.number
      )
  ), coverage AS (
    SELECT cs.id,count(DISTINCT e.question_id)::int eligible_questions
    FROM current_subtopics cs LEFT JOIN eligible e ON e.subtopic_id=cs.id
    GROUP BY cs.id
  )
  SELECT count(*) FILTER (WHERE eligible_questions>=5)::int INTO ready_subtopics FROM coverage;

  IF bad_scope<>0 OR bad_versions<>0 OR historical_quantum<>0 OR mapped_subtopics<>44 OR ready_subtopics<39 THEN
    RAISE EXCEPTION
      '9618 practice compatibility audit failed bad_scope=% bad_versions=% historical_quantum=% mapped_subtopics=% ready_subtopics=%',
      bad_scope,bad_versions,historical_quantum,mapped_subtopics,ready_subtopics;
  END IF;
END $$;

WITH current_subtopics AS (
  SELECT st.id, st.code, st.title
  FROM public.subtopics st
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE s.code='9618' AND s.version_label='2026-2028'
), eligible AS (
  SELECT DISTINCT target_lo.subtopic_id, q.id question_id
  FROM public.learning_objective_compatibility compat
  JOIN public.learning_objectives target_lo ON target_lo.id=compat.target_lo_id
  JOIN public.question_learning_objectives qlo ON qlo.lo_id=compat.source_lo_id
  JOIN public.questions q ON q.id=qlo.question_id
  JOIN public.mark_schemes ms ON ms.question_id=q.id AND ms.status='approved'
  JOIN public.components source_component ON source_component.id=q.component_id
  WHERE compat.relation IN ('equivalent','subtopic_compatible')
    AND q.status='approved'
    AND q.parent_id IS NOT NULL
    AND q.marks IS NOT NULL
    AND q.answer_kind NOT IN ('diagram','image')
    AND NOT EXISTS (SELECT 1 FROM public.question_dependencies dep WHERE dep.question_id=q.id)
    AND NOT EXISTS (
      WITH RECURSIVE context_chain AS (
        SELECT q.id,q.parent_id
        UNION ALL
        SELECT parent.id,parent.parent_id FROM public.questions parent JOIN context_chain chain ON parent.id=chain.parent_id
      )
      SELECT 1
      FROM context_chain chain
      JOIN public.question_assets asset ON asset.question_id=chain.id
      WHERE asset.storage_path IS NOT NULL
        AND nullif(btrim(coalesce(asset.content_md,'')),'') IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.component_learning_objectives tc
      JOIN public.components target_component ON target_component.id=tc.component_id
      WHERE tc.learning_objective_id=target_lo.id AND target_component.number=source_component.number
    )
), coverage AS (
  SELECT cs.code,cs.title,count(DISTINCT e.question_id)::int eligible_questions
  FROM current_subtopics cs LEFT JOIN eligible e ON e.subtopic_id=cs.id
  GROUP BY cs.id,cs.code,cs.title
)
SELECT code,title,eligible_questions,(eligible_questions>=5) practice_ready
FROM coverage
ORDER BY string_to_array(code,'.')::int[];
