-- Reconcile canonical detector findings that were reopened only because the
-- same SHA-verified source asset is not immediately adjacent to the cue.
--
-- This does NOT treat an arbitrary asset as sufficient. A reopened canonical
-- finding is resolved only when all of the following are true:
--   * the same question + rule + canonical cue was previously resolved by a
--     verified source asset;
--   * the resolution SHA still matches the question's current QP SHA;
--   * that exact asset still belongs to the question, is renderable and remains
--     referenced by canonical content_json.
-- A genuinely new cue therefore remains unresolved and fail-closed.

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v6(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_base jsonb;
  v_resolved integer := 0;
  v_restored integer := 0;
BEGIN
  v_base := public.flag_source_fidelity_requirements_v5(p_syllabus_code,p_year);

  WITH candidates AS (
    SELECT
      open_vf.id open_finding_id,
      open_vf.ref_id question_id,
      prior.asset_id
    FROM public.validation_findings open_vf
    JOIN public.questions q
      ON open_vf.ref_table='questions' AND q.id=open_vf.ref_id
    JOIN public.source_papers sp
      ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    CROSS JOIN LATERAL (
      SELECT
        substring(
          hist.resolution
          FROM 'Resolved by verified source asset ([0-9a-fA-F-]{36})'
        )::uuid asset_id,
        lower(substring(
          hist.resolution
          FROM 'source SHA-256 ([0-9a-fA-F]{64})'
        )) source_sha
      FROM public.validation_findings hist
      WHERE hist.ref_table='questions'
        AND hist.ref_id=open_vf.ref_id
        AND hist.rule_code=open_vf.rule_code
        AND hist.resolved_at IS NOT NULL
        AND hist.details->>'audit'='source-fidelity-detector-v3-canonical-adjacency'
        AND lower(regexp_replace(coalesce(hist.details->>'cue',''),'\s+',' ','g'))
            = lower(regexp_replace(coalesce(open_vf.details->>'cue',''),'\s+',' ','g'))
        AND coalesce(hist.resolution,'') ~
          '^Resolved by verified source asset [0-9a-fA-F-]{36} from source SHA-256 [0-9a-fA-F]{64}\.$'
      ORDER BY hist.resolved_at DESC,hist.id DESC
      LIMIT 1
    ) prior
    JOIN public.question_assets qa
      ON qa.id=prior.asset_id AND qa.question_id=q.id
    WHERE sy.code=p_syllabus_code
      AND sp.year=p_year
      AND sp.variant BETWEEN 1 AND 3
      AND open_vf.resolved_at IS NULL
      AND open_vf.severity='error'
      AND open_vf.details->>'audit'='source-fidelity-detector-v3-canonical-adjacency'
      AND open_vf.rule_code IN (
        'source_visual_required_but_missing',
        'source_structure_required_but_missing_table',
        'source_structure_required_but_missing_layout'
      )
      AND prior.source_sha=lower(coalesce(sp.sha256,''))
      AND (
        nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
        OR coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)'
        OR coalesce(qa.svg_markup,'') ~* '^\s*<svg(?:\s|>)'
        OR (
          qa.kind='table'
          AND nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL
        )
      )
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(q.content_json->'blocks') b
        WHERE b->>'type'='asset'
          AND b->>'assetId'=qa.id::text
      )
  ), fixed AS (
    UPDATE public.validation_findings vf
    SET resolved_at=now(),
        resolution=concat(
          'Resolved by detector-v6 verified source coverage using previously SHA-verified asset ',
          c.asset_id::text,
          ' still referenced in canonical content.'
        )
    FROM candidates c
    WHERE vf.id=c.open_finding_id
      AND vf.resolved_at IS NULL
    RETURNING vf.ref_id
  )
  SELECT count(*) INTO v_resolved FROM fixed;

  WITH restored AS (
    UPDATE public.questions q
    SET status='approved'::review_status,
        updated_at=now()
    WHERE q.status='needs_review'::review_status
      AND coalesce(q.notes,'') LIKE '%demoted_from_approved%'
      AND EXISTS (
        SELECT 1
        FROM public.source_papers sp
        JOIN public.syllabi sy ON sy.id=sp.syllabus_id
        WHERE sp.id=q.source_paper_id
          AND sp.kind='QP'::paper_kind
          AND sy.code=p_syllabus_code
          AND sp.year=p_year
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.validation_findings vf
        WHERE vf.ref_table='questions'
          AND vf.ref_id=q.id
          AND vf.resolved_at IS NULL
          AND vf.severity='error'
      )
    RETURNING q.id
  )
  SELECT count(*) INTO v_restored FROM restored;

  RETURN coalesce(v_base,'{}'::jsonb) || jsonb_build_object(
    'version','source-fidelity-detector-v6',
    'verifiedCoverageFindingsResolved',v_resolved,
    'approvalRestoredByV6',v_restored
  );
END
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v6(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v6(text,int)
  TO service_role;

-- Keep the stable corpus entrypoint current.
CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v1(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT public.flag_source_fidelity_requirements_v6(p_syllabus_code,p_year);
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  TO service_role;
