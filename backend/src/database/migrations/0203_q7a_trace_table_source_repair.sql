-- 0203: point 9618/12/O/N/22 Q7(a) at the verified source-backed trace table crop.
--
-- The canonical block previously referenced a semantic placeholder that only
-- described the trace table in prose. A verified Cambridge source crop already
-- exists for this question/page, with source provenance and bounding-box data.
-- Preserve append-only asset history and only repair the canonical reference.

DO $repair$
DECLARE
  v_q public.questions%ROWTYPE;
  v_sp public.source_papers%ROWTYPE;
  v_source_asset public.question_assets%ROWTYPE;
  v_blocks jsonb;
  v_content jsonb;
BEGIN
  SELECT q.* INTO v_q
  FROM public.questions q
  WHERE q.display_ref='9618/12/O/N/22 Q7(a)'
  ORDER BY q.updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION '0203 target question unavailable';
  END IF;

  SELECT sp.* INTO v_sp
  FROM public.source_papers sp
  WHERE sp.id=v_q.source_paper_id
    AND sp.kind='QP'::paper_kind;

  IF NOT FOUND
     OR lower(coalesce(v_sp.sha256,''))<>'b4598c9803261b160d58018f7411abc161637b8b803d40fc79875089ea3922b0' THEN
    RAISE EXCEPTION '0203 verified QP provenance mismatch';
  END IF;

  IF v_q.content_version IS DISTINCT FROM 1 OR v_q.content_json IS NULL THEN
    RAISE EXCEPTION '0203 canonical v1 content unavailable';
  END IF;

  IF v_q.content_json->'source'->>'paperId'<>v_sp.id::text
     OR lower(coalesce(v_q.content_json->'source'->>'sha256',''))<>lower(v_sp.sha256) THEN
    RAISE EXCEPTION '0203 canonical source provenance mismatch';
  END IF;

  SELECT qa.* INTO v_source_asset
  FROM public.question_assets qa
  WHERE qa.question_id=v_q.id
    AND qa.kind='image'
    AND qa.source_page=11
    AND qa.source_bbox='[153,234,1542,2214]'::jsonb
    AND nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
    AND qa.alt_text='Original Cambridge source layout for 9618/12/O/N/22 Q7(a)'
  ORDER BY qa.created_at DESC,qa.id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION '0203 verified source trace-table crop unavailable';
  END IF;

  SELECT jsonb_agg(
    CASE
      WHEN b.block->>'type'='asset'
       AND coalesce((b.block->'source'->>'page')::int,0)=11
       AND b.block->>'altText'='Cambridge 9618/12/O/N/22 Q7(a) processor trace table'
      THEN jsonb_set(
        jsonb_set(b.block,'{assetId}',to_jsonb(v_source_asset.id::text),false),
        '{kind}',to_jsonb('image'::text),false
      )
      ELSE b.block
    END
    ORDER BY b.ordinality
  )
  INTO v_blocks
  FROM jsonb_array_elements(v_q.content_json->'blocks')
    WITH ORDINALITY b(block,ordinality);

  IF v_blocks IS NULL THEN
    RAISE EXCEPTION '0203 canonical blocks unavailable';
  END IF;

  v_content:=jsonb_set(v_q.content_json,'{blocks}',v_blocks,false);

  IF v_content IS NOT DISTINCT FROM v_q.content_json THEN
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_q.content_json->'blocks') block
      WHERE block->>'type'='asset'
        AND block->>'assetId'=v_source_asset.id::text
    ) THEN
      RAISE EXCEPTION '0203 trace-table canonical reference was not repaired';
    END IF;
  ELSE
    PERFORM public.set_question_structured_content_v1(
      v_q.id,v_sp.id,lower(v_sp.sha256),v_content
    );
  END IF;

  INSERT INTO public.structured_content_backfill_audits(
    question_id,source_paper_id,source_sha256,source_page,parser_version,evidence
  ) VALUES (
    v_q.id,v_sp.id,lower(v_sp.sha256),11,'q7a-trace-table-source-repair-v1',
    jsonb_build_object(
      'displayRef',v_q.display_ref,
      'sourceRef','9618/12/O/N/22 page 11',
      'repair','replace_prose_trace_table_placeholder_with_verified_source_crop',
      'sourceAssetId',v_source_asset.id::text,
      'sourceBbox',v_source_asset.source_bbox
    )
  )
  ON CONFLICT(question_id,source_sha256,parser_version) DO UPDATE
    SET source_page=excluded.source_page,
        evidence=excluded.evidence,
        created_at=now();
END
$repair$;
