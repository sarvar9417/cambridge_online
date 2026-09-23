-- VF-E-000005: remove invented header labels from 9618/11/M/J/21 Q4(c)(ii).
-- Original Cambridge QP page 12 shows only the two option rows "Wired" and
-- "Wireless" with an empty tick cell; it does not contain a "Connection" /
-- "Tick (✓)" header row.

DO $$
DECLARE
  v_question_id uuid := 'b0304966-4b2b-4a9d-9bb8-b4ba34b7740d'::uuid;
  v_paper_id uuid := 'fab329b3-9fbc-43ac-938b-5d83c815a1e5'::uuid;
  v_expected_sha text := 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453';
  v_block_index integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    WHERE q.id=v_question_id
      AND q.path='4.c.ii'
      AND sp.id=v_paper_id
      AND sp.sha256=v_expected_sha
  ) THEN
    RAISE EXCEPTION 'vf_e_000005_question_or_source_provenance_mismatch';
  END IF;

  SELECT ordinality::integer-1
  INTO v_block_index
  FROM questions q
  CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') WITH ORDINALITY AS b(value,ordinality)
  WHERE q.id=v_question_id
    AND b.value->>'type'='table'
    AND b.value->>'kind'='tick_grid'
    AND (b.value#>>'{source,page}')::integer=12
    AND b.value->'headers'='["Connection","Tick (✓)"]'::jsonb
    AND b.value->'rows'='[["Wired",null],["Wireless",null]]'::jsonb
  LIMIT 1;

  IF v_block_index IS NULL THEN
    RAISE EXCEPTION 'vf_e_000005_source_option_table_not_found';
  END IF;

  UPDATE questions
  SET content_json=jsonb_set(content_json,ARRAY['blocks',v_block_index::text,'headers'],'[]'::jsonb,false),
      updated_at=now()
  WHERE id=v_question_id;


  IF NOT EXISTS (
    SELECT 1 FROM questions q
    WHERE q.id=v_question_id
      AND q.content_json#>ARRAY['blocks',v_block_index::text,'headers']='[]'::jsonb
      AND q.content_json#>ARRAY['blocks',v_block_index::text,'rows']='[["Wired",null],["Wireless",null]]'::jsonb
  ) THEN
    RAISE EXCEPTION 'vf_e_000005_no_header_postcondition_failed';
  END IF;
END $$;
