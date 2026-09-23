-- 9618 visual-fidelity closure audit.
-- Structural renderability is not a pass. Closure is keyed to exact
-- paper-specific question occurrences and renderer targets, not just asset rows.

WITH canonical_qp AS (
  SELECT sp.id
  FROM source_papers sp
  JOIN syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618'
    AND sp.kind='QP'
    AND sp.year BETWEEN 2021 AND 2026
    AND sp.variant IN (1,2,3)
    AND (
      (sp.year BETWEEN 2021 AND 2025 AND sp.series IN ('MJ','ON'))
      OR (sp.year=2026 AND sp.series='MJ')
    )
),
canonical_occurrences AS (
  SELECT
    qso.id source_occurrence_id,
    qso.source_paper_id,
    qso.question_id,
    qso.display_ref,
    qso.is_primary,
    q.marks,
    q.content_json
  FROM question_source_occurrences qso
  JOIN canonical_qp cp ON cp.id=qso.source_paper_id
  JOIN questions q ON q.id=qso.question_id
),
scoring_leaf_occurrences AS (
  SELECT co.*
  FROM canonical_occurrences co
  WHERE co.marks IS NOT NULL
    AND co.marks > 0
    AND NOT EXISTS (
      SELECT 1
      FROM questions child
      WHERE child.parent_id=co.question_id
    )
),
question_targets AS (
  SELECT
    slo.source_occurrence_id,
    slo.source_paper_id,
    slo.question_id,
    NULL::uuid asset_id,
    'question'::text target_kind,
    'question'::text target_key,
    NULL::integer block_index,
    NULL::text block_type
  FROM scoring_leaf_occurrences slo
),
structured_targets AS (
  SELECT
    co.source_occurrence_id,
    co.source_paper_id,
    co.question_id,
    CASE
      WHEN block->>'type'='asset'
       AND block->>'assetId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (block->>'assetId')::uuid
      ELSE NULL::uuid
    END asset_id,
    'structured_block'::text target_kind,
    ('block:' || (ordinality - 1)::text)::text target_key,
    (ordinality - 1)::integer block_index,
    block->>'type' block_type
  FROM canonical_occurrences co
  CROSS JOIN LATERAL jsonb_array_elements(
    coalesce(co.content_json->'blocks','[]'::jsonb)
  ) WITH ORDINALITY AS source_block(block,ordinality)
  WHERE block->>'type' IN ('table','asset','code','matching','math','answer_area')
),
render_targets AS (
  SELECT * FROM question_targets
  UNION ALL
  SELECT * FROM structured_targets
),
required_surfaces(surface) AS (
  VALUES
    ('question_bank_desktop'::text),
    ('question_bank_mobile'::text),
    ('pdf'::text),
    ('docx'::text),
    ('live_student'::text),
    ('live_teacher'::text)
),
required_evidence AS (
  SELECT rt.*,rs.surface
  FROM render_targets rt
  CROSS JOIN required_surfaces rs
),
latest AS (
  SELECT *
  FROM visual_fidelity_latest_evidence
)
SELECT
  (SELECT count(*) FROM canonical_qp) AS canonical_qp_count,
  (SELECT count(*) FROM canonical_occurrences) AS question_occurrence_count,
  (SELECT count(*) FROM scoring_leaf_occurrences) AS scoring_leaf_occurrence_count,
  (SELECT count(*) FROM question_targets) AS question_target_count,
  (SELECT count(*) FROM structured_targets) AS structured_visual_target_count,
  (SELECT count(*) FROM render_targets) AS render_target_count,
  (SELECT count(*) FROM required_evidence) AS required_surface_evidence_rows,
  count(*) FILTER (WHERE latest.id IS NULL) AS missing_surface_evidence,
  count(*) FILTER (WHERE latest.classification='VF-5') AS unresolved_vf5,
  count(*) FILTER (WHERE latest.classification='VF-4') AS broken_vf4,
  count(*) FILTER (WHERE latest.classification='VF-3') AS fidelity_defect_vf3,
  count(*) FILTER (WHERE latest.classification='VF-2') AS needs_polish_vf2,
  count(*) FILTER (WHERE latest.classification IN ('VF-0','VF-1')) AS proven_vf0_vf1,
  count(*) FILTER (
    WHERE latest.classification IN ('VF-0','VF-1','VF-2','VF-3','VF-4')
      AND (latest.rendered_sha256 IS NULL OR latest.evidence_path IS NULL)
  ) AS invalid_proof_rows
FROM required_evidence req
LEFT JOIN latest
  ON latest.source_paper_id=req.source_paper_id
 AND latest.source_occurrence_id=req.source_occurrence_id
 AND latest.target_key=req.target_key
 AND latest.surface=req.surface;

