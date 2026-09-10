-- Correct the historical 9618 "missing source" bootstrap so verified exact
-- variant aliases are not mistaken for absent question content.
--
-- Canonical question identity is established by 0144..0150: an exact-content
-- equivalent QP keeps no physical question rows of its own. Instead, every
-- canonical question path must be represented by a verified non-primary
-- question_source_occurrence on the equivalent source paper. This migration
-- therefore excludes an alias only after proving that occurrence ledger in
-- both directions; any incomplete or inconsistent alias fails closed.

CREATE OR REPLACE FUNCTION public.missing_qp_source_ingest_bootstrap_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_result jsonb;
  v_invalid_equivalents jsonb;
BEGIN
  WITH eligible AS (
    SELECT
      qp.id AS qp_id,
      ms.id AS ms_id,
      e.canonical_source_paper_id
    FROM public.source_papers qp
    JOIN public.syllabi sy ON sy.id=qp.syllabus_id
    JOIN public.components c ON c.id=qp.component_id
    JOIN public.source_papers ms
      ON ms.syllabus_id=qp.syllabus_id
     AND ms.component_id=qp.component_id
     AND ms.year=qp.year
     AND ms.series=qp.series
     AND ms.variant=qp.variant
     AND ms.kind='MS'::paper_kind
    LEFT JOIN public.source_paper_equivalences e
      ON e.source_paper_id=qp.id
     AND e.equivalence_kind='exact_content'
    WHERE sy.code='9618'
      AND qp.kind='QP'::paper_kind
      AND qp.variant BETWEEN 1 AND 3
      AND qp.source_url IS NOT NULL
      AND nullif(btrim(qp.sha256),'') IS NOT NULL
      AND ms.source_url IS NOT NULL
      AND nullif(btrim(ms.sha256),'') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.questions q
        WHERE q.source_paper_id=qp.id AND q.marks>0
      )
  ), invalid_equivalent AS (
    SELECT e.qp_id,e.canonical_source_paper_id
    FROM eligible e
    WHERE e.canonical_source_paper_id IS NOT NULL
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.questions cq
          WHERE cq.source_paper_id=e.canonical_source_paper_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.question_source_occurrences o
          LEFT JOIN public.questions cq ON cq.id=o.question_id
          WHERE o.source_paper_id=e.qp_id
            AND (
              o.is_primary
              OR o.equivalence_basis<>'source_verified_exact'
              OR o.verified_at IS NULL
              OR cq.id IS NULL
              OR cq.source_paper_id<>e.canonical_source_paper_id
              OR o.source_path<>cq.path
              OR o.mark_scheme_source_paper_id IS DISTINCT FROM e.ms_id
            )
        )
        OR EXISTS (
          SELECT cq.path
          FROM public.questions cq
          WHERE cq.source_paper_id=e.canonical_source_paper_id
          EXCEPT
          SELECT o.source_path
          FROM public.question_source_occurrences o
          WHERE o.source_paper_id=e.qp_id
        )
        OR EXISTS (
          SELECT o.source_path
          FROM public.question_source_occurrences o
          WHERE o.source_paper_id=e.qp_id
          EXCEPT
          SELECT cq.path
          FROM public.questions cq
          WHERE cq.source_paper_id=e.canonical_source_paper_id
        )
      )
  )
  SELECT coalesce(
    jsonb_agg(jsonb_build_object(
      'sourcePaperId',qp_id,
      'canonicalSourcePaperId',canonical_source_paper_id
    ) ORDER BY qp_id),
    '[]'::jsonb
  )
  INTO v_invalid_equivalents
  FROM invalid_equivalent;

  IF jsonb_array_length(v_invalid_equivalents)>0 THEN
    RAISE EXCEPTION
      'missing_qp_source_equivalent_occurrence_incomplete:%',
      v_invalid_equivalents;
  END IF;

  WITH eligible AS (
    SELECT
      qp.id AS qp_id,
      qp.source_url,
      qp.sha256,
      ms.id AS ms_id,
      ms.source_url AS ms_source_url,
      ms.sha256 AS ms_sha256,
      sy.code AS syllabus_code,
      c.number AS component_number,
      c.total_marks,
      qp.variant,
      qp.series,
      qp.year,
      e.canonical_source_paper_id
    FROM public.source_papers qp
    JOIN public.syllabi sy ON sy.id=qp.syllabus_id
    JOIN public.components c ON c.id=qp.component_id
    JOIN public.source_papers ms
      ON ms.syllabus_id=qp.syllabus_id
     AND ms.component_id=qp.component_id
     AND ms.year=qp.year
     AND ms.series=qp.series
     AND ms.variant=qp.variant
     AND ms.kind='MS'::paper_kind
    LEFT JOIN public.source_paper_equivalences e
      ON e.source_paper_id=qp.id
     AND e.equivalence_kind='exact_content'
    WHERE sy.code='9618'
      AND qp.kind='QP'::paper_kind
      AND qp.variant BETWEEN 1 AND 3
      AND qp.source_url IS NOT NULL
      AND nullif(btrim(qp.sha256),'') IS NOT NULL
      AND ms.source_url IS NOT NULL
      AND nullif(btrim(ms.sha256),'') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.questions q
        WHERE q.source_paper_id=qp.id AND q.marks>0
      )
  ), true_missing AS (
    SELECT * FROM eligible WHERE canonical_source_paper_id IS NULL
  )
  SELECT jsonb_build_object(
    'version','missing-qp-source-ingest-v1',
    'equivalenceGuard','source_verified_occurrence_ledger_v1',
    'paperCount',(SELECT count(*) FROM true_missing),
    'excludedEquivalentPaperCount',(
      SELECT count(*) FROM eligible WHERE canonical_source_paper_id IS NOT NULL
    ),
    'sources',coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'sourcePaperId',qp_id,
          'sourceUrl',source_url,
          'sourceSha256',lower(sha256),
          'markSchemeSourcePaperId',ms_id,
          'markSchemeSourceUrl',ms_source_url,
          'markSchemeSha256',lower(ms_sha256),
          'syllabusCode',syllabus_code,
          'component',component_number,
          'variant',variant,
          'series',series::text,
          'year',year,
          'expectedMarks',total_marks
        )
        ORDER BY year,series,component_number,variant
      )
      FROM true_missing
    ),'[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END
$function$;

REVOKE ALL ON FUNCTION public.missing_qp_source_ingest_bootstrap_v1()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.missing_qp_source_ingest_bootstrap_v1()
  TO service_role;
