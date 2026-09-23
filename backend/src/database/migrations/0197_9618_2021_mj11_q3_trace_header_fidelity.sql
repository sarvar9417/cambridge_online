-- VF-E-000004: restore the two-level Cambridge trace-table header for 9618/11/M/J/21 Q3(b).
-- Source QP page 9 has "Memory address" spanning columns 365-368, while the
-- v1 structured block flattened the header into one row. This migration changes
-- only content_json header geometry and is guarded by exact source provenance.

DO $$
DECLARE
  v_question_id uuid := '6b1f48a6-22ba-4522-a8a4-33c41bcfa9ee'::uuid;
  v_paper_id uuid := 'fab329b3-9fbc-43ac-938b-5d83c815a1e5'::uuid;
  v_expected_sha text := 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453';
  v_block_index integer;
  v_header_rows jsonb := '[
    [
      {"text":"Instruction address","column":0,"rowSpan":2},
      {"text":"ACC","column":1,"rowSpan":2},
      {"text":"Memory address","column":2,"colSpan":4},
      {"text":"IX","column":6,"rowSpan":2},
      {"text":"Output","column":7,"rowSpan":2}
    ],
    [
      {"text":"365","column":2},
      {"text":"366","column":3},
      {"text":"367","column":4},
      {"text":"368","column":5}
    ]
  ]'::jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    WHERE q.id=v_question_id
      AND q.path='3.b'
      AND sp.id=v_paper_id
      AND sp.sha256=v_expected_sha
      AND q.content_json->>'version'='1'
  ) THEN
    RAISE EXCEPTION 'vf_e_000004_question_or_source_provenance_mismatch';
  END IF;

  SELECT ordinality::integer-1
  INTO v_block_index
  FROM questions q
  CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') WITH ORDINALITY AS b(value,ordinality)
  WHERE q.id=v_question_id
    AND b.value->>'type'='table'
    AND b.value->>'kind'='selection_grid'
    AND (b.value#>>'{source,page}')::integer=9
    AND b.value->'headers'='["Instruction address","ACC","365","366","367","368","IX","Output"]'::jsonb
  LIMIT 1;

  IF v_block_index IS NULL THEN
    RAISE EXCEPTION 'vf_e_000004_trace_table_block_not_found';
  END IF;

  UPDATE questions
  SET content_json=jsonb_set(content_json,ARRAY['blocks',v_block_index::text,'headerRows'],v_header_rows,true),
      content_version=greatest(coalesce(content_version,1),1),
      updated_at=now()
  WHERE id=v_question_id;

  IF NOT EXISTS (
    SELECT 1
    FROM questions q
    WHERE q.id=v_question_id
      AND q.content_json#>ARRAY['blocks',v_block_index::text,'headerRows',0,2]
          @> '{"text":"Memory address","column":2,"colSpan":4}'::jsonb
      AND q.content_json#>ARRAY['blocks',v_block_index::text,'headerRows',1]
          @> '[{"text":"365","column":2},{"text":"366","column":3},{"text":"367","column":4},{"text":"368","column":5}]'::jsonb
  ) THEN
    RAISE EXCEPTION 'vf_e_000004_grouped_header_postcondition_failed';
  END IF;
END $$;
