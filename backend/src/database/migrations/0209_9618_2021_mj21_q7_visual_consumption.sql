-- 9618/21/M/J/21 Q7 visual consumption repair.
-- Four source tables are currently stored as full-page generated SVGs and/or
-- flattened into prose. Rebuild crop-sized source-faithful SVGs and reference
-- the canonical assets from the scoring leaves.

DO $$
DECLARE
  v_paper uuid := 'f0350704-d7c2-4d3d-b3c9-c2c5e658565c'::uuid;
  v_sha text := '95bf694f682ec9bea716a69249c4bac86c34c09aea1ef5c9d8da7ca9124089b6';
  v_q7 uuid := 'a53c0073-feee-4fa5-94b8-316e5c893f17'::uuid;
  v_a_example uuid := 'ccf30e72-7c67-4c55-8685-0be996254514'::uuid;
  v_a_modules uuid := '2b8795f4-12c7-4ef0-980c-f5163b147347'::uuid;
  v_q7b uuid := 'f64b25c4-94af-4c1d-b6a8-18bb46749033'::uuid;
  v_a_addword uuid := 'b61c44c7-db80-4961-851c-ec43b6ed0ad7'::uuid;
  v_q7c uuid := '96ec265b-3abe-4a57-836c-6af9a3ae39b6'::uuid;
  v_a_getword uuid := '2f994a47-68f7-4f48-8e75-cbd9fde81cd7'::uuid;
  v_example_svg text := $s1$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 155" width="820" height="155" role="img" aria-label="Full name and initials example table">
  <rect x="0.7" y="0.7" width="818.6" height="153.6" fill="white" stroke="#555" stroke-width="1.4"/>
  <line x1="655" y1="0" x2="655" y2="155" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="43" x2="820" y2="43" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="98" x2="820" y2="98" stroke="#555" stroke-width="1.4"/>
  <style>.h{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:18px;fill:#222}</style>
  <text class="h" x="327.5" y="28" text-anchor="middle">Full name</text>
  <text class="h" x="737.5" y="28" text-anchor="middle">Initials</text>
  <text class="t" x="10" y="77">Integrated Development Environment</text>
  <text class="t" x="670" y="77">IDE</text>
  <text class="t" x="10" y="133">The American Standard Code for Information Interchange</text>
  <text class="t" x="670" y="133">ASCII</text>
</svg>$s1$;
  v_modules_svg text := $s2$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 320" width="860" height="320" role="img" aria-label="GetStart and GetWord module description table">
  <rect x="0.7" y="0.7" width="858.6" height="318.6" fill="white" stroke="#555" stroke-width="1.4"/>
  <line x1="175" y1="0" x2="175" y2="320" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="43" x2="860" y2="43" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="185" x2="860" y2="185" stroke="#555" stroke-width="1.4"/>
  <style>.h{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:17px;fill:#222}.m{font-family:"Courier New",Courier,monospace;font-size:17px;fill:#555}</style>
  <text class="h" x="87.5" y="28" text-anchor="middle">Module</text>
  <text class="h" x="517.5" y="28" text-anchor="middle">Description</text>
  <text class="m" x="87.5" y="117" text-anchor="middle">GetStart()</text>
  <text class="t" x="191" y="69">• Called with an <tspan class="m">INTEGER</tspan> as a parameter, representing the number of a</text>
  <text class="t" x="215" y="91">word in <tspan class="m">FNString</tspan>.</text>
  <text class="t" x="191" y="116">• Returns the character start position of that word in <tspan class="m">FNString</tspan> or</text>
  <text class="t" x="215" y="138">returns -1 if that word does not exist</text>
  <text class="t" x="191" y="163">• For example: if <tspan class="m">FNString</tspan> contains the string <tspan class="m">"hot and cold"</tspan>,</text>
  <text class="t" x="215" y="180"><tspan class="m">GetStart(3)</tspan> returns 9</text>

  <text class="m" x="87.5" y="255" text-anchor="middle">GetWord()</text>
  <text class="t" x="191" y="211">• Called with a parameter representing the position of the first character</text>
  <text class="t" x="215" y="233">of a word in <tspan class="m">FNString</tspan></text>
  <text class="t" x="191" y="258">• Returns the word from <tspan class="m">FNString</tspan></text>
  <text class="t" x="191" y="283">• For example: if <tspan class="m">FNString</tspan> contains the string <tspan class="m">"hot and cold"</tspan>,</text>
  <text class="t" x="215" y="305"><tspan class="m">GetWord(9)</tspan> returns <tspan class="m">"cold"</tspan></text>
</svg>$s2$;
  v_addword_svg text := $s3$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 178" width="860" height="178" role="img" aria-label="AddWord module description table">
  <rect x="0.7" y="0.7" width="858.6" height="176.6" fill="white" stroke="#555" stroke-width="1.4"/>
  <line x1="175" y1="0" x2="175" y2="178" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="43" x2="860" y2="43" stroke="#555" stroke-width="1.4"/>
  <style>.h{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:17px;fill:#222}.m{font-family:"Courier New",Courier,monospace;font-size:17px;fill:#555}</style>
  <text class="h" x="87.5" y="28" text-anchor="middle">Module</text>
  <text class="h" x="517.5" y="28" text-anchor="middle">Description</text>
  <text class="m" x="87.5" y="112" text-anchor="middle">AddWord()</text>
  <text class="t" x="191" y="70">• Called with a parameter representing a word</text>
  <text class="t" x="191" y="95">• Stores the word in an unused element of the <tspan class="m">IgnoreList</tspan> array</text>
  <text class="t" x="215" y="117">and returns <tspan class="m">TRUE</tspan></text>
  <text class="t" x="191" y="142">• Returns <tspan class="m">FALSE</tspan> if the array was already full or if the word was</text>
  <text class="t" x="215" y="164">already in the array</text>
</svg>$s3$;
  v_getword_svg text := $s4$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 178" width="860" height="178" role="img" aria-label="GetWord module description table">
  <rect x="0.7" y="0.7" width="858.6" height="176.6" fill="white" stroke="#555" stroke-width="1.4"/>
  <line x1="175" y1="0" x2="175" y2="178" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="43" x2="860" y2="43" stroke="#555" stroke-width="1.4"/>
  <style>.h{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:17px;fill:#222}.m{font-family:"Courier New",Courier,monospace;font-size:17px;fill:#555}</style>
  <text class="h" x="87.5" y="28" text-anchor="middle">Module</text>
  <text class="h" x="517.5" y="28" text-anchor="middle">Description</text>
  <text class="m" x="87.5" y="112" text-anchor="middle">GetWord()</text>
  <text class="t" x="191" y="70">• Called with a parameter representing the position of the first</text>
  <text class="t" x="215" y="92">character of a word in <tspan class="m">FNString</tspan></text>
  <text class="t" x="191" y="117">• Returns the word from <tspan class="m">FNString</tspan></text>
  <text class="t" x="191" y="142">• For example: if <tspan class="m">FNString</tspan> contains the string <tspan class="m">"hot and cold"</tspan>,</text>
  <text class="t" x="215" y="164"><tspan class="m">GetWord(9)</tspan> returns <tspan class="m">"cold"</tspan></text>
</svg>$s4$;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers WHERE id=v_paper AND sha256=v_sha
  ) THEN RAISE EXCEPTION 'vf_mj21_21_q7_source_provenance_mismatch'; END IF;

  IF NOT EXISTS (SELECT 1 FROM question_assets WHERE id=v_a_example AND question_id=v_q7 AND source_page=18
      AND content_hash='8283ebef3881ec27f9647e5779f505de546a59b7e12d1d161031350303dfe1c4')
  OR NOT EXISTS (SELECT 1 FROM question_assets WHERE id=v_a_modules AND question_id=v_q7 AND source_page=18
      AND content_hash='ace445111a7d5907088e4aadcaddc57e892516bc45c3d0d4b6f062fda94d57ff')
  OR NOT EXISTS (SELECT 1 FROM question_assets WHERE id=v_a_addword AND question_id=v_q7b AND source_page=20
      AND content_hash='e7225423de7968c186a3d3d9ee3179a37fdf438350ea8d6b264346278dfe1e96')
  OR NOT EXISTS (SELECT 1 FROM question_assets WHERE id=v_a_getword AND question_id=v_q7c AND source_page=21
      AND content_hash='7807eb166d19172f6cff07d1ba14d92403ff231f9abb28db351e27df7c21ea26')
  THEN RAISE EXCEPTION 'vf_mj21_21_q7_asset_provenance_mismatch'; END IF;

  UPDATE question_assets SET svg_markup=v_example_svg,size_bytes=octet_length(v_example_svg),
    content_hash=encode(digest(v_example_svg,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_a_example;
  UPDATE question_assets SET svg_markup=v_modules_svg,size_bytes=octet_length(v_modules_svg),
    content_hash=encode(digest(v_modules_svg,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_a_modules;
  UPDATE question_assets SET svg_markup=v_addword_svg,size_bytes=octet_length(v_addword_svg),
    content_hash=encode(digest(v_addword_svg,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_a_addword;
  UPDATE question_assets SET svg_markup=v_getword_svg,size_bytes=octet_length(v_getword_svg),
    content_hash=encode(digest(v_getword_svg,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_a_getword;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','A program is needed to take a string containing a full name and produce a new string of initials.\n\nSome words in the full name will be ignored. For example, "the", "and", "of", "for" and "to" may all be ignored.\n\nEach letter of the abbreviated string must be upper case.\n\nFor example:','type','text','style','paragraph','source',jsonb_build_object('page',18)),
    jsonb_build_object('type','asset','kind','table','assetId',v_a_example::text,'altText','Full-name and initials example table','source',jsonb_build_object('page',18)),
    jsonb_build_object('text','The programmer has decided to use a global variable FNString of type STRING to store the full name.\n\nIt is assumed that:','type','text','style','paragraph','source',jsonb_build_object('page',18)),
    jsonb_build_object('items',jsonb_build_array('words in the full name string are separated by a single space character','space characters will not occur at the beginning or the end of the full name string','the full name string contains at least one word.'),'type','list','source',jsonb_build_object('page',18)),
    jsonb_build_object('text','The programmer has started to define program modules as follows:','type','text','style','paragraph','source',jsonb_build_object('page',18)),
    jsonb_build_object('type','asset','kind','table','assetId',v_a_modules::text,'altText','GetStart and GetWord module-description table','source',jsonb_build_object('page',18)),
    jsonb_build_object('text','The programmer has decided to use a global ten-element 1D array IgnoreList of type STRING to store the ignored words. Unused elements contain the empty string ("") and may occur anywhere in the array.\n\nA new module AddWord() is needed as follows:','type','text','style','paragraph','source',jsonb_build_object('page',20)),
    jsonb_build_object('type','asset','kind','table','assetId',v_a_addword::text,'altText','AddWord module-description table','source',jsonb_build_object('page',20)),
    jsonb_build_object('text','Write a detailed description of the algorithm for AddWord(). Do not include pseudocode statements in your answer.','type','text','style','task','source',jsonb_build_object('page',20)),
    jsonb_build_object('type','answer_area','kind','lines','lines',12,'source',jsonb_build_object('page',20))
  ),false),updated_at=now() WHERE id=v_q7b;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','A program is needed to take a string containing a full name and produce a new string of initials.\n\nSome words in the full name will be ignored. For example, "the", "and", "of", "for" and "to" may all be ignored.\n\nEach letter of the abbreviated string must be upper case.\n\nFor example:','type','text','style','paragraph','source',jsonb_build_object('page',18)),
    jsonb_build_object('type','asset','kind','table','assetId',v_a_example::text,'altText','Full-name and initials example table','source',jsonb_build_object('page',18)),
    jsonb_build_object('text','The programmer has decided to use a global variable FNString of type STRING to store the full name.\n\nIt is assumed that:','type','text','style','paragraph','source',jsonb_build_object('page',18)),
    jsonb_build_object('items',jsonb_build_array('words in the full name string are separated by a single space character','space characters will not occur at the beginning or the end of the full name string','the full name string contains at least one word.'),'type','list','source',jsonb_build_object('page',18)),
    jsonb_build_object('text','The programmer has started to define program modules as follows:','type','text','style','paragraph','source',jsonb_build_object('page',18)),
    jsonb_build_object('type','asset','kind','table','assetId',v_a_modules::text,'altText','GetStart and GetWord module-description table','source',jsonb_build_object('page',18)),
    jsonb_build_object('text','As a reminder, the module description of GetWord() is repeated:','type','text','style','paragraph','source',jsonb_build_object('page',21)),
    jsonb_build_object('type','asset','kind','table','assetId',v_a_getword::text,'altText','Repeated GetWord module-description table','source',jsonb_build_object('page',21)),
    jsonb_build_object('text','Write pseudocode for the module GetWord().','type','text','style','task','source',jsonb_build_object('page',21)),
    jsonb_build_object('type','answer_area','kind','lines','lines',22,'source',jsonb_build_object('page',21))
  ),false),updated_at=now() WHERE id=v_q7c;

  IF (
    SELECT count(*) FROM questions q CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_q7b AND b->>'type'='asset'
  ) <> 3 OR (
    SELECT count(*) FROM questions q CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_q7c AND b->>'type'='asset'
  ) <> 3 THEN RAISE EXCEPTION 'vf_mj21_21_q7_asset_consumption_postcondition_failed'; END IF;
END $$;