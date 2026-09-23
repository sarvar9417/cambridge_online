-- 9618/31/M/J/21 Q3(a) and Q5(a) source-crop consumption repair.
-- Both rows already have reviewed source-repair crops. Structured content also
-- flattens the crop text/diagram into prose, so the source visual is duplicated.
-- Keep the literal crop authoritative and remove the flattened surrogate text.

DO $$
DECLARE
  v_paper uuid := '5861419d-e79b-4eb2-8070-d72fb07f62cb'::uuid;
  v_sha text := '82f001cd257ae2a2a57b5f47289b9a007b23b48db5496dda4a609c5ed2b5ab9e';
  v_q3 uuid := '8e93bf90-81e9-4774-94cd-c4962f8b684a'::uuid;
  v_a3 uuid := 'b5b75f06-38fe-4cfe-a3d3-b69d6f383fe1'::uuid;
  v_q5 uuid := 'c578883e-cf70-4854-90a9-8cc8774456a2'::uuid;
  v_a5 uuid := '7b517ea2-5050-4614-ab10-87ad9fb72ed9'::uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers WHERE id=v_paper AND sha256=v_sha
  ) THEN RAISE EXCEPTION 'vf_mj21_31_q3_q5_source_provenance_mismatch'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_a3 AND question_id=v_q3 AND source_page=5
      AND crop_status='ready'
      AND storage_path='supabase://question-assets/source-repair/5861419d-e79b-4eb2-8070-d72fb07f62cb/8e93bf90-81e9-4774-94cd-c4962f8b684a/74e0ae96c8c4a60320a5cbd36eec78e2e65413101fc422d5e574563dfa371573.png'
      AND content_hash='80bcd7fa873d5fb7ef0143335f0aff5d24d3f9ae833d8c101330fd3ed6dfcd82'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_a5 AND question_id=v_q5 AND source_page=7
      AND crop_status='ready'
      AND storage_path='supabase://question-assets/source-repair/5861419d-e79b-4eb2-8070-d72fb07f62cb/c578883e-cf70-4854-90a9-8cc8774456a2/cb64a57a82270f2f3962426cfc6e949b7e843f93e199c5b79522376844110035.png'
      AND content_hash='a41569c20354e395c544a53ee9a861ed7ae4f267bf027cd6faa8db708cfe014d'
  ) THEN RAISE EXCEPTION 'vf_mj21_31_q3_q5_crop_provenance_mismatch'; END IF;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object(
      'text','Draw one line to connect each Operating System (OS) term to the most appropriate description about it.',
      'type','text','style','task','source',jsonb_build_object('page',5)
    ),
    jsonb_build_object(
      'type','asset','kind','diagram','assetId',v_a3::text,
      'altText','Operating System terms and descriptions matching layout',
      'source',jsonb_build_object('page',5)
    )
  ),false),updated_at=now()
  WHERE id=v_q3;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object(
      'text','Calculate the shortest distance between the base and each of the other towns in the diagram using Dijkstra’s algorithm. Show your working and write your answers in the table provided.',
      'type','text','style','task','source',jsonb_build_object('page',7)
    ),
    jsonb_build_object(
      'type','asset','kind','diagram','assetId',v_a5::text,
      'altText','Weighted town graph, working area and answer table for Dijkstra question',
      'source',jsonb_build_object('page',7)
    )
  ),false),updated_at=now()
  WHERE id=v_q5;

  IF (
    SELECT count(*) FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id IN (v_q3,v_q5) AND b->>'type'='asset'
  ) <> 2 THEN RAISE EXCEPTION 'vf_mj21_31_q3_q5_consumption_postcondition_failed'; END IF;
END $$;