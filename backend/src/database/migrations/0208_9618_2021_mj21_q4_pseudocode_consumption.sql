-- 9618/21/M/J/21 Q4: stop flattening the source pseudocode into prose.
-- All Q4 leaves depend on the exact page-10 Convert() listing. Reuse the
-- canonical parent pseudocode asset so line numbers, arrows, indentation and
-- monospaced layout survive QB/Live/export rendering.
DO $$
DECLARE
  v_paper uuid := 'f0350704-d7c2-4d3d-b3c9-c2c5e658565c'::uuid;
  v_sha text := '95bf694f682ec9bea716a69249c4bac86c34c09aea1ef5c9d8da7ca9124089b6';
  v_parent uuid := '4d7a0c85-9c28-44df-a7f8-3e30024fc84c'::uuid;
  v_code uuid := '2f6ee126-5c8a-4dd8-9b75-e5dff29ecb3a'::uuid;
  v_trace uuid := '79ad474f-634c-486c-bfc6-ce9f129ced2b'::uuid;
  v_qa uuid := '6e4f1c76-7cc2-44cd-b277-aa6358b52d42'::uuid;
  v_qb uuid := 'caa9027e-2771-4668-916c-81ab7cd1cfa2'::uuid;
  v_qci uuid := '80f257e7-6b54-4258-afad-694a7cc997dd'::uuid;
  v_qcii uuid := '3024fdbc-88c3-4d8f-b151-f24702335126'::uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    JOIN question_assets qa ON qa.question_id=q.id
    WHERE q.id=v_parent AND q.path='4'
      AND sp.id=v_paper AND sp.sha256=v_sha
      AND qa.id=v_code AND qa.source_page=10
      AND qa.content_hash='96e30bbb2e66be8125064bcf5afec4f6e47ff3826f29bbbf1b41142f4280124d'
  ) THEN RAISE EXCEPTION 'vf_mj21_21_q4_code_provenance_mismatch'; END IF;

  UPDATE questions
  SET content_json=jsonb_build_object(
    'version',1,'source',jsonb_build_object('paperId',v_paper::text,'sha256',v_sha),
    'blocks',jsonb_build_array(
      jsonb_build_object('type','text','style','paragraph',
        'text','Study the following pseudocode. Line numbers are for reference only.',
        'source',jsonb_build_object('page',10)),
      jsonb_build_object('type','asset','kind','pseudocode','assetId',v_code::text,
        'altText','Convert(Name) pseudocode with Cambridge line numbers 10 to 41',
        'source',jsonb_build_object('page',10)),
      jsonb_build_object('type','text','style','task',
        'text','Complete the trace table below by dry running the function when it is called as follows:\n\nResult ← Convert("∇in∇a∇∇Cup")\n\nNote: The symbol \'∇\' has been used to represent a space character.\nUse this symbol for any space characters in the trace table.\n\nThe first row has been completed for you.',
        'source',jsonb_build_object('page',11)),
      jsonb_build_object('type','asset','kind','table','assetId',v_trace::text,
        'altText','Empty Convert function trace table with Name, Flag, Index, NewName and ThisChar columns',
        'source',jsonb_build_object('page',11))
    )
  ),updated_at=now()
  WHERE id=v_qa;

  UPDATE questions
  SET content_json=jsonb_build_object(
    'version',1,'source',jsonb_build_object('paperId',v_paper::text,'sha256',v_sha),
    'blocks',jsonb_build_array(
      jsonb_build_object('type','text','style','paragraph',
        'text','Study the following pseudocode. Line numbers are for reference only.',
        'source',jsonb_build_object('page',10)),
      jsonb_build_object('type','asset','kind','pseudocode','assetId',v_code::text,
        'altText','Convert(Name) pseudocode with Cambridge line numbers 10 to 41',
        'source',jsonb_build_object('page',10)),
      jsonb_build_object('type','text','style','task',
        'text','The pseudocode for Convert() contains a conditional loop.\n\nState a more appropriate loop structure.\n\nJustify your answer.\n\nLoop structure __________\n\nJustification __________',
        'source',jsonb_build_object('page',12))
    )
  ),updated_at=now()
  WHERE id=v_qb;

  UPDATE questions
  SET content_json=jsonb_build_object(
    'version',1,'source',jsonb_build_object('paperId',v_paper::text,'sha256',v_sha),
    'blocks',jsonb_build_array(
      jsonb_build_object('type','text','style','paragraph',
        'text','Study the following pseudocode. Line numbers are for reference only.',
        'source',jsonb_build_object('page',10)),
      jsonb_build_object('type','asset','kind','pseudocode','assetId',v_code::text,
        'altText','Convert(Name) pseudocode with Cambridge line numbers 10 to 41',
        'source',jsonb_build_object('page',10)),
      jsonb_build_object('type','text','style','paragraph',
        'text','Two changes need to be made to the algorithm.\n\nChange 1: Convert to lower case any character that is not the first character after a space.\nChange 2: Replace multiple spaces with a single space.',
        'source',jsonb_build_object('page',12)),
      jsonb_build_object('type','text','style','task',
        'text','Change 1 may be implemented by modifying one line of the pseudocode.\n\nWrite the modified line.',
        'source',jsonb_build_object('page',12))
    )
  ),updated_at=now()
  WHERE id=v_qci;

  UPDATE questions
  SET content_json=jsonb_build_object(
    'version',1,'source',jsonb_build_object('paperId',v_paper::text,'sha256',v_sha),
    'blocks',jsonb_build_array(
      jsonb_build_object('type','text','style','paragraph',
        'text','Study the following pseudocode. Line numbers are for reference only.',
        'source',jsonb_build_object('page',10)),
      jsonb_build_object('type','asset','kind','pseudocode','assetId',v_code::text,
        'altText','Convert(Name) pseudocode with Cambridge line numbers 10 to 41',
        'source',jsonb_build_object('page',10)),
      jsonb_build_object('type','text','style','paragraph',
        'text','Two changes need to be made to the algorithm.\n\nChange 1: Convert to lower case any character that is not the first character after a space.\nChange 2: Replace multiple spaces with a single space.',
        'source',jsonb_build_object('page',12)),
      jsonb_build_object('type','text','style','task',
        'text','Change 2 may be implemented by moving one line of the pseudocode.\n\nWrite the number of the line to be moved and state its new position.\n\nLine number __________\n\nNew position __________',
        'source',jsonb_build_object('page',12))
    )
  ),updated_at=now()
  WHERE id=v_qcii;

  IF (
    SELECT count(*) FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id IN (v_qa,v_qb,v_qci,v_qcii)
      AND b->>'type'='asset' AND b->>'assetId'=v_code::text
  ) <> 4 THEN RAISE EXCEPTION 'vf_mj21_21_q4_code_consumption_failed'; END IF;
END $$;