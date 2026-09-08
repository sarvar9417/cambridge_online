-- 2021 9618 strict QP/MS source-fidelity completion.
--
-- This migration closes source-backed information loss that ordinary text
-- extraction cannot preserve: printed tables, syntax/logic diagrams, matching
-- lines, a flowchart, an ER diagram and K-map grouping. Every write is pinned
-- to the exact original QP/MS SHA-256 and natural Cambridge display reference.
-- Binary crops are embedded as inline SVG-wrapped PNGs, the same portable
-- representation already supported by the question asset renderer.

CREATE TABLE IF NOT EXISTS public.mark_scheme_assets(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_scheme_id uuid NOT NULL REFERENCES public.mark_schemes(id) ON DELETE CASCADE,
  source_paper_id uuid NOT NULL REFERENCES public.source_papers(id) ON DELETE RESTRICT,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  kind text NOT NULL CHECK (kind IN ('diagram','image','matching','flowchart','table','kmap','er_diagram')),
  content_md text NOT NULL CHECK (content_md ~* '^\s*<svg(?:\s|>)'),
  alt_text text NOT NULL,
  source_page integer NOT NULL CHECK (source_page>0),
  source_bbox jsonb NOT NULL CHECK (jsonb_typeof(source_bbox)='array' AND jsonb_array_length(source_bbox)=4),
  structure_json jsonb NOT NULL CHECK (jsonb_typeof(structure_json)='object'),
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order>=0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mark_scheme_id,content_hash)
);
CREATE INDEX IF NOT EXISTS mark_scheme_assets_mark_scheme_idx
  ON public.mark_scheme_assets(mark_scheme_id,sort_order,id);

CREATE OR REPLACE FUNCTION public.validate_mark_scheme_source_asset_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_ms_source uuid;
  v_kind text;
  v_sha text;
BEGIN
  SELECT ms.source_paper_id INTO v_ms_source
  FROM public.mark_schemes ms WHERE ms.id=NEW.mark_scheme_id;
  IF v_ms_source IS NULL OR v_ms_source<>NEW.source_paper_id THEN
    RAISE EXCEPTION 'mark_scheme_asset_source_paper_mismatch';
  END IF;
  SELECT sp.kind::text,lower(sp.sha256) INTO v_kind,v_sha
  FROM public.source_papers sp WHERE sp.id=NEW.source_paper_id;
  IF v_kind<>'MS' THEN RAISE EXCEPTION 'mark_scheme_asset_requires_ms_source'; END IF;
  IF v_sha<>lower(NEW.source_sha256) THEN RAISE EXCEPTION 'mark_scheme_asset_source_sha_mismatch'; END IF;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS mark_scheme_assets_source_guard ON public.mark_scheme_assets;
CREATE TRIGGER mark_scheme_assets_source_guard
BEFORE INSERT OR UPDATE OF mark_scheme_id,source_paper_id,source_sha256
ON public.mark_scheme_assets
FOR EACH ROW EXECUTE FUNCTION public.validate_mark_scheme_source_asset_v1();

