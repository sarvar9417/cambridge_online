-- VF-E-000002: 9618/11/M/J/21 Q8 logic-gate tick grid source provenance.
--
-- Source proof:
--   source_paper_id = fab329b3-9fbc-43ac-938b-5d83c815a1e5
--   source_sha256   = d73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453
--   source_page     = 16
--   exact 200-DPI table bbox = [141,1007,1512,1330]
--
-- The prior asset bbox [62,465,888,655] points to the data-dictionary question
-- above Q8, not to the Q8 tick grid. This migration repairs provenance for the
-- preserved legacy/source-evidence asset and the canonical structured table
-- block. Product renderers use the canonical structured table and suppress the
-- superseded same-page legacy table, so the visual is rendered once.
--
-- Additive/fail-closed execution rule: this file is committed for staging and
-- review first. It must not be applied to production until preview evidence is
-- accepted.

DO $migration$
DECLARE
  v_source constant uuid := 'fab329b3-9fbc-43ac-938b-5d83c815a1e5';
  v_question constant uuid := '62e94632-92d3-435f-8ea2-61e8a003d6be';
  v_asset constant uuid := '168599f4-5cee-4993-a3b4-d7cecea66c43';
  v_source_sha constant text := 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453';
  v_asset_hash constant text := 'dc781f64677d717ce77a7e2eca32e3739672dcf300fff8789636c4302a030b76';
  v_old_json_md5 constant text := '567ad8acd59a2abb722aa20af6e3b444';
  v_old_bbox constant jsonb := '[62,465,888,655]'::jsonb;
  v_new_bbox constant jsonb := '[141,1007,1512,1330]'::jsonb;
  v_actual_sha text;
  v_owner uuid;
  v_page integer;
  v_bbox jsonb;
  v_hash text;
  v_json jsonb;
BEGIN
  SELECT sha256 INTO v_actual_sha FROM source_papers WHERE id=v_source;
  IF v_actual_sha IS NULL OR lower(v_actual_sha)<>v_source_sha THEN
    RAISE EXCEPTION 'VF-E-000002 source SHA drift: %',coalesce(v_actual_sha,'NULL');
  END IF;

  SELECT question_id,source_page,source_bbox,content_hash
  INTO v_owner,v_page,v_bbox,v_hash
  FROM question_assets
  WHERE id=v_asset;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VF-E-000002 asset missing';
  END IF;

  IF v_owner<>v_question OR v_page<>16 OR v_hash IS DISTINCT FROM v_asset_hash THEN
    RAISE EXCEPTION 'VF-E-000002 asset precondition drift owner=% page=% hash=%',v_owner,v_page,v_hash;
  END IF;

  SELECT content_json INTO v_json
  FROM questions
  WHERE id=v_question
    AND source_paper_id=v_source;

  IF v_json IS NULL THEN
    RAISE EXCEPTION 'VF-E-000002 canonical content missing';
  END IF;

  -- Idempotent post-state validation.
  IF v_bbox=v_new_bbox
     AND v_json#>'{blocks,1,source,bbox}'=v_new_bbox THEN
    RETURN;
  END IF;

  IF v_bbox IS DISTINCT FROM v_old_bbox THEN
    RAISE EXCEPTION 'VF-E-000002 old asset bbox drift: %',v_bbox;
  END IF;
  IF md5(v_json::text)<>v_old_json_md5 THEN
    RAISE EXCEPTION 'VF-E-000002 content_json drift: %',md5(v_json::text);
  END IF;

  -- Pin the semantic shape before editing provenance.
  IF v_json#>>'{blocks,0,type}'<>'text'
     OR v_json#>>'{blocks,0,style}'<>'task'
     OR v_json#>>'{blocks,0,source,page}'<>'16'
     OR v_json#>>'{blocks,1,type}'<>'table'
     OR v_json#>>'{blocks,1,kind}'<>'tick_grid'
     OR v_json#>>'{blocks,1,source,page}'<>'16'
     OR v_json#>'{blocks,1,headers}' <> '["Statement","AND","NAND","NOR","XOR","OR"]'::jsonb
     OR jsonb_array_length(v_json#>'{blocks,1,rows}')<>3
     OR jsonb_array_length(v_json#>'{blocks,1,editableCells}')<>15 THEN
    RAISE EXCEPTION 'VF-E-000002 canonical table semantic precondition failed';
  END IF;

  UPDATE question_assets
  SET source_bbox=v_new_bbox
  WHERE id=v_asset;

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks,1,source,bbox}',v_new_bbox,true),
      updated_at=now()
  WHERE id=v_question;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_asset
      AND question_id=v_question
      AND source_page=16
      AND source_bbox=v_new_bbox
      AND content_hash=v_asset_hash
  ) THEN
    RAISE EXCEPTION 'VF-E-000002 asset postcondition failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM questions
    WHERE id=v_question
      AND source_paper_id=v_source
      AND content_json#>'{blocks,1,source,bbox}'=v_new_bbox
      AND content_json#>'{blocks,1,headers}'='["Statement","AND","NAND","NOR","XOR","OR"]'::jsonb
      AND jsonb_array_length(content_json#>'{blocks,1,rows}')=3
      AND jsonb_array_length(content_json#>'{blocks,1,editableCells}')=15
  ) THEN
    RAISE EXCEPTION 'VF-E-000002 canonical content postcondition failed';
  END IF;
END
$migration$;
