-- Fix explicit source-page provenance for 9618/12/M/J/21 Q5(d).
-- The canonical asset row correctly says source_page=11, while the structured
-- content block incorrectly says page 10. Original QP page 11 contains the
-- matching layout.

DO $$
DECLARE
  v_paper uuid := '77905939-ac1e-441e-b68a-386f22dfcd3d'::uuid;
  v_sha text := '63c51bb1e39c8795d3dae421cf4e2a79c82a823fcfbdd817c2041b6c6c052eb1';
  v_question uuid := 'bc3a617b-3e41-4fa0-88db-4b5d3f360153'::uuid;
  v_asset uuid := 'e5e6713d-3d48-40c2-9ed1-3d64cf36faf2'::uuid;
  v_idx integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    JOIN question_assets qa ON qa.question_id=q.id
    WHERE q.id=v_question AND q.path='5.d'
      AND sp.id=v_paper AND sp.sha256=v_sha
      AND qa.id=v_asset AND qa.source_page=11
      AND qa.crop_status='ready'
      AND qa.content_hash='313e0c7bc3d6d80f37478ff185219b343656940918f06291a9cf850fa5f8ec33'
  ) THEN RAISE EXCEPTION 'vf_mj21_12_q5d_provenance_mismatch'; END IF;

  SELECT ordinality::int-1 INTO v_idx
  FROM questions q
  CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') WITH ORDINALITY b(value,ordinality)
  WHERE q.id=v_question
    AND b.value->>'type'='asset'
    AND b.value->>'assetId'=v_asset::text
  LIMIT 1;

  IF v_idx IS NULL THEN RAISE EXCEPTION 'vf_mj21_12_q5d_asset_block_missing'; END IF;

  UPDATE questions
  SET content_json=jsonb_set(content_json,ARRAY['blocks',v_idx::text,'source','page'],'11'::jsonb,false),
      updated_at=now()
  WHERE id=v_question;

  IF NOT EXISTS (
    SELECT 1 FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_question
      AND b->>'type'='asset'
      AND b->>'assetId'=v_asset::text
      AND (b->'source'->>'page')::int=11
  ) THEN RAISE EXCEPTION 'vf_mj21_12_q5d_source_page_postcondition_failed'; END IF;
END $$;