REVOKE ALL ON TABLE public.mark_scheme_assets FROM anon,authenticated;
GRANT SELECT ON TABLE public.mark_scheme_assets TO service_role;
REVOKE ALL ON FUNCTION public.validate_mark_scheme_source_asset_v1() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.attach_verified_question_source_asset_v2(
  p_display_ref text,
  p_expected_source_sha256 text,
  p_kind text,
  p_png_base64 text,
  p_width integer,
  p_height integer,
  p_source_page integer,
  p_source_bbox jsonb,
  p_alt_text text,
  p_insert_after integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions','pg_temp'
AS $function$
DECLARE
  v_question_id uuid;
  v_source_paper_id uuid;
  v_sha text;
  v_content jsonb;
  v_png bytea;
  v_svg text;
  v_hash text;
  v_asset_id uuid;
  v_blocks jsonb;
  v_count integer;
BEGIN
  SELECT q.id,q.source_paper_id,lower(sp.sha256),q.content_json
    INTO STRICT v_question_id,v_source_paper_id,v_sha,v_content
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  WHERE q.display_ref=p_display_ref AND q.marks IS NOT NULL;

  IF v_sha<>lower(p_expected_source_sha256) THEN
    RAISE EXCEPTION 'question_source_sha_mismatch:%',p_display_ref;
  END IF;
  IF p_kind NOT IN ('image','diagram') THEN RAISE EXCEPTION 'unsupported_question_source_asset_kind'; END IF;
  IF p_width<50 OR p_height<50 OR p_source_page<1 THEN RAISE EXCEPTION 'invalid_question_source_crop_geometry'; END IF;
  IF jsonb_typeof(p_source_bbox)<>'array' OR jsonb_array_length(p_source_bbox)<>4 THEN
    RAISE EXCEPTION 'question_source_bbox_invalid';
  END IF;
  IF v_content IS NULL OR (v_content->>'version')::int<>1 THEN
    RAISE EXCEPTION 'question_structured_content_missing:%',p_display_ref;
  END IF;

  v_png:=decode(p_png_base64,'base64');
  IF octet_length(v_png)<100 OR octet_length(v_png)>2000000
     OR substring(v_png from 1 for 8)<>decode('89504e470d0a1a0a','hex') THEN
    RAISE EXCEPTION 'question_source_crop_invalid_png:%',p_display_ref;
  END IF;
  v_svg:='<svg xmlns="http://www.w3.org/2000/svg" width="'||p_width||'" height="'||p_height||'" viewBox="0 0 '||p_width||' '||p_height||'"><image href="data:image/png;base64,'||p_png_base64||'" width="'||p_width||'" height="'||p_height||'"/></svg>';
  v_hash:=encode(digest(convert_to(v_svg,'UTF8'),'sha256'),'hex');

  SELECT qa.id INTO v_asset_id
  FROM public.question_assets qa
  WHERE qa.question_id=v_question_id AND qa.content_hash=v_hash
  ORDER BY qa.id LIMIT 1;

  IF v_asset_id IS NULL THEN
    INSERT INTO public.question_assets(
      question_id,kind,storage_path,content_md,alt_text,sort_order,source_page,
      size_bytes,content_hash,source_bbox,crop_status
    ) VALUES (
      v_question_id,p_kind::answer_kind,NULL,v_svg,p_alt_text,
      (SELECT coalesce(max(sort_order),-1)+1 FROM public.question_assets WHERE question_id=v_question_id),
      p_source_page,octet_length(v_png),v_hash,p_source_bbox,'ready'
    ) RETURNING id INTO v_asset_id;
  END IF;

  SELECT count(*) INTO v_count FROM jsonb_array_elements(v_content->'blocks');
  IF p_insert_after<1 OR p_insert_after>v_count THEN
    RAISE EXCEPTION 'question_source_insert_ordinal_invalid:%:%/%',p_display_ref,p_insert_after,v_count;
  END IF;

  SELECT jsonb_agg(x.block ORDER BY x.sort_key) INTO v_blocks
  FROM (
    SELECT b.block,
      CASE WHEN b.ordinality<=p_insert_after THEN (b.ordinality*4)::numeric ELSE (b.ordinality*4+2)::numeric END sort_key
    FROM jsonb_array_elements(v_content->'blocks') WITH ORDINALITY AS b(block,ordinality)
    WHERE NOT (b.block->>'type'='asset' AND b.block->>'assetId'=v_asset_id::text)
    UNION ALL
    SELECT jsonb_build_object(
      'type','asset','assetId',v_asset_id::text,'kind',p_kind,'altText',p_alt_text,
      'source',jsonb_build_object('page',p_source_page)
    ),(p_insert_after*4+1)::numeric
  ) x;

  v_content:=jsonb_set(v_content,'{blocks}',v_blocks,false);
  PERFORM public.set_question_structured_content_v1(
    v_question_id,v_source_paper_id,v_sha,v_content
  );

  UPDATE public.validation_findings
  SET resolved_at=coalesce(resolved_at,now()),
      resolution=CASE WHEN resolved_at IS NULL THEN
        'Resolved by exact 2021 source crop asset '||v_asset_id::text||' pinned to source SHA-256 '||v_sha||'.'
        ELSE resolution END
  WHERE ref_table='questions' AND ref_id=v_question_id
    AND rule_code IN ('source_visual_required_but_missing','source_structure_required_but_missing_table','source_structure_required_but_missing_layout');

  RETURN jsonb_build_object('displayRef',p_display_ref,'questionId',v_question_id,'assetId',v_asset_id,'sourceSha256',v_sha,'sourcePage',p_source_page,'contentHash',v_hash);
END
$function$;

REVOKE ALL ON FUNCTION public.attach_verified_question_source_asset_v2(text,text,text,text,integer,integer,integer,jsonb,text,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.attach_verified_question_source_asset_v2(text,text,text,text,integer,integer,integer,jsonb,text,integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_mark_scheme_source_asset_v1(
  p_display_ref text,
  p_expected_source_sha256 text,
  p_kind text,
  p_png_base64 text,
  p_width integer,
  p_height integer,
  p_source_page integer,
  p_source_bbox jsonb,
  p_alt_text text,
  p_structure_json jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions','pg_temp'
AS $function$
DECLARE
  v_mark_scheme_id uuid;
  v_source_paper_id uuid;
  v_sha text;
  v_png bytea;
  v_svg text;
  v_hash text;
  v_asset_id uuid;
BEGIN
  SELECT ms.id,ms.source_paper_id,lower(sp.sha256)
    INTO STRICT v_mark_scheme_id,v_source_paper_id,v_sha
  FROM public.questions q
  JOIN public.mark_schemes ms ON ms.question_id=q.id
  JOIN public.source_papers sp ON sp.id=ms.source_paper_id AND sp.kind='MS'::paper_kind
  WHERE q.display_ref=p_display_ref AND q.marks IS NOT NULL;

  IF v_sha<>lower(p_expected_source_sha256) THEN
    RAISE EXCEPTION 'mark_scheme_source_sha_mismatch:%',p_display_ref;
  END IF;
  IF p_kind NOT IN ('diagram','image','matching','flowchart','table','kmap','er_diagram') THEN
    RAISE EXCEPTION 'unsupported_mark_scheme_asset_kind';
  END IF;
  IF p_width<50 OR p_height<50 OR p_source_page<1 THEN RAISE EXCEPTION 'invalid_mark_scheme_source_crop_geometry'; END IF;
  IF jsonb_typeof(p_source_bbox)<>'array' OR jsonb_array_length(p_source_bbox)<>4 THEN
    RAISE EXCEPTION 'mark_scheme_source_bbox_invalid';
  END IF;
  IF jsonb_typeof(p_structure_json)<>'object' THEN RAISE EXCEPTION 'mark_scheme_structure_required'; END IF;

  v_png:=decode(p_png_base64,'base64');
  IF octet_length(v_png)<100 OR octet_length(v_png)>2000000
     OR substring(v_png from 1 for 8)<>decode('89504e470d0a1a0a','hex') THEN
    RAISE EXCEPTION 'mark_scheme_source_crop_invalid_png:%',p_display_ref;
  END IF;
  v_svg:='<svg xmlns="http://www.w3.org/2000/svg" width="'||p_width||'" height="'||p_height||'" viewBox="0 0 '||p_width||' '||p_height||'"><image href="data:image/png;base64,'||p_png_base64||'" width="'||p_width||'" height="'||p_height||'"/></svg>';
  v_hash:=encode(digest(convert_to(v_svg,'UTF8'),'sha256'),'hex');

  INSERT INTO public.mark_scheme_assets(
    mark_scheme_id,source_paper_id,source_sha256,kind,content_md,alt_text,source_page,
    source_bbox,structure_json,content_hash,sort_order
  ) VALUES (
    v_mark_scheme_id,v_source_paper_id,v_sha,p_kind,v_svg,p_alt_text,p_source_page,
    p_source_bbox,p_structure_json,v_hash,
    (SELECT coalesce(max(sort_order),-1)+1 FROM public.mark_scheme_assets WHERE mark_scheme_id=v_mark_scheme_id)
  )
  ON CONFLICT(mark_scheme_id,content_hash) DO UPDATE SET
    source_paper_id=EXCLUDED.source_paper_id,
    source_sha256=EXCLUDED.source_sha256,
    kind=EXCLUDED.kind,
    content_md=EXCLUDED.content_md,
    alt_text=EXCLUDED.alt_text,
    source_page=EXCLUDED.source_page,
    source_bbox=EXCLUDED.source_bbox,
    structure_json=EXCLUDED.structure_json
  RETURNING id INTO v_asset_id;

  INSERT INTO public.mark_scheme_source_audits(
    mark_scheme_id,source_paper_id,audit_version,source_sha256,source_page,result,evidence,audited_at
  ) VALUES (
    v_mark_scheme_id,v_source_paper_id,'9618-ms-source-fidelity-v1',v_sha,p_source_page,'verified',
    jsonb_build_object(
      'displayRef',p_display_ref,'assetId',v_asset_id,'assetKind',p_kind,
      'sourceVisualPreserved',true,'structureRecorded',true,'structure',p_structure_json,
      'proofMode','exact_original_ms_crop_sha_pinned'
    ),now()
  )
  ON CONFLICT(mark_scheme_id,audit_version,source_sha256) DO UPDATE SET
    source_paper_id=EXCLUDED.source_paper_id,
    source_page=EXCLUDED.source_page,
    result='verified',
    evidence=EXCLUDED.evidence,
    audited_at=now();

  RETURN jsonb_build_object('displayRef',p_display_ref,'markSchemeId',v_mark_scheme_id,'assetId',v_asset_id,'sourceSha256',v_sha,'sourcePage',p_source_page,'contentHash',v_hash);
END
$function$;

REVOKE ALL ON FUNCTION public.upsert_mark_scheme_source_asset_v1(text,text,text,text,integer,integer,integer,jsonb,text,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_mark_scheme_source_asset_v1(text,text,text,text,integer,integer,integer,jsonb,text,jsonb)
  TO service_role;

INSERT INTO public.schema_migrations(name) VALUES('0161_mark_scheme_source_assets.sql') ON CONFLICT(name) DO NOTHING;
