-- Safe, ID-preserving repair contract for source-fidelity defects.
--
-- The repair worker must prove that it is using the same original QP that was
-- ingested by supplying the source_paper id and its recorded SHA-256. The RPC
-- only adds a renderable asset to the existing question id; it never replaces
-- the question row or assignment references.

CREATE OR REPLACE FUNCTION public.repair_question_source_asset_v1(
  p_question_id uuid,
  p_source_paper_id uuid,
  p_expected_source_sha256 text,
  p_asset jsonb,
  p_restore_approval boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_actual_source_paper_id uuid;
  v_actual_sha256 text;
  v_source_kind text;
  v_status review_status;
  v_kind text;
  v_content_md text;
  v_storage_path text;
  v_alt_text text;
  v_source_page integer;
  v_source_bbox jsonb;
  v_crop_status text;
  v_content_hash text;
  v_sort_order integer;
  v_asset_id uuid;
  v_existing boolean := false;
  v_visual boolean;
  v_renderable boolean;
  v_resolved_rules text[] := ARRAY[]::text[];
  v_remaining_errors integer;
  v_restored boolean := false;
BEGIN
  IF p_asset IS NULL OR jsonb_typeof(p_asset) <> 'object' THEN
    RAISE EXCEPTION 'asset payload must be a JSON object' USING ERRCODE='22023';
  END IF;

  SELECT q.source_paper_id,sp.sha256,sp.kind::text,q.status
  INTO v_actual_source_paper_id,v_actual_sha256,v_source_kind,v_status
  FROM questions q
  JOIN source_papers sp ON sp.id=q.source_paper_id
  WHERE q.id=p_question_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'question not found' USING ERRCODE='P0002';
  END IF;
  IF v_source_kind <> 'QP' THEN
    RAISE EXCEPTION 'source asset repair is restricted to QP questions' USING ERRCODE='22023';
  END IF;
  IF v_actual_source_paper_id <> p_source_paper_id THEN
    RAISE EXCEPTION 'source paper does not match question' USING ERRCODE='22023';
  END IF;
  IF nullif(trim(coalesce(v_actual_sha256,'')),'') IS NULL THEN
    RAISE EXCEPTION 'source paper has no recorded sha256' USING ERRCODE='22023';
  END IF;
  IF lower(trim(v_actual_sha256)) <> lower(trim(coalesce(p_expected_source_sha256,''))) THEN
    RAISE EXCEPTION 'source sha256 mismatch' USING ERRCODE='22023';
  END IF;

  v_kind := lower(trim(coalesce(p_asset->>'kind','')));
  IF v_kind NOT IN ('table','image','diagram') THEN
    RAISE EXCEPTION 'repair asset kind must be table, image, or diagram' USING ERRCODE='22023';
  END IF;

  v_content_md := nullif(trim(coalesce(p_asset->>'contentMd','')),'');
  v_storage_path := nullif(trim(coalesce(p_asset->>'storagePath','')),'');
  v_alt_text := trim(coalesce(p_asset->>'altText','Source-faithful Cambridge question asset'));
  v_content_hash := nullif(trim(coalesce(p_asset->>'contentHash','')),'');
  v_crop_status := lower(trim(coalesce(p_asset->>'cropStatus',CASE WHEN v_storage_path IS NULL THEN 'not_needed' ELSE 'ready' END)));

  IF p_asset ? 'sourcePage' AND nullif(trim(coalesce(p_asset->>'sourcePage','')),'') IS NOT NULL THEN
    v_source_page := (p_asset->>'sourcePage')::integer;
    IF v_source_page <= 0 THEN RAISE EXCEPTION 'sourcePage must be positive' USING ERRCODE='22023'; END IF;
  END IF;
  v_source_bbox := p_asset->'sourceBbox';
  IF v_source_bbox IS NOT NULL AND (
    jsonb_typeof(v_source_bbox) <> 'array' OR jsonb_array_length(v_source_bbox) <> 4
  ) THEN
    RAISE EXCEPTION 'sourceBbox must be [x1,y1,x2,y2]' USING ERRCODE='22023';
  END IF;
  IF v_crop_status NOT IN ('not_needed','pending','ready','failed') THEN
    RAISE EXCEPTION 'invalid cropStatus' USING ERRCODE='22023';
  END IF;

  v_visual := v_kind IN ('image','diagram');
  v_renderable := CASE
    WHEN v_kind='table' THEN v_content_md IS NOT NULL
    ELSE v_content_md IS NOT NULL OR v_storage_path IS NOT NULL
  END;
  IF NOT v_renderable THEN
    RAISE EXCEPTION 'repair asset is not renderable' USING ERRCODE='22023';
  END IF;

  -- Idempotency: reuse an exact existing repair instead of duplicating assets.
  SELECT qa.id INTO v_asset_id
  FROM question_assets qa
  WHERE qa.question_id=p_question_id
    AND qa.kind::text=v_kind
    AND (
      (v_content_hash IS NOT NULL AND qa.content_hash=v_content_hash)
      OR (
        v_content_hash IS NULL
        AND qa.content_md IS NOT DISTINCT FROM v_content_md
        AND qa.storage_path IS NOT DISTINCT FROM v_storage_path
        AND qa.source_page IS NOT DISTINCT FROM v_source_page
      )
    )
  ORDER BY qa.sort_order,qa.id
  LIMIT 1;

  IF v_asset_id IS NOT NULL THEN
    v_existing := true;
  ELSE
    SELECT coalesce(max(sort_order),-1)+1 INTO v_sort_order
    FROM question_assets WHERE question_id=p_question_id;

    INSERT INTO question_assets(
      question_id,kind,storage_path,content_md,alt_text,sort_order,source_page,
      content_hash,source_bbox,crop_status
    ) VALUES (
      p_question_id,v_kind::answer_kind,v_storage_path,v_content_md,v_alt_text,v_sort_order,
      v_source_page,v_content_hash,v_source_bbox,v_crop_status
    ) RETURNING id INTO v_asset_id;
  END IF;

  -- Only resolve the rules that the newly verified asset can actually satisfy.
  UPDATE validation_findings
  SET resolved_at=now(),
      resolution=concat('Resolved by verified source asset ',v_asset_id::text,' from source SHA-256 ',v_actual_sha256,'.')
  WHERE ref_table='questions'
    AND ref_id=p_question_id
    AND resolved_at IS NULL
    AND (
      rule_code IN ('source_structure_required_but_missing_table','source_structure_required_but_missing_layout')
      OR (v_visual AND rule_code='source_visual_required_but_missing')
    );

  SELECT coalesce(array_agg(vf.rule_code ORDER BY vf.rule_code),ARRAY[]::text[])
  INTO v_resolved_rules
  FROM validation_findings vf
  WHERE vf.ref_table='questions'
    AND vf.ref_id=p_question_id
    AND vf.resolved_at IS NOT NULL
    AND vf.resolution LIKE 'Resolved by verified source asset ' || v_asset_id::text || '%';

  SELECT count(*) INTO v_remaining_errors
  FROM validation_findings vf
  WHERE vf.ref_table='questions'
    AND vf.ref_id=p_question_id
    AND vf.resolved_at IS NULL
    AND vf.severity='error';

  UPDATE questions
  SET notes=CASE
        WHEN coalesce(notes,'') LIKE '%source-fidelity-repair: asset ' || v_asset_id::text || '%' THEN notes
        ELSE concat_ws(E'\n',nullif(notes,''),concat('source-fidelity-repair: asset ',v_asset_id::text,' verified against source SHA-256 ',v_actual_sha256,'.'))
      END,
      updated_at=now()
  WHERE id=p_question_id;

  IF p_restore_approval AND v_status='needs_review' AND v_remaining_errors=0 THEN
    UPDATE questions
    SET status='approved'::review_status,
        updated_at=now()
    WHERE id=p_question_id;
    v_restored := true;
  END IF;

  RETURN jsonb_build_object(
    'questionId',p_question_id,
    'assetId',v_asset_id,
    'existingAsset',v_existing,
    'sourceVerified',true,
    'resolvedRules',to_jsonb(v_resolved_rules),
    'remainingErrors',v_remaining_errors,
    'approvalRestored',v_restored
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.repair_question_source_asset_v1(uuid,uuid,text,jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.repair_question_source_asset_v1(uuid,uuid,text,jsonb,boolean) TO service_role;
