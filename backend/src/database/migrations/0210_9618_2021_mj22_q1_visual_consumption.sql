-- 9618/22/M/J/21 Q1 source-table consumption repair.
-- Source page 2 has three distinct tables. Current scoring-leaf text flattens
-- each table into prose and then appends the visual, duplicating the source
-- structure. Q1(a)(ii) also has a dedicated copy of the initial-values table
-- which is currently dormant.

DO $$
DECLARE
  v_paper uuid := 'ea1c9885-064f-4a69-a019-7739030fce89'::uuid;
  v_sha text := 'e3427f3edd7844a2f00a4340b444a4d67602b34b08769de2da9126ceb8f70cc5';
  v_q1ai uuid := '2d9f1454-be42-4c94-b879-791e2d332c3b'::uuid;
  v_a1ai uuid := '0eb0e882-1670-4754-89a3-d8d0cde3c959'::uuid;
  v_q1aii uuid := '608831b3-528b-4742-ac15-8e31684c0a97'::uuid;
  v_a1aii uuid := 'dec74de2-2f8a-4ce3-be54-f0c6b7f661bb'::uuid;
  v_a_initial uuid := 'f557f53c-3607-43be-80e6-fb4d8240f6a5'::uuid;
  v_q1b uuid := '67090c04-40c7-41df-8afe-6bbcbc69f342'::uuid;
  v_a1b uuid := '328786c3-3c85-42fa-b597-b3b6f2476850'::uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers
    WHERE id=v_paper AND sha256=v_sha AND year=2021 AND series='MJ' AND variant=2 AND kind='QP'
  ) THEN RAISE EXCEPTION 'vf_mj21_22_q1_source_provenance_mismatch'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_a1ai AND question_id=v_q1ai AND source_page=2
      AND content_hash='2bfff72e6024dd4c178a89decf07b5b0c05036d0729830b5f9163973030492c4'
      AND crop_status='ready'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_a1aii AND question_id=v_q1aii AND source_page=2
      AND content_hash='cf44892c78925f71578a012d891f8face5f3e45eb151cca0e0044687cc73e11a'
      AND crop_status='ready'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_a_initial AND question_id=v_q1aii AND source_page=2
      AND content_hash='2bfff72e6024dd4c178a89decf07b5b0c05036d0729830b5f9163973030492c4'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_a1b AND question_id=v_q1b AND source_page=2
      AND content_hash='00c2e7cb6549eabf23afb4496dfc41107732a744e284929ccbf5393dca71f69e'
      AND crop_status='ready'
  ) THEN RAISE EXCEPTION 'vf_mj21_22_q1_asset_provenance_mismatch'; END IF;

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object(
      'text','Complete the following table by giving the appropriate data type in each case.',
      'type','text','style','task','source',jsonb_build_object('page',2)
    ),
    jsonb_build_object(
      'type','asset','kind','table','assetId',v_a1ai::text,
      'altText','Variable, example data value and data type table',
      'source',jsonb_build_object('page',2)
    )
  ),false),updated_at=now()
  WHERE id=v_q1ai;

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object(
      'text','Initial data values from part (a)(i):',
      'type','text','style','paragraph','source',jsonb_build_object('page',2)
    ),
    jsonb_build_object(
      'type','asset','kind','table','assetId',v_a_initial::text,
      'altText','Initial variable values from part (a)(i)',
      'source',jsonb_build_object('page',2)
    ),
    jsonb_build_object(
      'text','Evaluate each expression in the following table by using the initial data values shown in part (a)(i).',
      'type','text','style','task','source',jsonb_build_object('page',2)
    ),
    jsonb_build_object(
      'type','asset','kind','table','assetId',v_a1aii::text,
      'altText','Expression and Evaluates to table',
      'source',jsonb_build_object('page',2)
    )
  ),false),updated_at=now()
  WHERE id=v_q1aii;

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object(
      'text','Each pseudocode statement in the following table contains an example of selection, assignment or iteration.\n\nPut one tick (✓) in the appropriate column for each statement.',
      'type','text','style','task','source',jsonb_build_object('page',2)
    ),
    jsonb_build_object(
      'type','asset','kind','table','assetId',v_a1b::text,
      'altText','Selection, assignment and iteration classification table',
      'source',jsonb_build_object('page',2)
    )
  ),false),updated_at=now()
  WHERE id=v_q1b;

  IF (
    SELECT count(*)
    FROM questions q CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id IN (v_q1ai,v_q1aii,v_q1b) AND b->>'type'='asset'
  ) <> 4 THEN RAISE EXCEPTION 'vf_mj21_22_q1_asset_consumption_postcondition_failed'; END IF;
END $$;