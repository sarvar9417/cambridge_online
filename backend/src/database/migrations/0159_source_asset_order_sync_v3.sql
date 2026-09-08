-- Canonical source-asset ordering sync v3.
--
-- v10 repairs can create a verified source asset and immediately reference it in
-- content_json, but the guarded repair writer appends that block.  The v2 sync
-- only considered unreferenced assets, so an already-referenced repair asset was
-- skipped even when the canonical detector required it directly after the text
-- cue that introduces the printed table/diagram/layout.
--
-- v3 is deliberately fail-closed:
--   * only canonical-adjacency findings backed by a verified source-asset repair
--     (or a currently unresolved canonical finding) are considered;
--   * each question must have exactly one best renderable source asset candidate;
--   * no duplicate block is created: the existing asset block is moved;
--   * source paper + SHA provenance are rechecked through
--     set_question_structured_content_v1();
--   * the finding is resolved only after the exact adjacency predicate passes.

CREATE OR REPLACE FUNCTION public.sync_repaired_source_assets_v3(
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
  v_missing integer := 0;
  v_ambiguous integer := 0;
  v_multi integer := 0;
  v_moved integer := 0;
  v_resolved integer := 0;
  v_restored integer := 0;
  v_remaining integer := 0;
  v_v2 jsonb := NULL;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code;
  END IF;
  IF p_year_from<2015 OR p_year_to<p_year_from OR p_year_to>2035 THEN
    RAISE EXCEPTION 'invalid_year_window:%-%',p_year_from,p_year_to;
  END IF;

  CREATE TEMP TABLE _source_order_needs ON COMMIT DROP AS
  WITH ranked_findings AS (
    SELECT
      vf.id finding_id,
      vf.ref_id question_id,
      vf.rule_code,
      (vf.details->>'cueOrdinal')::bigint cue_ordinal,
      q.display_ref,
      q.source_paper_id,
      q.content_json,
      sp.sha256,
      row_number() OVER (
        PARTITION BY vf.ref_id,vf.rule_code
        ORDER BY
          CASE WHEN vf.resolved_at IS NULL THEN 0 ELSE 1 END,
          vf.resolved_at DESC NULLS FIRST,
          vf.id
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
      AND (
        vf.resolved_at IS NULL
        OR coalesce(vf.resolution,'') LIKE 'Resolved by verified source asset %'
      )
  ), canonical AS (
    SELECT * FROM ranked_findings WHERE rn=1
  )
  SELECT c.*
  FROM canonical c
  WHERE NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(c.content_json->'blocks') WITH ORDINALITY AS b(block,ordinality)
    LEFT JOIN public.question_assets qa ON qa.id::text=b.block->>'assetId'
    WHERE b.ordinality=c.cue_ordinal+1
      AND (
        (
          c.rule_code='source_visual_required_but_missing'
          AND b.block->>'type'='asset'
          AND qa.kind IN ('diagram','image')
          AND (
            nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
            OR coalesce(qa.content_md,'') ~* '^\\s*<svg(?:\\s|>)'
            OR coalesce(qa.svg_markup,'') ~* '^\\s*<svg(?:\\s|>)'
          )
        )
        OR (
          c.rule_code='source_structure_required_but_missing_layout'
          AND (
            b.block->>'type'='matching'
            OR (
              b.block->>'type'='asset'
              AND qa.kind IN ('diagram','image')
              AND (
                nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
                OR coalesce(qa.content_md,'') ~* '^\\s*<svg(?:\\s|>)'
                OR coalesce(qa.svg_markup,'') ~* '^\\s*<svg(?:\\s|>)'
              )
            )
          )
        )
        OR (
          c.rule_code='source_structure_required_but_missing_table'
          AND (
            b.block->>'type'='table'
            OR (
              b.block->>'type'='asset'
              AND (
                (qa.kind='table' AND nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL)
                OR (
                  qa.kind IN ('diagram','image')
                  AND (
                    nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
                    OR coalesce(qa.content_md,'') ~* '^\\s*<svg(?:\\s|>)'
                    OR coalesce(qa.svg_markup,'') ~* '^\\s*<svg(?:\\s|>)'
                  )
                )
              )
            )
          )
        )
      )
  );

  SELECT count(*) INTO v_multi
  FROM (
    SELECT question_id
    FROM _source_order_needs
    GROUP BY question_id
    HAVING count(*)>1
  ) x;
  IF v_multi<>0 THEN
    RAISE EXCEPTION 'source_asset_order_multiple_rules_unsupported:%',v_multi;
  END IF;

  CREATE TEMP TABLE _source_order_targets ON COMMIT DROP AS
  WITH candidates AS (
    SELECT
      n.question_id,n.display_ref,n.rule_code,n.cue_ordinal,
      n.source_paper_id,n.sha256,
      b.ordinality asset_block_ordinal,
      b.block asset_block,
      qa.id asset_id,
      CASE
        WHEN lower(coalesce(qa.alt_text,'')) LIKE 'preceding cambridge source visual%' THEN 0
        WHEN lower(coalesce(qa.alt_text,'')) LIKE 'original cambridge source layout%' THEN 1
        WHEN coalesce(qa.storage_path,'') LIKE 'supabase://question-assets/source-repair/%' THEN 2
        ELSE 3
      END candidate_score
    FROM _source_order_needs n
    CROSS JOIN LATERAL jsonb_array_elements(n.content_json->'blocks')
      WITH ORDINALITY AS b(block,ordinality)
    JOIN public.question_assets qa ON qa.id::text=b.block->>'assetId'
    WHERE b.ordinality>n.cue_ordinal
      AND b.block->>'type'='asset'
      AND (
        (
          n.rule_code='source_visual_required_but_missing'
          AND qa.kind IN ('diagram','image')
          AND (
            nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
            OR coalesce(qa.content_md,'') ~* '^\\s*<svg(?:\\s|>)'
            OR coalesce(qa.svg_markup,'') ~* '^\\s*<svg(?:\\s|>)'
          )
        )
        OR (
          n.rule_code='source_structure_required_but_missing_layout'
          AND qa.kind IN ('diagram','image')
          AND (
            nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
            OR coalesce(qa.content_md,'') ~* '^\\s*<svg(?:\\s|>)'
            OR coalesce(qa.svg_markup,'') ~* '^\\s*<svg(?:\\s|>)'
          )
        )
        OR (
          n.rule_code='source_structure_required_but_missing_table'
          AND (
            (qa.kind='table' AND nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL)
            OR (
              qa.kind IN ('diagram','image')
              AND (
                nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
                OR coalesce(qa.content_md,'') ~* '^\\s*<svg(?:\\s|>)'
                OR coalesce(qa.svg_markup,'') ~* '^\\s*<svg(?:\\s|>)'
              )
            )
          )
        )
      )
  ), mins AS (
    SELECT question_id,rule_code,min(candidate_score) min_score
    FROM candidates
    GROUP BY question_id,rule_code
  ), best AS (
    SELECT c.*,
      count(*) OVER (PARTITION BY c.question_id,c.rule_code) best_count
    FROM candidates c
    JOIN mins m
      ON m.question_id=c.question_id
     AND m.rule_code=c.rule_code
     AND m.min_score=c.candidate_score
  )
  SELECT * FROM best;

  SELECT count(*) INTO v_missing
  FROM _source_order_needs n
  WHERE NOT EXISTS (
    SELECT 1 FROM _source_order_targets t
    WHERE t.question_id=n.question_id AND t.rule_code=n.rule_code
  );

  SELECT count(*) INTO v_ambiguous
  FROM (
    SELECT question_id,rule_code
    FROM _source_order_targets
    GROUP BY question_id,rule_code
    HAVING max(best_count)>1
  ) x;

  IF v_missing<>0 OR v_ambiguous<>0 THEN
    RAISE EXCEPTION 'source_asset_order_preflight_failed:missing=%:ambiguous=%',
      v_missing,v_ambiguous;
  END IF;

  FOR v_row IN
    SELECT * FROM _source_order_targets
    WHERE best_count=1
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

    -- Re-read the chosen asset block by id from the locked content document.
    SELECT b.block INTO v_row.asset_block
    FROM jsonb_array_elements(v_content->'blocks') WITH ORDINALITY AS b(block,ordinality)
    WHERE b.block->>'type'='asset'
      AND b.block->>'assetId'=v_row.asset_id::text
    LIMIT 1;
    IF v_row.asset_block IS NULL THEN
      RAISE EXCEPTION 'source_asset_order_block_missing:%:%',v_row.question_id,v_row.asset_id;
    END IF;

    SELECT jsonb_agg(x.block ORDER BY x.sort_key) INTO v_blocks
    FROM (
      SELECT b.block,
        CASE
          WHEN b.ordinality<=v_row.cue_ordinal THEN (b.ordinality*4)::numeric
          ELSE (b.ordinality*4+2)::numeric
        END sort_key
      FROM jsonb_array_elements(v_content->'blocks') WITH ORDINALITY AS b(block,ordinality)
      WHERE NOT (
        b.block->>'type'='asset'
        AND b.block->>'assetId'=v_row.asset_id::text
      )
      UNION ALL
      SELECT v_row.asset_block,(v_row.cue_ordinal*4+1)::numeric
    ) x;

    v_content:=jsonb_set(v_content,'{blocks}',v_blocks,false);
    PERFORM public.set_question_structured_content_v1(
      v_row.question_id,v_row.source_paper_id,lower(v_row.sha256),v_content
    );
    v_moved:=v_moved+1;
  END LOOP;

  -- Resolve only findings whose detector predicate is now actually satisfied.
  WITH fixed AS (
    UPDATE public.validation_findings vf
    SET resolved_at=now(),
        resolution='Resolved by canonical source asset ordering sync v3 after verified adjacency check.'
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE vf.ref_table='questions'
      AND vf.ref_id=q.id
      AND vf.resolved_at IS NULL
      AND vf.severity='error'
      AND vf.details->>'audit'='source-fidelity-detector-v3-canonical-adjacency'
      AND sy.code=p_syllabus_code
      AND sp.year BETWEEN p_year_from AND p_year_to
      AND coalesce(vf.details->>'cueOrdinal','') ~ '^[1-9][0-9]*$'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(q.content_json->'blocks') WITH ORDINALITY AS b(block,ordinality)
        LEFT JOIN public.question_assets qa ON qa.id::text=b.block->>'assetId'
        WHERE b.ordinality=(vf.details->>'cueOrdinal')::bigint+1
          AND (
            (
              vf.rule_code='source_visual_required_but_missing'
              AND b.block->>'type'='asset'
              AND qa.kind IN ('diagram','image')
              AND (
                nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
                OR coalesce(qa.content_md,'') ~* '^\\s*<svg(?:\\s|>)'
                OR coalesce(qa.svg_markup,'') ~* '^\\s*<svg(?:\\s|>)'
              )
            )
            OR (
              vf.rule_code='source_structure_required_but_missing_layout'
              AND (
                b.block->>'type'='matching'
                OR (
                  b.block->>'type'='asset'
                  AND qa.kind IN ('diagram','image')
                  AND (
                    nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
                    OR coalesce(qa.content_md,'') ~* '^\\s*<svg(?:\\s|>)'
                    OR coalesce(qa.svg_markup,'') ~* '^\\s*<svg(?:\\s|>)'
                  )
                )
              )
            )
            OR (
              vf.rule_code='source_structure_required_but_missing_table'
              AND (
                b.block->>'type'='table'
                OR (
                  b.block->>'type'='asset'
                  AND (
                    (qa.kind='table' AND nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL)
                    OR (
                      qa.kind IN ('diagram','image')
                      AND (
                        nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
                        OR coalesce(qa.content_md,'') ~* '^\\s*<svg(?:\\s|>)'
                        OR coalesce(qa.svg_markup,'') ~* '^\\s*<svg(?:\\s|>)'
                      )
                    )
                  )
                )
              )
            )
          )
      )
    RETURNING vf.id
  )
  SELECT count(*) INTO v_resolved FROM fixed;

  WITH restored AS (
    UPDATE public.questions q
    SET status='approved'::review_status,
        updated_at=now()
    WHERE q.status='needs_review'::review_status
      AND coalesce(q.notes,'') LIKE '%demoted_from_approved%'
      AND EXISTS (
        SELECT 1 FROM public.source_papers sp
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
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
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

  -- Preserve the old unreferenced-asset sync when the scope is clean enough for
  -- its own fail-closed guard.  In a partially repaired scope we return the
  -- remaining count instead of bypassing that guard.
  IF v_remaining=0 THEN
    v_v2:=public.sync_repaired_source_assets_v2(
      p_syllabus_code,p_year_from,p_year_to
    );
  END IF;

  RETURN jsonb_build_object(
    'version','source-asset-sync-v3',
    'syllabusCode',p_syllabus_code,
    'yearFrom',p_year_from,'yearTo',p_year_to,
    'orderedAssetsMoved',v_moved,
    'canonicalFindingsResolved',v_resolved,
    'approvalRestored',v_restored,
    'remainingFidelityErrors',v_remaining,
    'v2Sync',v_v2
  );
END
$function$;

REVOKE ALL ON FUNCTION public.sync_repaired_source_assets_v3(text,int,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_repaired_source_assets_v3(text,int,int)
  TO service_role;

-- Keep the established corpus-runner action stable while upgrading ordering.
CREATE OR REPLACE FUNCTION public.sync_repaired_source_assets_v1(
  p_syllabus_code text,
  p_year_from int,
  p_year_to int
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT public.sync_repaired_source_assets_v3(
    p_syllabus_code,p_year_from,p_year_to
  )
$function$;

REVOKE ALL ON FUNCTION public.sync_repaired_source_assets_v1(text,int,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_repaired_source_assets_v1(text,int,int)
  TO service_role;
