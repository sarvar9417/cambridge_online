-- 9618/21/M/J/21 remaining shared-source consumption.
-- This follows 0208/0209 and covers Q4(b)/(c) leaves and Q7(a), which still
-- flatten canonical source visuals into prose after the earlier repair tranche.

DO $$
DECLARE
  v_paper uuid := 'f0350704-d7c2-4d3d-b3c9-c2c5e658565c'::uuid;
  v_sha text := '95bf694f682ec9bea716a69249c4bac86c34c09aea1ef5c9d8da7ca9124089b6';
  v_q4b uuid := 'caa9027e-2771-4668-916c-81ab7cd1cfa2'::uuid;
  v_q4ci uuid := '80f257e7-6b54-4258-afad-694a7cc997dd'::uuid;
  v_q4cii uuid := '3024fdbc-88c3-4d8f-b151-f24702335126'::uuid;
  v_a4 uuid := '2f6ee126-5c8a-4dd8-9b75-e5dff29ecb3a'::uuid;
  v_q7a uuid := '02920b31-6fb1-480c-b718-82435784454d'::uuid;
  v_a7example uuid := 'ccf30e72-7c67-4c55-8685-0be996254514'::uuid;
  v_a7modules uuid := '2b8795f4-12c7-4ef0-980c-f5163b147347'::uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers
    WHERE id=v_paper AND sha256=v_sha AND year=2021 AND series='MJ' AND variant=1 AND kind='QP'
  ) THEN RAISE EXCEPTION 'vf_mj21_21_remaining_source_provenance_mismatch'; END IF;

  -- These post-0208/0209 shapes prove that the preceding repair tranche has run.
  IF NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_a4 AND source_page=10
      AND svg_markup LIKE '%viewBox="0 0 920 850"%'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_a7example AND source_page=18
      AND svg_markup LIKE '%viewBox="0 0 820 155"%'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_a7modules AND source_page=18
      AND svg_markup LIKE '%viewBox="0 0 860 320"%'
  ) THEN RAISE EXCEPTION 'vf_mj21_21_prior_visual_repairs_missing'; END IF;

  UPDATE questions SET content_json=jsonb_build_object(
    'version',1,'source',jsonb_build_object('paperId',v_paper::text,'sha256',v_sha),
    'blocks',jsonb_build_array(
      jsonb_build_object('text','Study the following pseudocode. Line numbers are for reference only.','type','text','style','paragraph','source',jsonb_build_object('page',10)),
      jsonb_build_object('type','asset','kind','pseudocode','assetId',v_a4::text,'altText','Convert(Name) pseudocode with Cambridge line numbers 10 to 41','source',jsonb_build_object('page',10)),
      jsonb_build_object('text','The pseudocode for Convert() contains a conditional loop.\n\nState a more appropriate loop structure.\n\nJustify your answer.\n\nLoop structure __________\n\nJustification __________','type','text','style','task','source',jsonb_build_object('page',12))
    )
  ),updated_at=now() WHERE id=v_q4b;

  UPDATE questions SET content_json=jsonb_build_object(
    'version',1,'source',jsonb_build_object('paperId',v_paper::text,'sha256',v_sha),
    'blocks',jsonb_build_array(
      jsonb_build_object('text','Study the following pseudocode. Line numbers are for reference only.','type','text','style','paragraph','source',jsonb_build_object('page',10)),
      jsonb_build_object('type','asset','kind','pseudocode','assetId',v_a4::text,'altText','Convert(Name) pseudocode with Cambridge line numbers 10 to 41','source',jsonb_build_object('page',10)),
      jsonb_build_object('text','Two changes need to be made to the algorithm.\n\nChange 1: Convert to lower case any character that is not the first character after a space.\nChange 2: Replace multiple spaces with a single space.','type','text','style','paragraph','source',jsonb_build_object('page',12)),
      jsonb_build_object('text','Change 1 may be implemented by modifying one line of the pseudocode.\n\nWrite the modified line.','type','text','style','task','source',jsonb_build_object('page',12)),
      jsonb_build_object('type','answer_area','kind','lines','lines',2,'source',jsonb_build_object('page',12))
    )
  ),updated_at=now() WHERE id=v_q4ci;

  UPDATE questions SET content_json=jsonb_build_object(
    'version',1,'source',jsonb_build_object('paperId',v_paper::text,'sha256',v_sha),
    'blocks',jsonb_build_array(
      jsonb_build_object('text','Study the following pseudocode. Line numbers are for reference only.','type','text','style','paragraph','source',jsonb_build_object('page',10)),
      jsonb_build_object('type','asset','kind','pseudocode','assetId',v_a4::text,'altText','Convert(Name) pseudocode with Cambridge line numbers 10 to 41','source',jsonb_build_object('page',10)),
      jsonb_build_object('text','Two changes need to be made to the algorithm.\n\nChange 1: Convert to lower case any character that is not the first character after a space.\nChange 2: Replace multiple spaces with a single space.','type','text','style','paragraph','source',jsonb_build_object('page',12)),
      jsonb_build_object('text','Change 2 may be implemented by moving one line of the pseudocode.\n\nWrite the number of the line to be moved and state its new position.\n\nLine number __________\n\nNew position __________','type','text','style','task','source',jsonb_build_object('page',12))
    )
  ),updated_at=now() WHERE id=v_q4cii;

  UPDATE questions SET content_json=jsonb_build_object(
    'version',1,'source',jsonb_build_object('paperId',v_paper::text,'sha256',v_sha),
    'blocks',jsonb_build_array(
      jsonb_build_object('text','A program is needed to take a string containing a full name and produce a new string of initials.\n\nSome words in the full name will be ignored. For example, "the", "and", "of", "for" and "to" may all be ignored.\n\nEach letter of the abbreviated string must be upper case.\n\nFor example:','type','text','style','paragraph','source',jsonb_build_object('page',18)),
      jsonb_build_object('type','asset','kind','table','assetId',v_a7example::text,'altText','Full-name and initials example table','source',jsonb_build_object('page',18)),
      jsonb_build_object('text','The programmer has decided to use a global variable FNString of type STRING to store the full name.\n\nIt is assumed that:','type','text','style','paragraph','source',jsonb_build_object('page',18)),
      jsonb_build_object('items',jsonb_build_array('words in the full name string are separated by a single space character','space characters will not occur at the beginning or the end of the full name string','the full name string contains at least one word.'),'type','list','source',jsonb_build_object('page',18)),
      jsonb_build_object('text','The programmer has started to define program modules as follows:','type','text','style','paragraph','source',jsonb_build_object('page',18)),
      jsonb_build_object('type','asset','kind','table','assetId',v_a7modules::text,'altText','GetStart and GetWord module-description table','source',jsonb_build_object('page',18)),
      jsonb_build_object('text','Write pseudocode for the module GetStart().','type','text','style','task','source',jsonb_build_object('page',19)),
      jsonb_build_object('type','answer_area','kind','lines','lines',27,'source',jsonb_build_object('page',19))
    )
  ),updated_at=now() WHERE id=v_q7a;

  IF (
    SELECT count(*) FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id IN (v_q4b,v_q4ci,v_q4cii)
      AND b->>'type'='asset' AND b->>'assetId'=v_a4::text
  ) <> 3 THEN RAISE EXCEPTION 'vf_mj21_21_q4_remaining_consumption_failed'; END IF;

  IF (
    SELECT count(*) FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_q7a AND b->>'type'='asset'
      AND b->>'assetId' IN (v_a7example::text,v_a7modules::text)
  ) <> 2 THEN RAISE EXCEPTION 'vf_mj21_21_q7a_consumption_failed'; END IF;
END $$;