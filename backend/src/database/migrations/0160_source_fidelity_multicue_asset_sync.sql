-- Canonical multi-cue source-asset synchronisation.
-- Bind each canonical finding to the exact SHA-verified asset recorded by the
-- guarded repair resolution, then place that exact asset after cueOrdinal.
CREATE OR REPLACE FUNCTION public.sync_repaired_source_assets_v4(
  p_syllabus_code text,
  p_year_from int,
  p_year_to int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_row record;
  v_content jsonb;
  v_blocks jsonb;
  v_asset_block jsonb;
  v_target_count integer := 0;
  v_moved integer := 0;
  v_missing integer := 0;
  v_bad_adjacency integer := 0;
  v_restored integer := 0;
  v_remaining integer := 0;
  v_unreferenced integer := 0;
  v_v2 jsonb := NULL;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code;
  END IF;
  IF p_year_from<2015 OR p_year_to<p_year_from OR p_year_to>2035 THEN
    RAISE EXCEPTION 'invalid_year_window:%-%',p_year_from,p_year_to;
  END IF;

  CREATE TEMP TABLE _canonical_asset_bindings ON COMMIT DROP AS
  WITH eligible AS (
    SELECT
      vf.id finding_id,
      vf.ref_id question_id,
      vf.rule_code,
      (vf.details->>'cueOrdinal')::bigint cue_ordinal,
      q.display_ref,
      q.source_paper_id,
      q.content_json,
      sp.sha256,
      substring(
        vf.resolution
        FROM 'Resolved by verified source asset ([0-9a-fA-F-]{36})'
      )::uuid asset_id,
      row_number() OVER (
        PARTITION BY vf.ref_id,vf.rule_code
        ORDER BY vf.resolved_at DESC NULLS LAST,vf.id DESC
      ) rn
    FROM public.validation_findings vf
    JOIN public.questions q
      ON vf.ref_table='questions' AND vf.ref_id=q.id
    JOIN public.source_papers sp
      ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE sy.code=p_syllabus_code
      AND sp.year BETWEEN p_year_from AND p_year_to
      AND sp.variant BETWEEN 1 AND 3
      AND sp.source_url IS NOT NULL
      AND q.marks IS NOT NULL
      AND q.content_version=1 AND q.content_json IS NOT NULL
      AND vf.rule_code IN (
        'source_visual_required_but_missing',
        'source_structure_required_but_missing_table',
        'source_structure_required_but_missing_layout'
      )
      AND vf.details->>'audit'='source-fidelity-detector-v3-canonical-adjacency'
      AND coalesce(vf.details->>'cueOrdinal','') ~ '^[1-9][0-9]*$'
      AND vf.resolved_at IS NOT NULL
      AND coalesce(vf.resolution,'') ~
        '^Resolved by verified source asset [0-9a-fA-F-]{36} from source SHA-256 [0-9a-fA-F]{64}\\.$'
      -- Do not reuse an older asset while the same canonical rule is open.
      AND NOT EXISTS (
        SELECT 1
        FROM public.validation_findings open_vf
        WHERE open_vf.ref_table='questions'
          AND open_vf.ref_id=vf.ref_id
          AND open_vf.rule_code=vf.rule_code
          AND open_vf.resolved_at IS NULL
          AND open_vf.severity='error'
          AND open_vf.details->>'audit'='source-fidelity-detector-v3-canonical-adjacency'
      )
  )
  SELECT
    e.finding_id,e.question_id,e.rule_code,e.cue_ordinal,e.display_ref,
    e.source_paper_id,e.sha256,e.asset_id,
    qa.kind::text asset_kind,qa.alt_text,qa.source_page,
    qa.storage_path,qa.content_md,qa.svg_markup
  FROM eligible e
  JOIN public.question_assets qa
    ON qa.id=e.asset_id AND qa.question_id=e.question_id
  WHERE e.rn=1
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(e.content_json->'blocks')
        WITH ORDINALITY AS b(block,ordinality)
      WHERE b.ordinality=e.cue_ordinal+1
        AND b.block->>'type'='asset'
        AND b.block->>'assetId'=e.asset_id::text
    );

  SELECT count(*) INTO v_target_count FROM _canonical_asset_bindings;

  SELECT count(*) INTO v_missing
  FROM _canonical_asset_bindings t
  WHERE t.asset_id IS NULL
     OR t.source_page IS NULL
     OR (
       t.asset_kind IN ('diagram','image')
       AND nullif(btrim(coalesce(t.storage_path,'')),'') IS NULL
       AND coalesce(t.content_md,'') !~* '^\\s*<svg(?:\\s|>)'
       AND coalesce(t.svg_markup,'') !~* '^\\s*<svg(?:\\s|>)'
     )
     OR (
       t.asset_kind='table'
       AND nullif(btrim(coalesce(t.content_md,'')),'') IS NULL
     );
  IF v_missing<>0 THEN
    RAISE EXCEPTION 'canonical_multicue_asset_preflight_failed:missing_or_unrenderable=%',v_missing;
  END IF;

  FOR v_row IN
    SELECT * FROM _canonical_asset_bindings
    ORDER BY display_ref,rule_code
  LOOP
    SELECT q.content_json INTO v_content
    FROM public.questions q
    WHERE q.id=v_row.question_id
    FOR UPDATE;

    IF v_content->'source'->>'paperId'<>v_row.source_paper_id::text
       OR lower(coalesce(v_content->'source'->>'sha256',''))<>lower(coalesce(v_row.sha256,'')) THEN
      RAISE EXCEPTION 'structured_source_provenance_mismatch:%',v_row.question_id;
    END IF;

    SELECT b.block INTO v_asset_block
    FROM jsonb_array_elements(v_content->'blocks')
      WITH ORDINALITY AS b(block,ordinality)
    WHERE b.block->>'type'='asset'
      AND b.block->>'assetId'=v_row.asset_id::text
    LIMIT 1;

    IF v_asset_block IS NULL THEN
      v_asset_block:=jsonb_build_object(
        'type','asset',
        'kind',CASE
          WHEN v_row.asset_kind='diagram' THEN 'diagram'
          WHEN v_row.asset_kind='table' THEN 'table'
          ELSE 'image'
        END,
        'assetId',v_row.asset_id,
        'altText',coalesce(v_row.alt_text,'Original Cambridge source asset'),
        'source',jsonb_build_object('page',v_row.source_page)
      );
    END IF;

    SELECT jsonb_agg(x.block ORDER BY x.sort_key) INTO v_blocks
    FROM (
      SELECT b.block,
        CASE
          WHEN b.ordinality<=v_row.cue_ordinal THEN (b.ordinality*4)::numeric
          ELSE (b.ordinality*4+2)::numeric
        END sort_key
      FROM jsonb_array_elements(v_content->'blocks')
        WITH ORDINALITY AS b(block,ordinality)
      WHERE NOT (
        b.block->>'type'='asset'
        AND b.block->>'assetId'=v_row.asset_id::text
      )
      UNION ALL
      SELECT v_asset_block,(v_row.cue_ordinal*4+1)::numeric
    ) x;

    v_content:=jsonb_set(v_content,'{blocks}',v_blocks,false);
    PERFORM public.set_question_structured_content_v1(
      v_row.question_id,v_row.source_paper_id,lower(v_row.sha256),v_content
    );
    v_moved:=v_moved+1;
  END LOOP;

  SELECT count(*) INTO v_bad_adjacency
  FROM _canonical_asset_bindings t
  JOIN public.questions q ON q.id=t.question_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(q.content_json->'blocks')
      WITH ORDINALITY AS b(block,ordinality)
    WHERE b.ordinality=t.cue_ordinal+1
      AND b.block->>'type'='asset'
      AND b.block->>'assetId'=t.asset_id::text
  );
  IF v_bad_adjacency<>0 THEN
    RAISE EXCEPTION 'canonical_multicue_asset_adjacency_failed:%',v_bad_adjacency;
  END IF;

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
          AND sp.year BETWEEN p_year_from AND p_year_to
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.validation_findings vf
        WHERE vf.ref_table='questions' AND vf.ref_id=q.id
          AND vf.resolved_at IS NULL AND vf.severity='error'
      )
    RETURNING q.id
  )
  SELECT count(*) INTO v_restored FROM restored;

  SELECT count(*) INTO v_remaining
  FROM public.validation_findings vf
  JOIN public.questions q ON q.id=vf.ref_id
  JOIN public.source_papers sp
    ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  WHERE vf.ref_table='questions'
    AND vf.resolved_at IS NULL AND vf.severity='error'
    AND sy.code=p_syllabus_code
    AND sp.year BETWEEN p_year_from AND p_year_to
    AND vf.rule_code IN (
      'source_structure_required_but_missing_table',
      'source_structure_required_but_missing_layout',
      'source_visual_required_but_missing'
    );

  IF v_remaining=0 THEN
    v_v2:=public.sync_repaired_source_assets_v2(
      p_syllabus_code,p_year_from,p_year_to
    );
  END IF;

  SELECT count(*) INTO v_unreferenced
  FROM public.questions q
  JOIN public.source_papers sp
    ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  JOIN public.question_assets qa ON qa.question_id=q.id
  WHERE sy.code=p_syllabus_code
    AND sp.year BETWEEN p_year_from AND p_year_to
    AND sp.variant BETWEEN 1 AND 3
    AND q.marks IS NOT NULL
    AND q.content_version=1 AND q.content_json IS NOT NULL
    AND qa.kind IN ('diagram','image')
    AND qa.source_page IS NOT NULL
    AND (
      nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
      OR coalesce(qa.content_md,'') ~* '^\\s*<svg(?:\\s|>)'
      OR coalesce(qa.svg_markup,'') ~* '^\\s*<svg(?:\\s|>)'
    )
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(q.content_json->'blocks') b
      WHERE b->>'type'='asset' AND b->>'assetId'=qa.id::text
    );

  RETURN jsonb_build_object(
    'version','source-asset-sync-v4',
    'syllabusCode',p_syllabus_code,
    'yearFrom',p_year_from,'yearTo',p_year_to,
    'exactAssetBindings',v_target_count,
    'orderedAssetsMoved',v_moved,
    'approvalRestored',v_restored,
    'remainingFidelityErrors',v_remaining,
    'remainingUnreferencedVisualAssets',v_unreferenced,
    'v2Sync',v_v2
  );
END
$function$;

REVOKE ALL ON FUNCTION public.sync_repaired_source_assets_v4(text,int,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_repaired_source_assets_v4(text,int,int)
  TO service_role;

-- Supersede historical aliases so production and fresh environments converge.
CREATE OR REPLACE FUNCTION public.sync_repaired_source_assets_v3(
  p_syllabus_code text,p_year_from int,p_year_to int
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT public.sync_repaired_source_assets_v4(
    p_syllabus_code,p_year_from,p_year_to
  );
$function$;

CREATE OR REPLACE FUNCTION public.sync_repaired_source_assets_v1(
  p_syllabus_code text,p_year_from int,p_year_to int
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT public.sync_repaired_source_assets_v4(
    p_syllabus_code,p_year_from,p_year_to
  );
$function$;

REVOKE ALL ON FUNCTION public.sync_repaired_source_assets_v3(text,int,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_repaired_source_assets_v3(text,int,int)
  TO service_role;
REVOKE ALL ON FUNCTION public.sync_repaired_source_assets_v1(text,int,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_repaired_source_assets_v1(text,int,int)
  TO service_role;
