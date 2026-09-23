-- 9618/41/M/J/21 Q3 class-diagram source consumption.
-- Literal source review of page 8 confirms the TreasureChest class diagram is a
-- structured boxed visual. Production already has source-repair crops for all
-- Q3 children, but content_json also repeats the complete diagram as flattened
-- paragraph text, causing duplicated/non-source-faithful rendering.

DO $$
DECLARE
  v_paper uuid := '874721d6-6c9a-4009-a192-c58b7aeef7a7'::uuid;
  v_sha text := '3ce3201d19c9147b6960a55de792c06494f4f7b97ac67852d5b6cdc3caf5f3fe';
  v_intro text := 'A computer game requires users to travel around a world to find and open treasure chests. Each
treasure chest has a mathematics question inside. The user enters the answer. The number of
points awarded depends on the number of attempts before the user gives the correct answer.

The program will be created using object-oriented programming (OOP).

The following class diagram describes the class TreasureChest.';
  v_main text := 'The main program repeats each question until the user inputs the correct answer. The
number of points awarded depends on the number of attempts before the user gives the
correct answer.';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers
    WHERE id=v_paper AND kind='QP' AND sha256=v_sha AND page_count=12
  ) THEN RAISE EXCEPTION 'vf_mj21_41_q3_source_provenance_mismatch'; END IF;

  -- Q3(a) and Q3(b): keep the source lead-in, source crop, then the child task.
  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
      jsonb_build_object('text',v_intro,'type','text','style','paragraph','source',jsonb_build_object('page',8)),
      content_json->'blocks'->1,
      content_json->'blocks'->2
    ),false),
    updated_at=now()
  WHERE id IN (
    '3c257568-2dc8-4c0f-b8c7-a105485f32cd'::uuid,
    'aac0d6cf-0f24-4c06-9553-ee328d8b7921'::uuid
  );

  -- Q3(c)(i-v): source page 8 visual must precede the page 10/11 main-program
  -- context. Split the previously flattened mixed-page paragraph accordingly.
  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
      jsonb_build_object('text',v_intro,'type','text','style','paragraph','source',jsonb_build_object('page',8)),
      content_json->'blocks'->1,
      jsonb_build_object('text',v_main,'type','text','style','paragraph','source',jsonb_build_object('page',10)),
      content_json->'blocks'->2
    ),false),
    updated_at=now()
  WHERE id IN (
    '4af034c8-2d6a-4f3b-a801-88642a466bac'::uuid,
    '78d36be0-edfe-4532-b384-b6bf414fb39b'::uuid,
    '7889c360-86d8-4fc5-a521-c5f31e2e24a6'::uuid,
    '3135f8da-14d7-4b14-8d11-cbae31906aeb'::uuid,
    '2663074a-e597-4a19-b2db-3e464c502c72'::uuid
  );

  IF (
    SELECT count(*)
    FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    JOIN question_assets qa ON qa.id::text=b->>'assetId'
    WHERE q.id IN (
      '3c257568-2dc8-4c0f-b8c7-a105485f32cd'::uuid,
      'aac0d6cf-0f24-4c06-9553-ee328d8b7921'::uuid,
      '4af034c8-2d6a-4f3b-a801-88642a466bac'::uuid,
      '78d36be0-edfe-4532-b384-b6bf414fb39b'::uuid,
      '7889c360-86d8-4fc5-a521-c5f31e2e24a6'::uuid,
      '3135f8da-14d7-4b14-8d11-cbae31906aeb'::uuid,
      '2663074a-e597-4a19-b2db-3e464c502c72'::uuid
    )
      AND b->>'type'='asset'
      AND (b->'source'->>'page')::int=8
      AND qa.source_page=8
      AND qa.crop_status='ready'
      AND qa.storage_path IS NOT NULL
  ) <> 7 THEN RAISE EXCEPTION 'vf_mj21_41_q3_source_crop_consumption_postcondition_failed'; END IF;

  IF EXISTS (
    SELECT 1 FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id IN (
      '3c257568-2dc8-4c0f-b8c7-a105485f32cd'::uuid,
      'aac0d6cf-0f24-4c06-9553-ee328d8b7921'::uuid,
      '4af034c8-2d6a-4f3b-a801-88642a466bac'::uuid,
      '78d36be0-edfe-4532-b384-b6bf414fb39b'::uuid,
      '7889c360-86d8-4fc5-a521-c5f31e2e24a6'::uuid,
      '3135f8da-14d7-4b14-8d11-cbae31906aeb'::uuid,
      '2663074a-e597-4a19-b2db-3e464c502c72'::uuid
    )
      AND b->>'type'='text'
      AND b->>'text' LIKE '%question : STRING%constructor()%getPoints()%'
  ) THEN RAISE EXCEPTION 'vf_mj21_41_q3_flattened_diagram_postcondition_failed'; END IF;
END $$;