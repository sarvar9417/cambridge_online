-- Synchronise newly repaired source visuals into already-structured questions.
--
-- Historical 9618 leaves were structured before some missing source visuals were
-- discovered. The repair pipeline correctly adds SHA/page-backed question_assets,
-- but an existing content_json document will not automatically reference a new
-- asset. This function appends only renderable, source-page-backed assets that
-- are not already referenced. It never fabricates geometry or changes source text.

CREATE OR REPLACE FUNCTION public.sync_repaired_source_assets_v1(
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
  v_block jsonb;
  v_kind text;
  v_label text;
  v_synced integer := 0;
  v_questions uuid[] := ARRAY[]::uuid[];
  v_remaining integer;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code;
  END IF;
  IF p_year_from<2015 OR p_year_to<p_year_from OR p_year_to>2035 THEN
    RAISE EXCEPTION 'invalid_year_window:%-%',p_year_from,p_year_to;
  END IF;

  FOR v_row IN
    SELECT
      q.id question_id,q.source_paper_id,q.content_json,q.stem_md,q.context_md,
      sp.sha256,sp.year,qa.id asset_id,qa.kind::text asset_kind,
      qa.alt_text,qa.source_page,qa.sort_order
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    JOIN public.question_assets qa ON qa.question_id=q.id
    WHERE sy.code=p_syllabus_code
      AND sp.year BETWEEN p_year_from AND p_year_to
      AND sp.variant BETWEEN 1 AND 3
      AND sp.source_url IS NOT NULL
      AND q.marks IS NOT NULL
      AND q.content_version=1 AND q.content_json IS NOT NULL
      AND qa.kind IN ('diagram','image')
      AND qa.source_page IS NOT NULL
      AND (
        nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
        OR coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)'
        OR coalesce(qa.svg_markup,'') ~* '^\s*<svg(?:\s|>)'
      )
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(q.content_json->'blocks') b
        WHERE b->>'type'='asset' AND b->>'assetId'=qa.id::text
      )
    ORDER BY sp.year,q.source_paper_id,q.sort_order,qa.sort_order,qa.id
  LOOP
    IF v_row.content_json->'source'->>'paperId'<>v_row.source_paper_id::text
       OR lower(coalesce(v_row.content_json->'source'->>'sha256',''))<>lower(coalesce(v_row.sha256,'')) THEN
      RAISE EXCEPTION 'structured_source_provenance_mismatch:%',v_row.question_id;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.validation_findings vf
      WHERE vf.ref_table='questions' AND vf.ref_id=v_row.question_id
        AND vf.resolved_at IS NULL AND vf.severity='error'
        AND vf.rule_code IN (
          'source_structure_required_but_missing_table',
          'source_structure_required_but_missing_layout',
          'source_visual_required_but_missing'
        )
    ) THEN
      RAISE EXCEPTION 'cannot_sync_unresolved_source_fidelity:%',v_row.question_id;
    END IF;

    SELECT q.content_json INTO v_content
    FROM public.questions q WHERE q.id=v_row.question_id FOR UPDATE;

    -- A prior loop iteration may already have synchronized this exact asset.
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_content->'blocks') b
      WHERE b->>'type'='asset' AND b->>'assetId'=v_row.asset_id::text
    ) THEN
      CONTINUE;
    END IF;

    v_label:=lower(
      coalesce(v_row.alt_text,'')||' '||
      coalesce(v_row.context_md,'')||' '||coalesce(v_row.stem_md,'')
    );
    v_kind:=CASE
      WHEN v_label ~ 'logic[[:space:]]+(circuit|gate)' THEN 'logic_circuit'
      WHEN v_label ~ 'flowchart' THEN 'flowchart'
      WHEN v_label ~ '(diagram|structure[[:space:]]+chart|syntax[[:space:]]+diagram|graph|tree)' THEN 'diagram'
      ELSE 'image'
    END;

    v_block:=jsonb_build_object(
      'type','asset',
      'kind',v_kind,
      'assetId',v_row.asset_id,
      'altText',coalesce(v_row.alt_text,'Original Cambridge source visual'),
      'source',jsonb_build_object('page',v_row.source_page)
    );
    v_content:=jsonb_set(
      v_content,'{blocks}',
      (v_content->'blocks')||jsonb_build_array(v_block),
      false
    );

    PERFORM public.set_question_structured_content_v1(
      v_row.question_id,v_row.source_paper_id,lower(v_row.sha256),v_content
    );

    INSERT INTO public.structured_content_backfill_audits(
      question_id,source_paper_id,source_sha256,source_page,parser_version,evidence
    ) VALUES (
      v_row.question_id,v_row.source_paper_id,lower(v_row.sha256),v_row.source_page,
      'source-asset-sync-v1',
      jsonb_build_object(
        'assetId',v_row.asset_id,
        'assetKind',v_row.asset_kind,
        'structuredKind',v_kind,
        'sourceAuthority','verified_question_asset_source_page_sha'
      )
    )
    ON CONFLICT(question_id,source_sha256,parser_version) DO UPDATE
      SET source_page=excluded.source_page,
          evidence=excluded.evidence,
          created_at=now();

    v_synced:=v_synced+1;
    IF NOT (v_row.question_id=ANY(v_questions)) THEN
      v_questions:=array_append(v_questions,v_row.question_id);
    END IF;
  END LOOP;

  SELECT count(*) INTO v_remaining
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  JOIN public.question_assets qa ON qa.question_id=q.id
  WHERE sy.code=p_syllabus_code
    AND sp.year BETWEEN p_year_from AND p_year_to
    AND sp.variant BETWEEN 1 AND 3 AND sp.source_url IS NOT NULL
    AND q.marks IS NOT NULL AND q.content_version=1 AND q.content_json IS NOT NULL
    AND qa.kind IN ('diagram','image') AND qa.source_page IS NOT NULL
    AND (
      nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
      OR coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)'
      OR coalesce(qa.svg_markup,'') ~* '^\s*<svg(?:\s|>)'
    )
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(q.content_json->'blocks') b
      WHERE b->>'type'='asset' AND b->>'assetId'=qa.id::text
    );

  IF v_remaining<>0 THEN
    RAISE EXCEPTION 'structured_source_asset_sync_incomplete:%',v_remaining;
  END IF;

  RETURN jsonb_build_object(
    'version','source-asset-sync-v1',
    'syllabusCode',p_syllabus_code,
    'yearFrom',p_year_from,'yearTo',p_year_to,
    'assetsSynced',v_synced,
    'questionsUpdated',coalesce(cardinality(v_questions),0),
    'remainingUnreferencedVisualAssets',v_remaining
  );
END
$function$;

REVOKE ALL ON FUNCTION public.sync_repaired_source_assets_v1(text,int,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_repaired_source_assets_v1(text,int,int)
  TO service_role;
