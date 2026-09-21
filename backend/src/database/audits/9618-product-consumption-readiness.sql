-- Cambridge 9618 product-consumption readiness.
-- Read-only. Separates canonical corpus integrity from the three teacher-facing
-- consumption paths: Question Bank, generated documents, and Live Challenge.

WITH RECURSIVE current_syllabus AS (
  SELECT id
  FROM syllabi
  WHERE code='9618' AND is_active
  ORDER BY valid_from DESC
  LIMIT 1
), leaves AS (
  SELECT q.id,q.parent_id,q.source_paper_id,q.display_ref,q.marks,q.content_json,q.content_version,
         q.body_format,q.stem_latex
  FROM questions q
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN syllabi sy ON sy.id=sp.syllabus_id
  WHERE sy.code='9618'
    AND sp.kind='QP'
    AND sp.year BETWEEN 2021 AND 2026
    AND sp.variant BETWEEN 1 AND 3
    AND q.marks IS NOT NULL
    AND q.status='approved'
), chain AS (
  SELECT l.id leaf_id,l.id node_id,l.parent_id
  FROM leaves l
  UNION ALL
  SELECT c.leaf_id,p.id,p.parent_id
  FROM chain c
  JOIN questions p ON p.id=c.parent_id
), asset_refs AS (
  SELECT l.id leaf_id,l.source_paper_id leaf_source_paper_id,
         (b.block->>'assetId')::uuid asset_id
  FROM leaves l
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(l.content_json->'blocks','[]'::jsonb)) b(block)
  WHERE b.block->>'type'='asset' AND b.block ? 'assetId'
), asset_health AS (
  SELECT r.leaf_id,r.leaf_source_paper_id,r.asset_id,qa.question_id owner_question_id,
         owner.source_paper_id owner_source_paper_id,
         EXISTS(
           SELECT 1 FROM chain c
           WHERE c.leaf_id=r.leaf_id AND c.node_id=qa.question_id
         ) owner_in_ancestry,
         (
           nullif(btrim(coalesce(qa.svg_markup,qa.content_md,'')),'') IS NOT NULL
           OR nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
         ) renderable
  FROM asset_refs r
  LEFT JOIN question_assets qa ON qa.id=r.asset_id
  LEFT JOIN questions owner ON owner.id=qa.question_id
), explicit_current_mapping AS (
  SELECT DISTINCT l.id question_id
  FROM leaves l
  JOIN question_learning_objectives qlo ON qlo.question_id=l.id
  JOIN learning_objectives lo ON lo.id=qlo.lo_id
  JOIN subtopics st ON st.id=lo.subtopic_id
  JOIN topics t ON t.id=st.topic_id
  WHERE t.syllabus_id=(SELECT id FROM current_syllabus)

  UNION

  SELECT DISTINCT l.id
  FROM leaves l
  JOIN question_learning_objectives qlo ON qlo.question_id=l.id
  JOIN learning_objective_compatibility compat
    ON compat.source_lo_id=qlo.lo_id
   AND compat.relation IN ('equivalent','subtopic_compatible')
  JOIN learning_objectives target_lo ON target_lo.id=compat.target_lo_id
  JOIN subtopics target_st ON target_st.id=target_lo.subtopic_id
  JOIN topics target_t ON target_t.id=target_st.topic_id
  WHERE target_t.syllabus_id=(SELECT id FROM current_syllabus)
), stable_subtopic_mapping AS (
  SELECT DISTINCT l.id question_id
  FROM leaves l
  JOIN question_subtopics qst
    ON qst.question_id=l.id
   AND qst.is_primary
   AND coalesce(qst.confidence,0)>=0.95
  JOIN subtopics source_st ON source_st.id=qst.subtopic_id
  JOIN topics source_t ON source_t.id=source_st.topic_id
  JOIN topics target_t
    ON target_t.syllabus_id=(SELECT id FROM current_syllabus)
   AND target_t.number=source_t.number
  JOIN subtopics target_st
    ON target_st.topic_id=target_t.id
   AND target_st.code=source_st.code
), ms_health AS (
  SELECT l.id,
         (cms.id IS NOT NULL AND cms.status='approved' AND cms.max_marks=l.marks) canonical_ready
  FROM leaves l
  LEFT JOIN canonical_mark_schemes cms ON cms.question_id=l.id
), dependency_health AS (
  SELECT l.id question_id,
         bool_and(qd.question_id IS NULL OR (
           target.id IS NOT NULL
           AND target.status='approved'
           AND target.marks IS NOT NULL
           AND EXISTS(
             SELECT 1
             FROM canonical_mark_schemes target_ms
             WHERE target_ms.question_id=target.id
               AND target_ms.status='approved'
               AND target_ms.max_marks=target.marks
           )
         )) dependencies_ready
  FROM leaves l
  LEFT JOIN question_dependencies qd
    ON qd.question_id=l.id
   AND qd.strength::text='required'
  LEFT JOIN questions target ON target.id=qd.depends_on_id
  GROUP BY l.id
), live_ready AS (
  SELECT l.id
  FROM leaves l
  JOIN ms_health ms ON ms.id=l.id AND ms.canonical_ready
  JOIN dependency_health dh ON dh.question_id=l.id AND dh.dependencies_ready
  WHERE EXISTS(SELECT 1 FROM explicit_current_mapping e WHERE e.question_id=l.id)
     OR EXISTS(SELECT 1 FROM stable_subtopic_mapping s WHERE s.question_id=l.id)
)
SELECT
  (SELECT count(*) FROM leaves) approved_scoring_leaves,
  (SELECT count(*) FROM leaves
     WHERE stem_latex IS NULL OR body_format<>'latex') question_bank_latex_blockers,
  (SELECT count(*) FROM leaves
     WHERE content_json IS NULL OR content_version<>1) structured_content_blockers,
  (SELECT count(*) FROM ms_health
     WHERE NOT canonical_ready) canonical_mark_scheme_blockers,
  (SELECT count(*) FROM asset_health
     WHERE owner_question_id IS NULL
        OR owner_source_paper_id IS DISTINCT FROM leaf_source_paper_id
        OR NOT renderable) export_asset_blockers,
  (SELECT count(*) FROM asset_health
     WHERE owner_question_id IS NOT NULL
       AND NOT owner_in_ancestry
       AND owner_source_paper_id=leaf_source_paper_id
       AND renderable) sibling_asset_refs_resolved_by_portable_loader,
  (SELECT count(DISTINCT leaf_id) FROM asset_health
     WHERE owner_question_id IS NOT NULL
       AND NOT owner_in_ancestry
       AND owner_source_paper_id=leaf_source_paper_id
       AND renderable) leaves_using_sibling_asset_resolution,
  (SELECT count(*) FROM leaves
     WHERE parent_id IS NULL) live_root_scoring_leaves,
  (SELECT count(DISTINCT l.id)
     FROM leaves l
     JOIN question_dependencies qd ON qd.question_id=l.id
     WHERE qd.strength::text='required') live_dependency_leaves,
  (SELECT count(*) FROM dependency_health
     WHERE NOT dependencies_ready) live_dependency_blockers,
  (SELECT count(*) FROM explicit_current_mapping) live_explicit_current_lo_questions,
  (SELECT count(*) FROM stable_subtopic_mapping s
     WHERE NOT EXISTS(
       SELECT 1 FROM explicit_current_mapping e WHERE e.question_id=s.question_id
     )) live_stable_subtopic_fallback_questions,
  (SELECT count(*) FROM leaves l
     WHERE NOT EXISTS(
       SELECT 1 FROM explicit_current_mapping e WHERE e.question_id=l.id
     )
       AND NOT EXISTS(
         SELECT 1 FROM stable_subtopic_mapping s WHERE s.question_id=l.id
       )) live_analytics_mapping_blockers,
  (SELECT count(*) FROM live_ready) live_structural_ready_questions;