-- Active renderer closure must return zero rows here.
WITH canonical_qp AS (
  SELECT sp.id
  FROM source_papers sp
  JOIN syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618'
    AND sp.kind='QP'
    AND sp.year BETWEEN 2021 AND 2026
    AND sp.variant IN (1,2,3)
    AND (
      (sp.year BETWEEN 2021 AND 2025 AND sp.series IN ('MJ','ON'))
      OR (sp.year=2026 AND sp.series='MJ')
    )
),
canonical_occurrences AS (
  SELECT
    qso.id source_occurrence_id,
    qso.source_paper_id,
    qso.question_id,
    qso.display_ref,
    qso.is_primary,
    q.marks,
    q.content_json
  FROM question_source_occurrences qso
  JOIN canonical_qp cp ON cp.id=qso.source_paper_id
  JOIN questions q ON q.id=qso.question_id
),
render_targets AS (
  SELECT
    co.source_occurrence_id,
    co.source_paper_id,
    co.question_id,
    NULL::uuid asset_id,
    'question'::text target_kind,
    'question'::text target_key,
    NULL::integer block_index,
    NULL::text block_type
  FROM canonical_occurrences co
  WHERE co.marks IS NOT NULL
    AND co.marks > 0
    AND NOT EXISTS (
      SELECT 1 FROM questions child WHERE child.parent_id=co.question_id
    )
  UNION ALL
  SELECT
    co.source_occurrence_id,
    co.source_paper_id,
    co.question_id,
    CASE
      WHEN block->>'type'='asset'
       AND block->>'assetId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (block->>'assetId')::uuid
      ELSE NULL::uuid
    END,
    'structured_block'::text,
    ('block:' || (ordinality - 1)::text)::text,
    (ordinality - 1)::integer,
    block->>'type'
  FROM canonical_occurrences co
  CROSS JOIN LATERAL jsonb_array_elements(
    coalesce(co.content_json->'blocks','[]'::jsonb)
  ) WITH ORDINALITY AS source_block(block,ordinality)
  WHERE block->>'type' IN ('table','asset','code','matching','math','answer_area')
),
required_surfaces(surface) AS (
  VALUES
    ('question_bank_desktop'::text),
    ('question_bank_mobile'::text),
    ('pdf'::text),
    ('docx'::text),
    ('live_student'::text),
    ('live_teacher'::text)
),
required_evidence AS (
  SELECT rt.*,rs.surface
  FROM render_targets rt
  CROSS JOIN required_surfaces rs
)
SELECT
  req.source_paper_id,
  req.source_occurrence_id,
  req.question_id,
  req.asset_id,
  req.target_kind,
  req.target_key,
  req.block_index,
  req.block_type,
  req.surface,
  latest.classification,
  latest.evidence_path,
  latest.verified_at
FROM required_evidence req
LEFT JOIN visual_fidelity_latest_evidence latest
  ON latest.source_paper_id=req.source_paper_id
 AND latest.source_occurrence_id=req.source_occurrence_id
 AND latest.target_key=req.target_key
 AND latest.surface=req.surface
WHERE latest.id IS NULL
   OR latest.classification IN ('VF-3','VF-4','VF-5')
   OR (
     latest.classification IN ('VF-0','VF-1','VF-2')
     AND (latest.rendered_sha256 IS NULL OR latest.evidence_path IS NULL)
   )
ORDER BY
  req.source_paper_id,
  req.source_occurrence_id,
  req.target_key,
  req.surface;

-- Equivalent/non-primary occurrences must receive occurrence-specific source
-- geometry/provenance before any VF-0/VF-1 may be accepted. This query is a
-- deliberate fail-closed inventory for that remaining mapping work.
WITH canonical_qp AS (
  SELECT sp.id
  FROM source_papers sp
  JOIN syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618'
    AND sp.kind='QP'
    AND sp.year BETWEEN 2021 AND 2026
    AND sp.variant IN (1,2,3)
    AND (
      (sp.year BETWEEN 2021 AND 2025 AND sp.series IN ('MJ','ON'))
      OR (sp.year=2026 AND sp.series='MJ')
    )
)
SELECT
  qso.id source_occurrence_id,
  qso.source_paper_id,
  qso.question_id,
  qso.display_ref,
  qso.equivalence_basis,
  'occurrence_specific_source_mapping_required'::text blocker
FROM question_source_occurrences qso
JOIN canonical_qp cp ON cp.id=qso.source_paper_id
WHERE NOT qso.is_primary
ORDER BY qso.source_paper_id,qso.display_ref;

-- Dormant/companion asset intent must also be reconciled. A row remains here
-- until the asset is referenced, removed/archived by a source-backed repair, or
-- a future explicit supporting-asset disposition is introduced. Do not silently
-- exclude these rows from the final visual-fidelity verdict.
WITH canonical_qp AS (
  SELECT sp.id
  FROM source_papers sp
  JOIN syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618'
    AND sp.kind='QP'
    AND sp.year BETWEEN 2021 AND 2026
    AND sp.variant IN (1,2,3)
    AND (
      (sp.year BETWEEN 2021 AND 2025 AND sp.series IN ('MJ','ON'))
      OR (sp.year=2026 AND sp.series='MJ')
    )
),
referenced_assets AS (
  SELECT DISTINCT (block->>'assetId')::uuid asset_id
  FROM questions q
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) block
  WHERE block->>'type'='asset'
    AND block->>'assetId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
)
SELECT
  qso.source_paper_id,
  qso.id source_occurrence_id,
  qso.question_id,
  qa.id asset_id,
  qso.display_ref,
  qa.kind,
  qa.source_page,
  qa.source_bbox,
  'dormant_or_companion_intent_unreconciled'::text blocker
FROM question_source_occurrences qso
JOIN canonical_qp cp ON cp.id=qso.source_paper_id
JOIN question_assets qa ON qa.question_id=qso.question_id
LEFT JOIN referenced_assets ra ON ra.asset_id=qa.id
WHERE ra.asset_id IS NULL
ORDER BY qso.source_paper_id,qso.display_ref,qa.sort_order,qa.id;
