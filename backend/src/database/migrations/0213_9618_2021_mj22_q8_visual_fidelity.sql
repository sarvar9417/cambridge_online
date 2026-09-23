-- 9618/22/M/J/21 Q8 shared source-context visual repair.
-- Source page 12 contains two tables reused by Q8(a)/(b). The canonical assets
-- exist on the parent but both scoring leaves currently flatten those tables
-- into prose and never consume the assets. Rebuild crop-sized source tables and
-- preserve the exact source answer-line counts on pages 13 and 14.

DO $$
DECLARE
  v_paper uuid := 'ea1c9885-064f-4a69-a019-7739030fce89'::uuid;
  v_sha text := 'e3427f3edd7844a2f00a4340b444a4d67602b34b08769de2da9126ceb8f70cc5';
  v_root uuid := '5a076466-872e-4da2-aa25-04661806fdb8'::uuid;
  v_example uuid := 'a5267372-035f-4088-bfb7-2ebcf9749eaa'::uuid;
  v_modules uuid := '8e65dbbe-96e4-417c-807e-a9c4beb74a46'::uuid;
  v_qa uuid := '877b366c-6051-4a2d-907a-815b00e15995'::uuid;
  v_qb uuid := '17ecdd6f-9391-4195-bea8-554a3cc70cb3'::uuid;
  v_example_svg text := $ex$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 128" width="840" height="128" role="img" aria-label="Full name and initials example table">
  <rect x="0.7" y="0.7" width="838.6" height="126.6" fill="white" stroke="#555" stroke-width="1.4"/>
  <line x1="680" y1="0" x2="680" y2="128" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="42" x2="840" y2="42" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="85" x2="840" y2="85" stroke="#555" stroke-width="1.4"/>
  <style>.h{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:18px;fill:#222}</style>
  <text class="h" x="340" y="27" text-anchor="middle">Full name</text>
  <text class="h" x="760" y="27" text-anchor="middle">Initials</text>
  <text class="t" x="12" y="69">Integrated Development Environment</text>
  <text class="t" x="692" y="69">IDE</text>
  <text class="t" x="12" y="112">The American Standard Code for Information Interchange</text>
  <text class="t" x="692" y="112">ASCII</text>
</svg>$ex$;
  v_modules_svg text := $mods$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 930 515" width="930" height="515" role="img" aria-label="GetStart GetWord IgnoreWord GetInitials module table">
  <rect x="0.7" y="0.7" width="928.6" height="513.6" fill="white" stroke="#555" stroke-width="1.4"/>
  <line x1="205" y1="0" x2="205" y2="515" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="43" x2="930" y2="43" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="180" x2="930" y2="180" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="316" x2="930" y2="316" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="415" x2="930" y2="415" stroke="#555" stroke-width="1.4"/>
  <style>.h{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:17px;fill:#222}.m{font-family:"Courier New",Courier,monospace;font-size:17px;fill:#555}</style>
  <text class="h" x="102.5" y="28" text-anchor="middle">Module</text>
  <text class="h" x="567.5" y="28" text-anchor="middle">Description</text>

  <text class="m" x="102.5" y="115" text-anchor="middle">GetStart()</text>
  <text class="t" x="220" y="69">• Called with an <tspan class="m">INTEGER</tspan> as its parameter, representing the number of</text>
  <text class="t" x="244" y="91">a word in <tspan class="m">FNString</tspan></text>
  <text class="t" x="220" y="116">• Returns the character start position of that word in <tspan class="m">FNString</tspan> or</text>
  <text class="t" x="244" y="138">returns -1 if that word does not exist</text>
  <text class="t" x="220" y="163">• For example: <tspan class="m">GetStart(3)</tspan> applied to <tspan class="m">"hot and cold"</tspan> returns 9</text>

  <text class="m" x="102.5" y="250" text-anchor="middle">GetWord()</text>
  <text class="t" x="220" y="206">• Called with the position of the first character of a word in <tspan class="m">FNString</tspan></text>
  <text class="t" x="244" y="228">as its parameter</text>
  <text class="t" x="220" y="253">• Returns the word from <tspan class="m">FNString</tspan></text>
  <text class="t" x="220" y="278">• For example: if <tspan class="m">FNString</tspan> contains the string <tspan class="m">"hot and cold"</tspan>,</text>
  <text class="t" x="244" y="300"><tspan class="m">GetWord(9)</tspan> returns <tspan class="m">"cold"</tspan></text>

  <text class="m" x="102.5" y="369" text-anchor="middle">IgnoreWord()</text>
  <text class="t" x="220" y="342">• Called with a <tspan class="m">STRING</tspan> parameter representing a word</text>
  <text class="t" x="220" y="367">• Searches for the word in the <tspan class="m">IgnoreList</tspan> array</text>
  <text class="t" x="220" y="392">• Returns <tspan class="m">TRUE</tspan> if the word is found, otherwise returns <tspan class="m">FALSE</tspan></text>

  <text class="m" x="102.5" y="465" text-anchor="middle">GetInitials()</text>
  <text class="t" x="220" y="441">• Processes the sequence of words in the full name one word at a time</text>
  <text class="t" x="220" y="466">• Calls <tspan class="m">GetStart()</tspan>, <tspan class="m">GetWord()</tspan> and <tspan class="m">IgnoreWord()</tspan> to process</text>
  <text class="t" x="244" y="488">each word to form the new string</text>
  <text class="t" x="220" y="511">• Outputs the new string</text>
</svg>$mods$;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    WHERE q.id=v_root AND sp.id=v_paper AND sp.sha256=v_sha
  ) THEN RAISE EXCEPTION 'vf_mj21_22_q8_source_provenance_mismatch'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_example AND question_id=v_root AND source_page=12
      AND content_hash='a985eaf2c74cccdad3d1495be46cdd6da25b7ee5bd35c7ebd7d416aa00d47d17'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_modules AND question_id=v_root AND source_page=12
      AND content_hash='91a5447529323a3a6826bd082a3a670b381ef243134fe7dd72a9559fba835b99'
  ) THEN RAISE EXCEPTION 'vf_mj21_22_q8_asset_provenance_mismatch'; END IF;

  UPDATE question_assets
  SET svg_markup=v_example_svg,storage_path=NULL,source_bbox=NULL,crop_status='not_needed',crop_error=NULL,
      size_bytes=octet_length(v_example_svg),content_hash=encode(digest(v_example_svg,'sha256'),'hex')
  WHERE id=v_example;

  UPDATE question_assets
  SET svg_markup=v_modules_svg,storage_path=NULL,source_bbox=NULL,crop_status='not_needed',crop_error=NULL,
      size_bytes=octet_length(v_modules_svg),content_hash=encode(digest(v_modules_svg,'sha256'),'hex')
  WHERE id=v_modules;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','A program is needed to take a string containing a full name and to produce a new string of initials.\n\nSome words in the full name will be ignored. For example, “the”, “and”, “of”, “for” and “to” may all be ignored.\n\nEach letter of the new string must be upper case.\n\nFor example:','type','text','style','paragraph','source',jsonb_build_object('page',12)),
    jsonb_build_object('type','asset','kind','table','assetId',v_example::text,'altText','Full name and initials example table','source',jsonb_build_object('page',12)),
    jsonb_build_object('text','The programmer has decided to use the following global variables:','type','text','style','paragraph','source',jsonb_build_object('page',12)),
    jsonb_build_object('items',jsonb_build_array('a ten element 1D array IgnoreList of type STRING to store the ignored words','a string FNString to store the full name string.'),'type','list','source',jsonb_build_object('page',12)),
    jsonb_build_object('text','Assume that:','type','text','style','paragraph','source',jsonb_build_object('page',12)),
    jsonb_build_object('items',jsonb_build_array('each alphabetic character in the full name string may be either upper or lower case','the full name string contains at least one word.'),'type','list','source',jsonb_build_object('page',12)),
    jsonb_build_object('text','The programmer has started to define program modules as follows:','type','text','style','paragraph','source',jsonb_build_object('page',12)),
    jsonb_build_object('type','asset','kind','table','assetId',v_modules::text,'altText','GetStart GetWord IgnoreWord GetInitials module-description table','source',jsonb_build_object('page',12)),
    jsonb_build_object('text','Write pseudocode for the module IgnoreWord().','type','text','style','task','source',jsonb_build_object('page',13)),
    jsonb_build_object('type','answer_area','kind','lines','lines',21,'source',jsonb_build_object('page',13))
  ),false),updated_at=now() WHERE id=v_qa;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','A program is needed to take a string containing a full name and to produce a new string of initials.\n\nSome words in the full name will be ignored. For example, “the”, “and”, “of”, “for” and “to” may all be ignored.\n\nEach letter of the new string must be upper case.\n\nFor example:','type','text','style','paragraph','source',jsonb_build_object('page',12)),
    jsonb_build_object('type','asset','kind','table','assetId',v_example::text,'altText','Full name and initials example table','source',jsonb_build_object('page',12)),
    jsonb_build_object('text','The programmer has decided to use the following global variables:','type','text','style','paragraph','source',jsonb_build_object('page',12)),
    jsonb_build_object('items',jsonb_build_array('a ten element 1D array IgnoreList of type STRING to store the ignored words','a string FNString to store the full name string.'),'type','list','source',jsonb_build_object('page',12)),
    jsonb_build_object('text','Assume that:','type','text','style','paragraph','source',jsonb_build_object('page',12)),
    jsonb_build_object('items',jsonb_build_array('each alphabetic character in the full name string may be either upper or lower case','the full name string contains at least one word.'),'type','list','source',jsonb_build_object('page',12)),
    jsonb_build_object('text','The programmer has started to define program modules as follows:','type','text','style','paragraph','source',jsonb_build_object('page',12)),
    jsonb_build_object('type','asset','kind','table','assetId',v_modules::text,'altText','GetStart GetWord IgnoreWord GetInitials module-description table','source',jsonb_build_object('page',12)),
    jsonb_build_object('text','Write pseudocode for the module GetInitials().','type','text','style','task','source',jsonb_build_object('page',14)),
    jsonb_build_object('type','answer_area','kind','lines','lines',28,'source',jsonb_build_object('page',14))
  ),false),updated_at=now() WHERE id=v_qb;

  IF (
    SELECT count(*) FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id IN (v_qa,v_qb) AND b->>'type'='asset'
  ) <> 4 THEN RAISE EXCEPTION 'vf_mj21_22_q8_asset_consumption_postcondition_failed'; END IF;
END $$;