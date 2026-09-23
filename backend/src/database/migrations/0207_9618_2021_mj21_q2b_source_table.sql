-- 9618/21/M/J/21 Q2(b): consume the canonical source table instead of
-- flattening the module-definition table into prose.
DO $$
DECLARE
  v_paper uuid := 'f0350704-d7c2-4d3d-b3c9-c2c5e658565c'::uuid;
  v_sha text := '95bf694f682ec9bea716a69249c4bac86c34c09aea1ef5c9d8da7ca9124089b6';
  v_q uuid := 'f70b5181-5c23-4b7d-8020-e3d19f0c847f'::uuid;
  v_a uuid := '2bb16eec-53da-4834-add0-7f88ee50a823'::uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    JOIN question_assets qa ON qa.question_id=q.id
    WHERE q.id=v_q AND q.path='2.b'
      AND sp.id=v_paper AND sp.sha256=v_sha
      AND qa.id=v_a AND qa.source_page=5
      AND qa.content_hash='611bc8b4ed14314dcfb499697c1839fbaca7addfd9b3d8c8607c1032d5cbb293'
  ) THEN RAISE EXCEPTION 'vf_mj21_21_q2b_provenance_mismatch'; END IF;

  UPDATE questions
  SET content_json=jsonb_build_object(
    'version',1,
    'source',jsonb_build_object('paperId',v_paper::text,'sha256',v_sha),
    'blocks',jsonb_build_array(
      jsonb_build_object(
        'type','text','style','paragraph',
        'text','The definition for module LoanReturn() is amended as follows:',
        'source',jsonb_build_object('page',5)
      ),
      jsonb_build_object(
        'type','asset','kind','table','assetId',v_a::text,
        'altText','Amended LoanReturn module-name and description table',
        'source',jsonb_build_object('page',5)
      ),
      jsonb_build_object(
        'type','text','style','paragraph',
        'text','• LoanID and BookID are of type STRING\n• Fine is of type REAL',
        'source',jsonb_build_object('page',5)
      ),
      jsonb_build_object(
        'type','text','style','task',
        'text','Write the pseudocode header for the amended module LoanReturn().',
        'source',jsonb_build_object('page',5)
      ),
      jsonb_build_object(
        'type','answer_area','kind','lines','lines',2,
        'source',jsonb_build_object('page',5)
      )
    )
  ),updated_at=now()
  WHERE id=v_q;

  IF NOT EXISTS (
    SELECT 1 FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_q AND b->>'type'='asset' AND b->>'assetId'=v_a::text
  ) THEN RAISE EXCEPTION 'vf_mj21_21_q2b_asset_consumption_failed'; END IF;
END $$;