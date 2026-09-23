-- 9618/11/O/N/21 Q1(a) + Q3 visual-consumption cleanup.
-- Literal source review at 180 DPI:
--  * page 2 Q1(a) is a matching-box layout; flattened labels duplicate the source visual.
--  * page 4 Q3(a)/(b) share one logic circuit; Q3(b) then has its own truth table.
--  * page 5 Q3(c) refers back to the given circuit and contains a symbol/truth-table answer layout.
-- Production remains unchanged until this migration is explicitly staged/applied.

DO $$
DECLARE
  v_paper uuid := 'e29be1d7-a525-429a-a837-a36ca8a94a4f'::uuid;
  v_sha text := '69922d70a5e16ed0716a3e741e4addf2e2723da05d47f03ac9288705aac799f9';
  v_q1a uuid := 'f66f8981-5864-451d-95d1-2ffc3fbeeeaf'::uuid;
  v_q3a uuid := '87c13534-7d5e-47d8-8643-b5bf6ad06818'::uuid;
  v_q3b uuid := '388c1587-f564-4b0c-99b5-9b20c0d5a5f6'::uuid;
  v_q3c uuid := '717680df-4a3e-4184-b51d-eba2f037f241'::uuid;
  v_q3c_circuit uuid := '0a0770fc-504a-4025-b562-315d055f10c3'::uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers
    WHERE id=v_paper AND kind='QP' AND sha256=v_sha AND page_count=16
  ) THEN RAISE EXCEPTION 'vf_on21_11_source_provenance_mismatch'; END IF;

  -- Q1(a): source visual carries all values/boxes; keep only the exact instruction.
  UPDATE questions
  SET content_json=jsonb_set(
    content_json,'{blocks,0,text}',
    to_jsonb('Draw one line from each binary value to its equivalent (same) value on the right.'::text),
    false
  ),updated_at=now()
  WHERE id=v_q1a;

  -- Q3(a): source crop carries A/B/C/X and all gate geometry.
  UPDATE questions
  SET content_json=jsonb_set(
    content_json,'{blocks,0,text}',
    to_jsonb('A logic circuit is shown:'::text),
    false
  ),updated_at=now()
  WHERE id=v_q3a;

  -- Q3(b): keep circuit asset and source truth-table asset; remove flattened table surrogate.
  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','A logic circuit is shown:','type','text','style','paragraph','source',jsonb_build_object('page',4)),
    content_json->'blocks'->1,
    jsonb_build_object('text','Complete the truth table for the given logic circuit.','type','text','style','task','source',jsonb_build_object('page',4)),
    content_json->'blocks'->3
  ),false),updated_at=now()
  WHERE id=v_q3b;

  -- Q3(c): the original page 5 does not redraw the circuit. The platform keeps a
  -- preceding-source visual for standalone usability, so give that duplicated
  -- visual its correct provenance (page 4), then preserve page-5 answer layout.
  UPDATE question_assets
  SET source_page=4,
      source_bbox='[153,706,1542,854]'::jsonb
  WHERE id=v_q3c_circuit
    AND question_id=v_q3c
    AND content_hash='f3dc5616c0b8fe126a4d9f489be7b0394b654c1aa308c64bb51acc6bc72d1b0d';

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object(
      'type','asset','kind','logic_circuit','assetId',v_q3c_circuit::text,
      'altText','Preceding Cambridge logic circuit from page 4 for 9618/11/O/N/21 Q3(c)',
      'source',jsonb_build_object('page',4)
    ),
    jsonb_build_object(
      'text','Identify one logic gate not used in the given logic circuit. Draw the symbol for the logic gate and complete its truth table.',
      'type','text','style','task','source',jsonb_build_object('page',5)
    ),
    content_json->'blocks'->3
  ),false),updated_at=now()
  WHERE id=v_q3c;

  -- Guard all source-backed assets used by this tranche.
  IF (
    SELECT count(*)
    FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    JOIN question_assets qa ON qa.id::text=b->>'assetId'
    WHERE q.id IN (v_q1a,v_q3a,v_q3b,v_q3c)
      AND b->>'type'='asset'
      AND qa.crop_status='ready'
      AND qa.storage_path IS NOT NULL
  ) <> 6 THEN RAISE EXCEPTION 'vf_on21_11_q1_q3_asset_consumption_postcondition_failed'; END IF;

  IF EXISTS (
    SELECT 1 FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id IN (v_q1a,v_q3a,v_q3b,v_q3c)
      AND b->>'type' IN ('text','task')
      AND (
        b->>'text' LIKE '%1024 mebibytes%8192 bits%'
        OR b->>'text' LIKE '%Working space%A%B%C%X%'
        OR b->>'text' LIKE '%Truth table:%A%B%Output%'
      )
  ) THEN RAISE EXCEPTION 'vf_on21_11_q1_q3_flattened_visual_postcondition_failed'; END IF;
END $$;