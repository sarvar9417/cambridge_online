-- Prefer the literal embedded Cambridge crop for 9618/12/M/J/21 Q1(c)(ii).
-- This asset has no storage object. Its content_md already contains the original
-- source crop embedded inside an SVG <image>, but the product repository exposes
-- coalesce(svg_markup, content_md), so the generated svg_markup currently wins.
-- Copy the source-backed inline SVG into svg_markup so QB/Live/PDF/DOCX consume
-- the literal crop without changing the asset ID.

DO $$
DECLARE
  v_paper uuid := '77905939-ac1e-441e-b68a-386f22dfcd3d'::uuid;
  v_sha text := '63c51bb1e39c8795d3dae421cf4e2a79c82a823fcfbdd817c2041b6c6c052eb1';
  v_question uuid := 'fd8b4d44-4da9-458e-9487-f8f4dfcd91e1'::uuid;
  v_asset uuid := '55a240b0-70e4-45ad-bfb7-047c55def1e0'::uuid;
  v_source_svg text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    JOIN question_assets qa ON qa.question_id=q.id
    WHERE q.id=v_question AND q.path='1.c.ii'
      AND sp.id=v_paper AND sp.sha256=v_sha
      AND qa.id=v_asset AND qa.source_page=3
      AND qa.crop_status='ready'
      AND qa.storage_path IS NULL
      AND qa.content_hash='c0ae9b01744a5d9727465b5aee025c3ffcc2852e2925b557d36cf75ad95cdb7c'
      AND qa.content_md LIKE '<svg%<image href="data:image/png;base64,%'
  ) THEN RAISE EXCEPTION 'vf_mj21_12_q1cii_source_crop_precondition_failed'; END IF;

  SELECT content_md INTO v_source_svg FROM question_assets WHERE id=v_asset;

  UPDATE question_assets
  SET svg_markup=v_source_svg,
      size_bytes=octet_length(v_source_svg),
      content_hash=encode(digest(v_source_svg,'sha256'),'hex'),
      crop_status='ready',
      crop_error=null
  WHERE id=v_asset;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_asset
      AND svg_markup=content_md
      AND svg_markup LIKE '<svg%<image href="data:image/png;base64,%'
      AND size_bytes=octet_length(svg_markup)
      AND content_hash=encode(digest(svg_markup,'sha256'),'hex')
  ) THEN RAISE EXCEPTION 'vf_mj21_12_q1cii_source_crop_postcondition_failed'; END IF;
END $$;