-- 9618/21/M/J/21 Q7: preserve the three Cambridge module/example tables
-- as visual assets instead of flattening their cell geometry into paragraphs.
DO $$
DECLARE
  v_paper uuid := 'f0350704-d7c2-4d3d-b3c9-c2c5e658565c'::uuid;
  v_sha text := '95bf694f682ec9bea716a69249c4bac86c34c09aea1ef5c9d8da7ca9124089b6';
  v_parent uuid := 'a53c0073-feee-4fa5-94b8-316e5c893f17'::uuid;
  v_examples uuid := 'ccf30e72-7c67-4c55-8685-0be996254514'::uuid;
  v_modules uuid := '2b8795f4-12c7-4ef0-980c-f5163b147347'::uuid;
  v_addword uuid := 'b61c44c7-db80-4961-851c-ec43b6ed0ad7'::uuid;
  v_getword uuid := '2f994a47-68f7-4f48-8e75-cbd9fde81cd7'::uuid;
  v_qa uuid := '02920b31-6fb1-480c-b718-82435784454d'::uuid;
  v_qb uuid := 'f64b25c4-94af-4c1d-b6a8-18bb46749033'::uuid;
  v_qc uuid := '96ec265b-3abe-4a57-836c-6af9a3ae39b6'::uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    JOIN question_assets a1 ON a1.question_id=q.id AND a1.id=v_examples
    JOIN question_assets a2 ON a2.question_id=q.id AND a2.id=v_modules
    WHERE q.id=v_parent AND sp.id=v_paper AND sp.sha256=v_sha
      AND a1.source_page=18 AND a1.content_hash='8283ebef3881ec27f9647e5779f505de546a59b7e12d1d161031350303dfe1c4'
      AND a2.source_page=18 AND a2.content_hash='ace445111a7d5907088e4aadcaddc57e892516bc45c3d0d4b6f062fda94d57ff'
  ) THEN RAISE EXCEPTION 'vf_mj21_21_q7_parent_asset_provenance_mismatch'; END IF;

  UPDATE questions
  SET content_json=jsonb_build_object(
    'version',1,'source',jsonb_build_object('paperId',v_paper::text,'sha256',v_sha),
    'blocks',jsonb_build_array(
      jsonb_build_object('type','text','style','paragraph',
        'text','A program is needed to take a string containing a full name and produce a new string of initials.\n\nSome words in the full name will be ignored. For example, "the", "and", "of", "for" and "to" may all be ignored.\n\nEach letter of the abbreviated string must be upper case.\n\nFor example:',
        'source',jsonb_build_object('page',18)),
      jsonb_build_object('type','asset','kind','table','assetId',v_examples::text,
        'altText','Full-name and initials example table for Q7','source',jsonb_build_object('page',18)),
      jsonb_build_object('type','text','style','paragraph',
        'text','The programmer has decided to use a global variable FNString of type STRING to store the full name.\n\nIt is assumed that:\n• words in the full name string are separated by a single space character\n• space characters will not occur at the beginning or the end of the full name string\n• the full name string contains at least one word.\n\nThe programmer has started to define program modules as follows:',
        'source',jsonb_build_object('page',18)),
      jsonb_build_object('type','asset','kind','table','assetId',v_modules::text,
        'altText','GetStart and GetWord module-description table for Q7','source',jsonb_build_object('page',18)),
      jsonb_build_object('type','text','style','task',
        'text','Write pseudocode for the module GetStart().','source',jsonb_build_object('page',19))
    )
  ),updated_at=now()
  WHERE id=v_qa;

  UPDATE questions
  SET content_json=jsonb_build_object(
    'version',1,'source',jsonb_build_object('paperId',v_paper::text,'sha256',v_sha),
    'blocks',jsonb_build_array(
      jsonb_build_object('type','text','style','paragraph',
        'text','A program is needed to take a string containing a full name and produce a new string of initials.\n\nSome words in the full name will be ignored. For example, "the", "and", "of", "for" and "to" may all be ignored.\n\nEach letter of the abbreviated string must be upper case.\n\nFor example:',
        'source',jsonb_build_object('page',18)),
      jsonb_build_object('type','asset','kind','table','assetId',v_examples::text,
        'altText','Full-name and initials example table for Q7','source',jsonb_build_object('page',18)),
      jsonb_build_object('type','text','style','paragraph',
        'text','The programmer has decided to use a global variable FNString of type STRING to store the full name.\n\nIt is assumed that:\n• words in the full name string are separated by a single space character\n• space characters will not occur at the beginning or the end of the full name string\n• the full name string contains at least one word.\n\nThe programmer has started to define program modules as follows:',
        'source',jsonb_build_object('page',18)),
      jsonb_build_object('type','asset','kind','table','assetId',v_modules::text,
        'altText','GetStart and GetWord module-description table for Q7','source',jsonb_build_object('page',18)),
      jsonb_build_object('type','text','style','paragraph',
        'text','The programmer has decided to use a global ten-element 1D array IgnoreList of type STRING to store the ignored words. Unused elements contain the empty string ("") and may occur anywhere in the array.\n\nA new module AddWord() is needed as follows:',
        'source',jsonb_build_object('page',20)),
      jsonb_build_object('type','asset','kind','table','assetId',v_addword::text,
        'altText','AddWord module-description table','source',jsonb_build_object('page',20)),
      jsonb_build_object('type','text','style','task',
        'text','Write a detailed description of the algorithm for AddWord(). Do not include pseudocode statements in your answer.',
        'source',jsonb_build_object('page',20))
    )
  ),updated_at=now()
  WHERE id=v_qb;

  UPDATE questions
  SET content_json=jsonb_build_object(
    'version',1,'source',jsonb_build_object('paperId',v_paper::text,'sha256',v_sha),
    'blocks',jsonb_build_array(
      jsonb_build_object('type','text','style','paragraph',
        'text','A program is needed to take a string containing a full name and produce a new string of initials.\n\nSome words in the full name will be ignored. For example, "the", "and", "of", "for" and "to" may all be ignored.\n\nEach letter of the abbreviated string must be upper case.\n\nFor example:',
        'source',jsonb_build_object('page',18)),
      jsonb_build_object('type','asset','kind','table','assetId',v_examples::text,
        'altText','Full-name and initials example table for Q7','source',jsonb_build_object('page',18)),
      jsonb_build_object('type','text','style','paragraph',
        'text','The programmer has decided to use a global variable FNString of type STRING to store the full name.\n\nIt is assumed that:\n• words in the full name string are separated by a single space character\n• space characters will not occur at the beginning or the end of the full name string\n• the full name string contains at least one word.\n\nThe programmer has started to define program modules as follows:',
        'source',jsonb_build_object('page',18)),
      jsonb_build_object('type','asset','kind','table','assetId',v_modules::text,
        'altText','GetStart and GetWord module-description table for Q7','source',jsonb_build_object('page',18)),
      jsonb_build_object('type','text','style','paragraph',
        'text','As a reminder, the module description of GetWord() is repeated:',
        'source',jsonb_build_object('page',21)),
      jsonb_build_object('type','asset','kind','table','assetId',v_getword::text,
        'altText','Repeated GetWord module-description table','source',jsonb_build_object('page',21)),
      jsonb_build_object('type','text','style','task',
        'text','Write pseudocode for the module GetWord().','source',jsonb_build_object('page',21))
    )
  ),updated_at=now()
  WHERE id=v_qc;

  IF (
    SELECT count(*) FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id IN (v_qa,v_qb,v_qc) AND b->>'type'='asset'
  ) <> 8 THEN RAISE EXCEPTION 'vf_mj21_21_q7_asset_consumption_failed'; END IF;
END $$;