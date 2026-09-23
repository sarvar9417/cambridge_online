-- Source-faithful visual consumption for 9618/41/M/J/21 Q1 and Q2(c).
-- Literal review:
--  * page 2 linked-list context is a diagram-like table; production duplicates it
--    as flattened prose and lets generated svg_markup override existing inline source crops.
--  * page 7 bubble-sort pseudocode is an official monospaced completion layout,
--    but the canonical pseudocode asset is not consumed by content_json.
-- Production remains unchanged until this migration is explicitly staged/applied.

DO $$
DECLARE
  v_paper uuid := '874721d6-6c9a-4009-a192-c58b7aeef7a7'::uuid;
  v_sha text := '3ce3201d19c9147b6960a55de792c06494f4f7b97ac67852d5b6cdc3caf5f3fe';
  v_q1a uuid := '5752e4e7-d0ea-4db4-aea7-76ec04f32d4d'::uuid;
  v_q2c uuid := 'eb5576d8-8198-4436-9e54-cdb9f2de2318'::uuid;
  v_q2c_asset uuid := '3e8838b9-fbd2-4777-b7b0-535808545b36'::uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers
    WHERE id=v_paper AND kind='QP' AND sha256=v_sha AND page_count=12
  ) THEN RAISE EXCEPTION 'vf_mj21_41_source_provenance_mismatch'; END IF;

  -- Seven Q1 occurrence-specific assets already contain literal inline PNG source
  -- crops in content_md. Make those crops authoritative over generated substitutes.
  UPDATE question_assets
  SET svg_markup=content_md,
      size_bytes=octet_length(content_md),
      content_hash=encode(digest(content_md,'sha256'),'hex'),
      crop_status='ready',
      crop_error=null
  WHERE id IN (
    '461f38c9-5188-44bf-8ba6-d5a73b4bade2'::uuid,
    '6013530e-b53c-4e7b-8875-d786b51c7535'::uuid,
    'f581ae72-01cf-44ad-ab92-ed75ece1a1d9'::uuid,
    '64fdb4f5-7582-4812-9f45-531315e780cd'::uuid,
    'a616b7d4-cc17-4291-9f24-047f42fb1c67'::uuid,
    '2805b382-bd01-4218-97e8-6ad6ee2315bf'::uuid,
    '40e0fc35-f34e-414e-ae76-7cda94d855e7'::uuid
  )
  AND question_id IN (
    '5752e4e7-d0ea-4db4-aea7-76ec04f32d4d'::uuid,
    '0b4f4f5f-15e6-4b2e-94c0-41d5695b24cd'::uuid,
    '12289578-bbb5-4de2-8481-9abb2d7ed688'::uuid,
    '79f83ae2-d58b-41cc-baea-b37ccb7d9af2'::uuid,
    'ae3cd119-68da-4dba-acf8-bcfe1c60d7e6'::uuid,
    '2e51426e-4a2e-4193-8809-20e5174b6e8e'::uuid,
    '509bfc53-bdea-48d4-a1d2-7c333d012f9a'::uuid
  )
  AND source_page=2
  AND content_md LIKE '<svg%<image href="data:image/png;base64,%';

  -- Remove the flattened copy of the linked-list table from every Q1 child while
  -- preserving the existing source asset + child-specific task.
  UPDATE questions
  SET content_json=jsonb_set(
      content_json,'{blocks,0,text}',
      to_jsonb('An unordered linked list uses a 1D array to store the data. Each item in the linked list is of a record type, node, with a field data and a field nextNode. The current contents of the linked list are shown.'::text),
      false
    ),
    updated_at=now()
  WHERE id IN (
    '5752e4e7-d0ea-4db4-aea7-76ec04f32d4d'::uuid,
    '0b4f4f5f-15e6-4b2e-94c0-41d5695b24cd'::uuid,
    '12289578-bbb5-4de2-8481-9abb2d7ed688'::uuid,
    '79f83ae2-d58b-41cc-baea-b37ccb7d9af2'::uuid,
    'ae3cd119-68da-4dba-acf8-bcfe1c60d7e6'::uuid,
    '2e51426e-4a2e-4193-8809-20e5174b6e8e'::uuid,
    '509bfc53-bdea-48d4-a1d2-7c333d012f9a'::uuid
  );

  -- Q1(a)'s source crop already contains the TYPE node pseudocode; avoid a second
  -- flattened copy while retaining the actual programming instruction.
  UPDATE questions
  SET content_json=jsonb_set(
      content_json,'{blocks,2,text}',
      to_jsonb('The following is pseudocode for the record type node, as shown in the source visual. Write program code to declare the record type node. Save your program as question1. Copy and paste the program code into part 1(a) in the evidence document.'::text),
      false
    ),
    updated_at=now()
  WHERE id=v_q1a;

  -- Q2(c): expose the canonical pseudocode completion layout as an asset instead
  -- of a partial flattened text surrogate.
  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    content_json->'blocks'->0,
    jsonb_build_object(
      'text','The following bubble sort pseudocode algorithm sorts the data in theArray into descending numerical order. There are five incomplete statements.',
      'type','text','style','paragraph','source',jsonb_build_object('page',7)
    ),
    jsonb_build_object(
      'type','asset','kind','pseudocode','assetId',v_q2c_asset::text,
      'altText','Incomplete bubble-sort pseudocode with five blanks for Q2(c)',
      'source',jsonb_build_object('page',7)
    ),
    jsonb_build_object(
      'text','Write program code for the procedure bubbleSort() to sort the data in arrayData into descending order. Save your program. Copy and paste the program code into part 2(c) in the evidence document.',
      'type','text','style','task','source',jsonb_build_object('page',7)
    )
  ),false),updated_at=now()
  WHERE id=v_q2c;

  IF (
    SELECT count(*) FROM question_assets
    WHERE id IN (
      '461f38c9-5188-44bf-8ba6-d5a73b4bade2'::uuid,
      '6013530e-b53c-4e7b-8875-d786b51c7535'::uuid,
      'f581ae72-01cf-44ad-ab92-ed75ece1a1d9'::uuid,
      '64fdb4f5-7582-4812-9f45-531315e780cd'::uuid,
      'a616b7d4-cc17-4291-9f24-047f42fb1c67'::uuid,
      '2805b382-bd01-4218-97e8-6ad6ee2315bf'::uuid,
      '40e0fc35-f34e-414e-ae76-7cda94d855e7'::uuid
    )
      AND svg_markup=content_md
      AND crop_status='ready'
      AND content_hash=encode(digest(svg_markup,'sha256'),'hex')
  ) <> 7 THEN RAISE EXCEPTION 'vf_mj21_41_q1_source_crop_postcondition_failed'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM questions q CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_q2c AND b->>'type'='asset' AND b->>'assetId'=v_q2c_asset::text
  ) THEN RAISE EXCEPTION 'vf_mj21_41_q2c_asset_consumption_postcondition_failed'; END IF;
END $$;