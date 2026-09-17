-- 9618 generated-paper export readiness audit.
-- Read-only. The zero-valued columns are release gates for Question Bank -> PDF/DOCX.

WITH RECURSIVE leaves AS (
  SELECT q.id,q.parent_id,q.source_paper_id,q.display_ref,q.marks,q.content_json
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  WHERE q.status='approved'
    AND q.marks IS NOT NULL
    AND q.display_ref LIKE '9618/%'
    AND sp.kind='QP'
), chain AS (
  SELECT l.id leaf_id,l.id node_id,l.parent_id
  FROM leaves l
  UNION ALL
  SELECT c.leaf_id,p.id,p.parent_id
  FROM chain c
  JOIN public.questions p ON p.id=c.parent_id
), asset_refs AS (
  SELECT l.id leaf_id,l.source_paper_id leaf_source_paper_id,
         (b.block->>'assetId')::uuid asset_id
  FROM leaves l
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(l.content_json->'blocks','[]'::jsonb)) b(block)
  WHERE b.block->>'type'='asset' AND b.block ? 'assetId'
), asset_health AS (
  SELECT r.leaf_id,r.asset_id,qa.question_id owner_question_id,
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
  LEFT JOIN public.question_assets qa ON qa.id=r.asset_id
  LEFT JOIN public.questions owner ON owner.id=qa.question_id
), ms_health AS (
  SELECT l.id question_id,l.marks question_marks,cms.id mark_scheme_id,
         cms.status::text scheme_status,cms.max_marks,
         count(msp.id)::int point_count
  FROM leaves l
  LEFT JOIN public.canonical_mark_schemes cms ON cms.question_id=l.id
  LEFT JOIN public.mark_scheme_points msp ON msp.mark_scheme_id=cms.id
  GROUP BY l.id,l.marks,cms.id,cms.status,cms.max_marks
), dependency_health AS (
  SELECT qd.question_id,qd.depends_on_id,qd.kind,qd.strength,
         target.id IS NOT NULL target_exists,
         target.status::text target_status
  FROM public.question_dependencies qd
  JOIN leaves l ON l.id=qd.question_id
  LEFT JOIN public.questions target ON target.id=qd.depends_on_id
)
SELECT
  (SELECT count(*) FROM leaves) approved_scoring_leaves,
  (SELECT count(*) FROM leaves WHERE content_json IS NULL) missing_content_json,
  (SELECT count(*) FROM leaves WHERE lower(coalesce(content_json::text,'')) LIKE '%papacambridge%'
     OR lower(coalesce(content_json::text,'')) LIKE '%trace id: pc-%'
     OR lower(coalesce(content_json::text,'')) LIKE '%re-uploading, mirroring or re-hosting%'
     OR lower(coalesce(content_json::text,'')) LIKE '%licensed for hosting on papacambridge.com only%') structured_source_host_contamination,
  (SELECT count(*) FROM asset_refs) structured_asset_refs,
  (SELECT count(*) FROM asset_health WHERE owner_question_id IS NULL) missing_asset_rows,
  (SELECT count(*) FROM asset_health WHERE owner_question_id IS NOT NULL AND owner_source_paper_id IS DISTINCT FROM (SELECT l.source_paper_id FROM leaves l WHERE l.id=asset_health.leaf_id)) cross_source_asset_refs,
  (SELECT count(*) FROM asset_health WHERE NOT renderable) unrenderable_asset_refs,
  (SELECT count(*) FROM asset_health WHERE owner_question_id IS NOT NULL AND NOT owner_in_ancestry) referenced_assets_requiring_portable_closure,
  (SELECT count(DISTINCT leaf_id) FROM asset_health WHERE owner_question_id IS NOT NULL AND NOT owner_in_ancestry) leaves_requiring_portable_closure,
  (SELECT count(*) FROM ms_health WHERE mark_scheme_id IS NULL) missing_canonical_mark_scheme,
  (SELECT count(*) FROM ms_health WHERE scheme_status IS DISTINCT FROM 'approved') nonapproved_canonical_mark_scheme,
  (SELECT count(*) FROM ms_health WHERE max_marks IS DISTINCT FROM question_marks) mark_total_mismatch,
  (SELECT count(*) FROM ms_health WHERE point_count=0) canonical_mark_scheme_without_points,
  (SELECT count(*) FROM dependency_health WHERE NOT target_exists) missing_dependency_targets,
  (SELECT count(*) FROM dependency_health WHERE strength::text='required' AND target_status NOT IN ('approved','needs_review')) unavailable_required_dependency_targets;
