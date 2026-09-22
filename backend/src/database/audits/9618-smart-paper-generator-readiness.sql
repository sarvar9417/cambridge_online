-- Cambridge 9618 Smart Paper Generator readiness.
-- Read-only release gate for automatic Question Bank paper generation.
--
-- Expected current production state (2026-09-22):
--   approved scoring leaves: 2773
--   generator-ready leaves: 2773
--   LaTeX blockers: 0
--   structured-content blockers: 0
--   canonical mark-scheme blockers: 0
--   dependency blockers: 0

WITH leaves AS (
  SELECT q.id,q.parent_id,q.source_paper_id,q.marks,q.status,q.body_format,
         q.stem_latex,q.content_json,q.content_version
  FROM questions q
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN syllabi sy ON sy.id=sp.syllabus_id
  WHERE sy.code='9618'
    AND sp.kind='QP'
    AND sp.year BETWEEN 2021 AND 2026
    AND sp.variant BETWEEN 1 AND 3
    AND q.marks IS NOT NULL
), approved AS (
  SELECT *
  FROM leaves
  WHERE status='approved'
), generator_ready AS (
  SELECT a.id
  FROM approved a
  WHERE a.body_format='latex'
    AND nullif(btrim(coalesce(a.stem_latex,'')),'') IS NOT NULL
    AND a.content_json IS NOT NULL
    AND a.content_version=1
    AND EXISTS(
      SELECT 1
      FROM canonical_mark_schemes cms
      WHERE cms.question_id=a.id
        AND cms.status='approved'
        AND cms.max_marks=a.marks
    )
), dependency_health AS (
  SELECT qd.question_id,qd.depends_on_id,
         target.id IS NOT NULL target_exists,
         target.status='approved' target_approved,
         target.marks IS NOT NULL target_scoring,
         EXISTS(
           SELECT 1
           FROM canonical_mark_schemes cms
           WHERE cms.question_id=target.id
             AND cms.status='approved'
             AND cms.max_marks=target.marks
         ) target_ms_ready
  FROM question_dependencies qd
  JOIN approved source ON source.id=qd.question_id
  LEFT JOIN questions target ON target.id=qd.depends_on_id
), roots AS (
  WITH RECURSIVE chain AS (
    SELECT a.id leaf_id,a.id node_id,a.parent_id,0 hops
    FROM approved a
    UNION ALL
    SELECT c.leaf_id,p.id,p.parent_id,c.hops+1
    FROM chain c
    JOIN questions p ON p.id=c.parent_id
  )
  SELECT DISTINCT ON (leaf_id) leaf_id,node_id root_id
  FROM chain
  ORDER BY leaf_id,hops DESC,node_id
)
SELECT
  (SELECT count(*) FROM leaves) scoring_leaves,
  (SELECT count(*) FROM approved) approved_scoring_leaves,
  (SELECT count(*) FROM generator_ready) generator_ready_leaves,
  (SELECT count(*) FROM approved
    WHERE body_format<>'latex'
       OR nullif(btrim(coalesce(stem_latex,'')),'') IS NULL) latex_blockers,
  (SELECT count(*) FROM approved
    WHERE content_json IS NULL OR content_version<>1) structured_blockers,
  (SELECT count(*) FROM approved a
    WHERE NOT EXISTS(
      SELECT 1 FROM canonical_mark_schemes cms
      WHERE cms.question_id=a.id
        AND cms.status='approved'
        AND cms.max_marks=a.marks
    )) canonical_ms_blockers,
  (SELECT count(*) FROM dependency_health) dependency_edges,
  (SELECT count(*) FROM dependency_health
    WHERE NOT target_exists OR NOT target_approved OR NOT target_scoring OR NOT target_ms_ready)
      dependency_blockers,
  (SELECT count(DISTINCT root_id) FROM roots) root_families,
  (SELECT count(*) FROM approved a
    WHERE NOT EXISTS(
      SELECT 1 FROM question_subtopics qs
      WHERE qs.question_id=a.id AND qs.is_primary
    )) missing_primary_subtopic,
  (SELECT count(*) FROM approved a
    WHERE NOT EXISTS(
      SELECT 1 FROM question_learning_objectives qlo
      WHERE qlo.question_id=a.id
    )) missing_learning_objective;
