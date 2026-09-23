-- Restore the source-required instruction-set context for 9618/11/M/J/21 Q3(b).
--
-- Source evidence:
--   QP SHA d73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453
--   source page 7 contains the instruction-set table used by Q3(b)
--   parent asset f9483ad1-7672-4b18-bd0c-cb6b21507950 is the source-backed table
--
-- The Q3(b) canonical content currently jumps from the page-6 processor
-- introduction directly to page-8 memory/ASCII tables. Without the page-7
-- instruction set, the question is incomplete when rendered independently.
--
-- This migration is fail-closed: exact paper/question/asset provenance is
-- asserted before the JSON mutation is allowed.

DO $$
DECLARE
  target_question_id uuid := '6b1f48a6-22ba-4522-a8a4-33c41bcfa9ee'::uuid;
  target_asset_id uuid := 'f9483ad1-7672-4b18-bd0c-cb6b21507950'::uuid;
  target_paper_id uuid := 'fab329b3-9fbc-43ac-938b-5d83c815a1e5'::uuid;
  expected_sha text := 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453';
  current_blocks jsonb;
  instruction_block jsonb;
  insert_at integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM source_papers sp
    JOIN syllabi s ON s.id = sp.syllabus_id
    JOIN components c ON c.id = sp.component_id
    WHERE sp.id = target_paper_id
      AND s.code = '9618'
      AND sp.year = 2021
      AND sp.series = 'MJ'
      AND c.number = 1
      AND sp.variant = 1
      AND sp.kind = 'QP'
      AND sp.sha256 = expected_sha
  ) THEN
    RAISE EXCEPTION '9618_2021_mj11_q3_context_source_provenance_mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM questions q
    WHERE q.id = target_question_id
      AND q.source_paper_id = target_paper_id
      AND q.path = '3.b'
      AND q.display_ref = '9618/11/M/J/21 Q3(b)'
  ) THEN
    RAISE EXCEPTION '9618_2021_mj11_q3b_question_identity_mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM question_assets qa
    JOIN questions owner_q ON owner_q.id = qa.question_id
    WHERE qa.id = target_asset_id
      AND owner_q.source_paper_id = target_paper_id
      AND owner_q.path = '3'
      AND qa.kind = 'table'
      AND qa.source_page = 7
      AND qa.content_hash = 'd65ce640e4e7ad1e8adc1fafb7cddbfa9f2f57e90b1428a195eab5c2718b6d3a'
  ) THEN
    RAISE EXCEPTION '9618_2021_mj11_q3_instruction_asset_provenance_mismatch';
  END IF;

  SELECT content_json->'blocks'
  INTO current_blocks
  FROM questions
  WHERE id = target_question_id
  FOR UPDATE;

  IF current_blocks IS NULL OR jsonb_typeof(current_blocks) <> 'array' THEN
    RAISE EXCEPTION '9618_2021_mj11_q3b_blocks_missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(current_blocks) b(value)
    WHERE b.value->>'type' = 'asset'
      AND b.value->>'assetId' = target_asset_id::text
  ) THEN
    RETURN;
  END IF;

  instruction_block := jsonb_build_object(
    'type', 'asset',
    'kind', 'table',
    'assetId', target_asset_id::text,
    'altText', 'Instruction set table with opcodes LDM, LDD, LDI, LDX, LDR, MOV, STO, ADD, INC, CMP, JPE, JPN, JMP, OUT, END, LSL, LSR and their explanations',
    'source', jsonb_build_object('page', 7)
  );

  -- Insert after the inherited processor-introduction block and before the
  -- page-8 task/memory tables, preserving Cambridge source order.
  insert_at := 1;

  UPDATE questions
  SET content_json = jsonb_set(
        content_json,
        '{blocks}',
        coalesce((
          SELECT jsonb_agg(value ORDER BY ord)
          FROM (
            SELECT value, ord::numeric
            FROM jsonb_array_elements(current_blocks) WITH ORDINALITY e(value, ord)
            UNION ALL
            SELECT instruction_block, (insert_at + 0.5)::numeric
          ) ordered_blocks
        ), '[]'::jsonb),
        false
      ),
      updated_at = now()
  WHERE id = target_question_id;
END $$;

-- Postcondition: Q3(b) must now carry the exact page-7 source-backed table ref.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b(value)
    WHERE q.id = '6b1f48a6-22ba-4522-a8a4-33c41bcfa9ee'::uuid
      AND b.value->>'type' = 'asset'
      AND b.value->>'assetId' = 'f9483ad1-7672-4b18-bd0c-cb6b21507950'
      AND b.value->'source'->>'page' = '7'
  ) THEN
    RAISE EXCEPTION '9618_2021_mj11_q3b_instruction_context_not_restored';
  END IF;
END $$;
