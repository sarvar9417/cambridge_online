-- Cambridge IGCSE Computer Science 0478, Paper 2 ONLY.
-- Read-only production audit: source pairing, leaf marks, classification review,
-- mark schemes, structured content and obvious PDF-margin contamination.
-- Run in the Supabase SQL editor. This file never mutates data.
-- "ready_for_manual_source_review" is NOT "ready for Live Challenge".

WITH qp AS (
  SELECT sp.id AS qp_id, sp.syllabus_id, sp.component_id,
         sp.year, sp.series, sp.variant, sp.source_url AS qp_url,
         c.total_marks
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id = sp.syllabus_id
  JOIN public.components c ON c.id = sp.component_id
  WHERE s.code = '0478' AND c.number = 2 AND sp.kind = 'QP'
),
per_paper AS (
  SELECT qp.year, qp.series, qp.variant, qp.qp_id, qp.qp_url,
         qp.total_marks AS expected_marks, ms.id AS ms_id,
         ms.source_url AS ms_url,
         COALESCE(a.question_nodes, 0) AS question_nodes,
         COALESCE(a.leaves, 0) AS leaves,
         COALESCE(a.leaf_marks, 0) AS leaf_marks,
         COALESCE(a.needs_review, 0) AS needs_review,
         COALESCE(a.missing_leaf_text, 0) AS missing_leaf_text,
         COALESCE(a.pdf_margin_spill, 0) AS pdf_margin_spill,
         COALESCE(a.unstructured, 0) AS unstructured,
         COALESCE(a.without_mark_scheme, 0) AS without_mark_scheme,
         COALESCE(a.without_primary_subtopic, 0) AS without_primary_subtopic,
         COALESCE(a.without_learning_objective, 0) AS without_learning_objective,
         COALESCE(a.visual_or_table_leaves, 0) AS visual_or_table_leaves,
         COALESCE(a.visual_or_table_without_direct_asset, 0) AS visual_or_table_without_direct_asset
  FROM qp
  LEFT JOIN public.source_papers ms
    ON ms.kind='MS'
   AND ms.syllabus_id=qp.syllabus_id AND ms.component_id=qp.component_id
   AND ms.year=qp.year AND ms.series=qp.series AND ms.variant=qp.variant
  LEFT JOIN LATERAL (
    SELECT
      count(*) AS question_nodes,
      count(*) FILTER (WHERE q.marks>0) AS leaves,
      COALESCE(sum(q.marks) FILTER (WHERE q.marks>0),0) AS leaf_marks,
      count(*) FILTER (WHERE q.marks>0 AND q.status::text='needs_review') AS needs_review,
      count(*) FILTER (WHERE q.marks>0 AND length(trim(COALESCE(q.stem_md,'')))<8) AS missing_leaf_text,
      count(*) FILTER (WHERE q.marks>0 AND (
        upper(COALESCE(q.stem_md,'')) LIKE '%DO NOT WRITE IN THIS MARGIN%'
        OR COALESCE(q.stem_md,'') LIKE '%'||chr(65533)||'%'
      )) AS pdf_margin_spill,
      count(*) FILTER (WHERE q.marks>0 AND q.content_json IS NULL) AS unstructured,
      count(*) FILTER (WHERE q.marks>0 AND NOT EXISTS (
        SELECT 1 FROM public.mark_schemes m WHERE m.question_id=q.id
      )) AS without_mark_scheme,
      count(*) FILTER (WHERE q.marks>0 AND NOT EXISTS (
        SELECT 1 FROM public.question_subtopics qs WHERE qs.question_id=q.id AND qs.is_primary
      )) AS without_primary_subtopic,
      count(*) FILTER (WHERE q.marks>0 AND NOT EXISTS (
        SELECT 1 FROM public.question_learning_objectives qlo WHERE qlo.question_id=q.id
      )) AS without_learning_objective,
      count(*) FILTER (WHERE q.marks>0 AND q.answer_kind::text IN ('diagram','table')) AS visual_or_table_leaves,
      count(*) FILTER (WHERE q.marks>0 AND q.answer_kind::text IN ('diagram','table') AND NOT EXISTS (
        SELECT 1 FROM public.question_assets qa WHERE qa.question_id=q.id
      )) AS visual_or_table_without_direct_asset
    FROM public.questions q
    WHERE q.source_paper_id=qp.qp_id
  ) a ON true
)
SELECT year, series, variant, qp_id, qp_url, ms_url,
       expected_marks, question_nodes, leaves, leaf_marks,
       needs_review, missing_leaf_text, pdf_margin_spill, unstructured,
       without_mark_scheme, without_primary_subtopic,
       without_learning_objective, visual_or_table_leaves,
       visual_or_table_without_direct_asset,
       CASE
         WHEN ms_id IS NULL OR ms_url IS NULL OR qp_url IS NULL THEN 'SOURCE_PAIR_MISSING'
         WHEN leaves=0 THEN 'NOT_INGESTED'
         WHEN leaf_marks<>expected_marks THEN 'MARKS_MISMATCH'
         WHEN needs_review>0 OR missing_leaf_text>0 OR pdf_margin_spill>0
           OR unstructured>0 OR without_mark_scheme>0
           OR without_primary_subtopic>0 OR without_learning_objective>0
           THEN 'NEEDS_SOURCE_REPAIR'
         ELSE 'READY_FOR_MANUAL_SOURCE_REVIEW'
       END AS audit_state
FROM per_paper
ORDER BY year, series, variant;
