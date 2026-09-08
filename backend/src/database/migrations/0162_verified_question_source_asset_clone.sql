-- Reuse one exact source-backed QP visual across sibling leaves that print the same context.
-- The helper never accepts arbitrary content: source and target must belong to the same
-- SHA-pinned QP and the source asset must already be renderable and source-positioned.
CREATE OR REPLACE FUNCTION public.attach_verified_question_source_asset_clone_v1(
  p_source_display_ref text,
  p_target_display_ref text,
  p_expected_source_sha256 text,
  p_insert_after integer,
  p_alt_text text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_source_question uuid; v_target_question uuid; v_source_paper uuid; v_target_paper uuid;
  v_source_sha text; v_target_sha text; v_content jsonb; v_asset public.question_assets%ROWTYPE;
  v_new_asset uuid; v_blocks jsonb; v_count integer;
BEGIN
  SELECT q.id,q.source_paper_id,lower(sp.sha256) INTO STRICT v_source_question,v_source_paper,v_source_sha
  FROM public.questions q JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  WHERE q.display_ref=p_source_display_ref AND q.marks IS NOT NULL;
  SELECT q.id,q.source_paper_id,lower(sp.sha256),q.content_json INTO STRICT v_target_question,v_target_paper,v_target_sha,v_content
  FROM public.questions q JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  WHERE q.display_ref=p_target_display_ref AND q.marks IS NOT NULL;
  IF v_source_sha<>lower(p_expected_source_sha256) OR v_target_sha<>lower(p_expected_source_sha256)
     OR v_source_paper<>v_target_paper THEN
    RAISE EXCEPTION 'question_source_asset_clone_provenance_mismatch:%->%',p_source_display_ref,p_target_display_ref;
  END IF;
  SELECT qa.* INTO STRICT v_asset FROM public.question_assets qa
  WHERE qa.question_id=v_source_question
    AND qa.source_page IS NOT NULL
    AND (coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)' OR nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL)
  ORDER BY qa.sort_order DESC,qa.id DESC LIMIT 1;
  IF v_content IS NULL OR (v_content->>'version')::int<>1 THEN RAISE EXCEPTION 'target_structured_content_missing:%',p_target_display_ref; END IF;
  INSERT INTO public.question_assets(question_id,kind,storage_path,content_md,alt_text,sort_order,source_page,latex_source,svg_markup,size_bytes,content_hash,source_bbox,crop_status,crop_error)
  VALUES(v_target_question,v_asset.kind,v_asset.storage_path,v_asset.content_md,coalesce(nullif(btrim(p_alt_text),''),v_asset.alt_text),(SELECT coalesce(max(sort_order),-1)+1 FROM public.question_assets WHERE question_id=v_target_question),v_asset.source_page,v_asset.latex_source,v_asset.svg_markup,v_asset.size_bytes,v_asset.content_hash,v_asset.source_bbox,v_asset.crop_status,v_asset.crop_error)
  ON CONFLICT DO NOTHING;
  SELECT qa.id INTO STRICT v_new_asset FROM public.question_assets qa
  WHERE qa.question_id=v_target_question AND qa.content_hash=v_asset.content_hash
  ORDER BY qa.id LIMIT 1;
  SELECT count(*) INTO v_count FROM jsonb_array_elements(v_content->'blocks');
  IF p_insert_after<1 OR p_insert_after>v_count THEN RAISE EXCEPTION 'target_insert_ordinal_invalid:%',p_target_display_ref; END IF;
  SELECT jsonb_agg(x.block ORDER BY x.sort_key) INTO v_blocks FROM (
    SELECT b.block,CASE WHEN b.ordinality<=p_insert_after THEN b.ordinality*4 ELSE b.ordinality*4+2 END sort_key
    FROM jsonb_array_elements(v_content->'blocks') WITH ORDINALITY b(block,ordinality)
    WHERE NOT (b.block->>'type'='asset' AND b.block->>'assetId'=v_new_asset::text)
    UNION ALL
    SELECT jsonb_build_object('type','asset','assetId',v_new_asset::text,'kind',v_asset.kind::text,'altText',coalesce(nullif(btrim(p_alt_text),''),v_asset.alt_text),'source',jsonb_build_object('page',v_asset.source_page)),p_insert_after*4+1
  ) x;
  v_content:=jsonb_set(v_content,'{blocks}',v_blocks,false);
  PERFORM public.set_question_structured_content_v1(v_target_question,v_target_paper,v_target_sha,v_content);
  RETURN jsonb_build_object('sourceRef',p_source_display_ref,'targetRef',p_target_display_ref,'assetId',v_new_asset,'contentHash',v_asset.content_hash,'sourcePage',v_asset.source_page);
END
$function$;
REVOKE ALL ON FUNCTION public.attach_verified_question_source_asset_clone_v1(text,text,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.attach_verified_question_source_asset_clone_v1(text,text,text,integer,text) TO service_role;
INSERT INTO public.schema_migrations(name) VALUES('0162_verified_question_source_asset_clone.sql') ON CONFLICT(name) DO NOTHING;
