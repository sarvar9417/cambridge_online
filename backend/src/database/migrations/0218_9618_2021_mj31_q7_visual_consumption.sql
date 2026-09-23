-- Source-faithful Q7 consumption repair for 9618/31/M/J/21.
-- Literal review of source page 9 found:
--  * the canonical logic-circuit source crop already exists inline in content_md;
--  * current content_json duplicates the circuit as flattened ASCII-like text;
--  * Q7(c) incorrectly consumes an unrelated truth-table asset.
-- This migration makes the source crop authoritative and normalises isolated
-- Q7(a)/(b)/(c) block order without changing source meaning.

DO $$
DECLARE
  v_paper uuid := '5861419d-e79b-4eb2-8070-d72fb07f62cb'::uuid;
  v_sha text := '82f001cd257ae2a2a57b5f47289b9a007b23b48db5496dda4a609c5ed2b5ab9e';
  v_q7a uuid := '1a9bf2b4-514f-4b19-9791-ab46fd16e803'::uuid;
  v_q7b uuid := 'bb3a2b07-f25b-4374-a9b3-6569ec28571a'::uuid;
  v_q7c uuid := '5f3dd926-cd1a-4a6c-9319-b3aa8a8d0cd2'::uuid;
  v_d7a uuid := '05e2a534-5f17-4f8f-81a7-ca9c29da9da3'::uuid;
  v_t7a uuid := '6b3173d3-a222-4510-9735-e63bc677dcd1'::uuid;
  v_d7b uuid := 'd28d82a4-5c7e-4f5c-b4b2-7dfd1aa50ada'::uuid;
  v_d7c uuid := '21dcacf2-9500-4034-b8eb-b05d94cf840a'::uuid;
  v_wrong7c uuid := '18002b52-06a7-4e04-a08b-26dbdc062cee'::uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers WHERE id=v_paper AND kind='QP' AND sha256=v_sha AND page_count=12
  ) THEN RAISE EXCEPTION 'vf_mj21_31_q7_source_provenance_mismatch'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_d7a AND question_id=v_q7a AND source_page=9 AND crop_status='ready'
      AND content_md LIKE '<svg%<image href="data:image/png;base64,%'
      AND content_hash='7ce18e2f931c7917df584f7dcf06c96d98f355b2089109ef7abd13e9464a9b6b'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_d7b AND question_id=v_q7b AND source_page=9 AND crop_status='ready'
      AND content_md LIKE '<svg%<image href="data:image/png;base64,%'
      AND content_hash='7ce18e2f931c7917df584f7dcf06c96d98f355b2089109ef7abd13e9464a9b6b'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_d7c AND question_id=v_q7c AND source_page=9 AND crop_status='ready'
      AND content_md LIKE '<svg%<image href="data:image/png;base64,%'
      AND content_hash='7ce18e2f931c7917df584f7dcf06c96d98f355b2089109ef7abd13e9464a9b6b'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_t7a AND question_id=v_q7a AND source_page=9
      AND content_hash='3d46965bc2c7ba2c9397376a27371a58b530bfad01e79b01b2d0fbb68e18ef87'
  ) THEN RAISE EXCEPTION 'vf_mj21_31_q7_asset_provenance_mismatch'; END IF;

  -- For diagram rows without a storage URL, the repository exposes svg_markup
  -- before content_md. Copy the literal inline source crop into svg_markup.
  UPDATE question_assets
  SET svg_markup=content_md,
      size_bytes=octet_length(content_md),
      content_hash=encode(digest(content_md,'sha256'),'hex'),
      crop_status='ready',
      crop_error=null
  WHERE id IN (v_d7a,v_d7b,v_d7c);

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','The diagram shows a logic circuit.','type','text','style','paragraph','source',jsonb_build_object('page',9)),
    jsonb_build_object('type','asset','kind','diagram','assetId',v_d7a::text,'altText','Original Cambridge logic circuit for 9618/31/M/J/21 Q7(a)','source',jsonb_build_object('page',9)),
    jsonb_build_object('text','Complete the truth table for the given logic circuit. Show your working.','type','text','style','task','source',jsonb_build_object('page',9)),
    jsonb_build_object('type','asset','kind','table','assetId',v_t7a::text,'altText','Blank full-adder truth table with working columns P, Q, R and outputs Y, Z','source',jsonb_build_object('page',9))
  ),false),updated_at=now()
  WHERE id=v_q7a;

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','The diagram shows a logic circuit.','type','text','style','paragraph','source',jsonb_build_object('page',9)),
    jsonb_build_object('type','asset','kind','diagram','assetId',v_d7b::text,'altText','Original Cambridge logic circuit for 9618/31/M/J/21 Q7(b)','source',jsonb_build_object('page',9)),
    jsonb_build_object('text','State the name of the logic circuit.','type','text','style','task','source',jsonb_build_object('page',9)),
    jsonb_build_object('type','answer_area','kind','lines','lines',1,'source',jsonb_build_object('page',9))
  ),false),updated_at=now()
  WHERE id=v_q7b;

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','The diagram shows a logic circuit.','type','text','style','paragraph','source',jsonb_build_object('page',9)),
    jsonb_build_object('type','asset','kind','diagram','assetId',v_d7c::text,'altText','Original Cambridge logic circuit for 9618/31/M/J/21 Q7(c)','source',jsonb_build_object('page',9)),
    jsonb_build_object('text','Write the Boolean expressions for the two outputs Y and Z in the truth table as sum-of-products and state the purpose of each output.','type','text','style','task','source',jsonb_build_object('page',9)),
    jsonb_build_object('type','answer_area','kind','lines','lines',4,'source',jsonb_build_object('page',9))
  ),false),updated_at=now()
  WHERE id=v_q7c;

  IF EXISTS (
    SELECT 1 FROM questions q CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_q7c AND b->>'type'='asset' AND b->>'assetId'=v_wrong7c::text
  ) THEN RAISE EXCEPTION 'vf_mj21_31_q7c_wrong_truth_table_still_consumed'; END IF;

  IF (
    SELECT count(*) FROM questions q CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_q7a AND b->>'type'='asset'
  ) <> 2 THEN RAISE EXCEPTION 'vf_mj21_31_q7a_asset_postcondition_failed'; END IF;
END $$;