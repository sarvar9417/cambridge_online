-- 9618 visual-fidelity closure audit.
-- Structural renderability is not a pass: this audit requires durable evidence
-- for every active paper-specific visual occurrence and every mandatory surface.

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
),
asset_occurrences AS (
  SELECT
    qso.source_paper_id,
    qso.question_id,
    qa.id asset_id,
    qa.source_page,
    qa.source_bbox,
    (ra.asset_id IS NOT NULL) is_active
  FROM question_source_occurrences qso
  JOIN canonical_qp cp ON cp.id=qso.source_paper_id
  JOIN question_assets qa ON qa.question_id=qso.question_id
  LEFT JOIN referenced_assets ra ON ra.asset_id=qa.id
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
  SELECT ao.source_paper_id,ao.question_id,ao.asset_id,rs.surface
  FROM asset_occurrences ao
  CROSS JOIN required_surfaces rs
  WHERE ao.is_active
),
latest AS (
  SELECT *
  FROM visual_fidelity_latest_evidence
)
SELECT
  (SELECT count(*) FROM canonical_qp) AS canonical_qp_count,
  (SELECT count(*) FROM asset_occurrences) AS paper_specific_asset_occurrences,
  (SELECT count(*) FROM asset_occurrences WHERE is_active) AS active_asset_occurrences,
  (SELECT count(*) FROM asset_occurrences WHERE NOT is_active) AS dormant_asset_occurrences,
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
 AND latest.question_id=req.question_id
 AND latest.asset_id=req.asset_id
 AND latest.surface=req.surface;

-- Active-surface closure must return zero rows here.
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
  SELECT qso.source_paper_id,qso.question_id,qa.id asset_id,rs.surface
  FROM question_source_occurrences qso
  JOIN canonical_qp cp ON cp.id=qso.source_paper_id
  JOIN question_assets qa ON qa.question_id=qso.question_id
  JOIN referenced_assets ra ON ra.asset_id=qa.id
  CROSS JOIN required_surfaces rs
)
SELECT
  req.source_paper_id,
  req.question_id,
  req.asset_id,
  req.surface,
  latest.classification,
  latest.evidence_path,
  latest.verified_at
FROM required_evidence req
LEFT JOIN visual_fidelity_latest_evidence latest
  ON latest.source_paper_id=req.source_paper_id
 AND latest.question_id=req.question_id
 AND latest.asset_id=req.asset_id
 AND latest.surface=req.surface
WHERE latest.id IS NULL
   OR latest.classification IN ('VF-3','VF-4','VF-5')
   OR (
     latest.classification IN ('VF-0','VF-1','VF-2')
     AND (latest.rendered_sha256 IS NULL OR latest.evidence_path IS NULL)
   )
ORDER BY req.source_paper_id,req.question_id,req.asset_id,req.surface;

-- Dormant/companion intent closure must also return zero rows.
-- A row remains here until the asset is either referenced by canonical structured
-- content, removed/archived by a source-backed repair, or represented by a future
-- explicit supporting-asset disposition. Do not silently exclude these rows from
-- the final visual-fidelity verdict.
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
  qso.question_id,
  qa.id asset_id,
  qso.display_ref,
  qa.kind,
  qa.source_page,
  qa.source_bbox,
  'dormant_intent_unreconciled'::text blocker
FROM question_source_occurrences qso
JOIN canonical_qp cp ON cp.id=qso.source_paper_id
JOIN question_assets qa ON qa.question_id=qso.question_id
LEFT JOIN referenced_assets ra ON ra.asset_id=qa.id
WHERE ra.asset_id IS NULL
ORDER BY qso.source_paper_id,qso.display_ref,qa.sort_order,qa.id;
