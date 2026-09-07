-- Canonical live release audit for the current Cambridge 9618 target.
--
-- Scope is intentionally narrow: 2026, official source-backed variants 1..3.
-- Historical 2021-2025 rows remain useful corpus content, but they are not
-- silently treated as having passed the stricter 2026 source-verified gate.
--
-- This script is read-only apart from raising on failed gates.

DO $$
DECLARE
  verified jsonb;
  qp_count integer;
  ms_count integer;
  leaf_count integer;
  blocked_count integer;
  broken_pairs integer;
BEGIN
  SELECT public.assert_source_verified_year_v1('9618', 2026) INTO verified;
  IF coalesce((verified->>'verified')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION '9618 current release gate did not return verified=true: %', verified;
  END IF;

  SELECT count(*) INTO qp_count
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618' AND sp.year=2026
    AND sp.kind='QP'::paper_kind AND sp.variant BETWEEN 1 AND 3
    AND sp.source_url IS NOT NULL;

  SELECT count(*) INTO ms_count
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618' AND sp.year=2026
    AND sp.kind='MS'::paper_kind AND sp.variant BETWEEN 1 AND 3
    AND sp.source_url IS NOT NULL;

  SELECT count(*) INTO leaf_count
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618' AND sp.year=2026
    AND sp.kind='QP'::paper_kind AND sp.variant BETWEEN 1 AND 3
    AND sp.source_url IS NOT NULL AND q.marks IS NOT NULL;

  SELECT count(*) INTO blocked_count
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618' AND sp.year=2026
    AND sp.kind='QP'::paper_kind AND sp.variant BETWEEN 1 AND 3
    AND sp.source_url IS NOT NULL AND q.marks IS NOT NULL
    AND q.status<>'approved'::review_status;

  WITH qp AS (
    SELECT sp.id,sp.series,sp.component_id,sp.variant,sp.sha256
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    WHERE s.code='9618' AND sp.year=2026
      AND sp.kind='QP'::paper_kind AND sp.variant BETWEEN 1 AND 3
      AND sp.source_url IS NOT NULL
  ), ms AS (
    SELECT sp.id,sp.series,sp.component_id,sp.variant,sp.sha256
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    WHERE s.code='9618' AND sp.year=2026
      AND sp.kind='MS'::paper_kind AND sp.variant BETWEEN 1 AND 3
      AND sp.source_url IS NOT NULL
  )
  SELECT count(*) INTO broken_pairs
  FROM qp
  LEFT JOIN ms ON ms.series=qp.series
              AND ms.component_id=qp.component_id
              AND ms.variant=qp.variant
  WHERE ms.id IS NULL
     OR lower(coalesce(qp.sha256,'')) !~ '^[0-9a-f]{64}$'
     OR lower(coalesce(ms.sha256,'')) !~ '^[0-9a-f]{64}$';

  IF qp_count<>12 OR ms_count<>12 OR blocked_count<>0 OR broken_pairs<>0 THEN
    RAISE EXCEPTION
      '9618 current release audit failed qp=% ms=% blocked=% broken_pairs=%',
      qp_count,ms_count,blocked_count,broken_pairs;
  END IF;

  IF leaf_count<=0 THEN
    RAISE EXCEPTION '9618 current release audit found no mark-bearing leaves';
  END IF;
END $$;

-- Machine-readable summary for PROJECT-STATE / release evidence.
WITH official_qp AS (
  SELECT sp.id
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618' AND sp.year=2026
    AND sp.kind='QP'::paper_kind AND sp.variant BETWEEN 1 AND 3
    AND sp.source_url IS NOT NULL
), official_ms AS (
  SELECT sp.id
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618' AND sp.year=2026
    AND sp.kind='MS'::paper_kind AND sp.variant BETWEEN 1 AND 3
    AND sp.source_url IS NOT NULL
), leaves AS (
  SELECT q.id,q.status
  FROM public.questions q
  JOIN official_qp qp ON qp.id=q.source_paper_id
  WHERE q.marks IS NOT NULL
), historical AS (
  SELECT
    count(*) FILTER (WHERE sp.kind='QP'::paper_kind) AS qp_papers,
    count(*) FILTER (WHERE sp.kind='MS'::paper_kind) AS ms_papers
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618' AND sp.year BETWEEN 2021 AND 2026
    AND sp.variant BETWEEN 1 AND 3 AND sp.source_url IS NOT NULL
), historical_leaves AS (
  SELECT count(*) AS leaves
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618' AND sp.year BETWEEN 2021 AND 2026
    AND sp.kind='QP'::paper_kind AND sp.variant BETWEEN 1 AND 3
    AND sp.source_url IS NOT NULL AND q.marks IS NOT NULL
)
SELECT jsonb_build_object(
  'syllabus','9618',
  'year',2026,
  'expectedPapers',12,
  'completePapers',(SELECT count(*) FROM official_qp),
  'markSchemePapers',(SELECT count(*) FROM official_ms),
  'policyBlocked',(SELECT count(*) FROM leaves WHERE status<>'approved'::review_status),
  'sourceCompleteQuestions',(SELECT count(*) FROM leaves),
  'historicalSourceBackedQpPapers',(SELECT qp_papers FROM historical),
  'historicalSourceBackedMsPapers',(SELECT ms_papers FROM historical),
  'historicalSourceBackedQuestions',(SELECT leaves FROM historical_leaves),
  'strictCurrentTargetVerified',true
) AS current_release_state;
