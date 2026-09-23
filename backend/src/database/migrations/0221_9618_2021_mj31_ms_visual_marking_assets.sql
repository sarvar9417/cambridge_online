-- Source-backed mark-scheme visual repair for 9618/31/M/J/21.
-- Literal 180-DPI review of the SHA-pinned 10-page MS found structured answer
-- geometry that is not preserved by guidance text alone. Existing placeholder
-- mark_scheme_assets with bbox [0,0,1,1] are upgraded to source-shaped SVGs,
-- and missing visual/code answers are added.

DO $$
DECLARE
  v_source uuid := '25b182e2-b612-4e8c-949b-2fad77466bd5'::uuid;
  v_sha text := 'f57eefd05c458fb8f85885f1ac88e9ec41c366e0795e9b2406bcee18d787cd13';
  v_svg text;
  v_hash text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers WHERE id=v_source AND kind='MS' AND sha256=v_sha AND page_count=10
  ) THEN RAISE EXCEPTION 'ms31_visual_source_provenance_mismatch'; END IF;

  -- Q1(a): completed mantissa/exponent boxes.
  v_svg := $q1a$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 92" width="620" height="92" role="img" aria-label="Correct mantissa and exponent for Q1(a)">
<rect width="620" height="92" fill="white"/><style>.h{font-family:Arial,Helvetica,sans-serif;font-size:19px;fill:#222}.b{font-family:Arial,Helvetica,sans-serif;font-size:19px;fill:#222}.g{fill:white;stroke:#555;stroke-width:1.1}</style>
<text class="h" x="155" y="22" text-anchor="middle">Mantissa</text><text class="h" x="480" y="22" text-anchor="middle">Exponent</text>
<rect class="g" x="15" y="32" width="30" height="42"/><rect class="g" x="45" y="32" width="30" height="42"/><rect class="g" x="75" y="32" width="30" height="42"/><rect class="g" x="105" y="32" width="30" height="42"/><rect class="g" x="135" y="32" width="30" height="42"/><rect class="g" x="165" y="32" width="30" height="42"/><rect class="g" x="195" y="32" width="30" height="42"/><rect class="g" x="225" y="32" width="30" height="42"/><rect class="g" x="255" y="32" width="30" height="42"/><rect class="g" x="285" y="32" width="30" height="42"/>
<text class="b" x="30" y="59" text-anchor="middle">1</text><text class="b" x="60" y="59" text-anchor="middle">0</text><text class="b" x="90" y="59" text-anchor="middle">0</text><text class="b" x="120" y="59" text-anchor="middle">0</text><text class="b" x="150" y="59" text-anchor="middle">1</text><text class="b" x="180" y="59" text-anchor="middle">1</text><text class="b" x="210" y="59" text-anchor="middle">0</text><text class="b" x="240" y="59" text-anchor="middle">0</text><text class="b" x="270" y="59" text-anchor="middle">0</text><text class="b" x="300" y="59" text-anchor="middle">0</text>
<rect class="g" x="390" y="32" width="30" height="42"/><rect class="g" x="420" y="32" width="30" height="42"/><rect class="g" x="450" y="32" width="30" height="42"/><rect class="g" x="480" y="32" width="30" height="42"/><rect class="g" x="510" y="32" width="30" height="42"/><rect class="g" x="540" y="32" width="30" height="42"/>
<text class="b" x="405" y="59" text-anchor="middle">0</text><text class="b" x="435" y="59" text-anchor="middle">0</text><text class="b" x="465" y="59" text-anchor="middle">0</text><text class="b" x="495" y="59" text-anchor="middle">0</text><text class="b" x="525" y="59" text-anchor="middle">1</text><text class="b" x="555" y="59" text-anchor="middle">1</text>
</svg>$q1a$; v_hash:=encode(digest(v_svg,'sha256'),'hex');
  IF NOT EXISTS (SELECT 1 FROM mark_schemes WHERE id='6c7b26be-6966-4937-be1b-8c274bb19d6d'::uuid AND source_paper_id=v_source AND status='approved')
  THEN RAISE EXCEPTION 'ms31_q1a_provenance_mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM mark_scheme_assets WHERE mark_scheme_id='6c7b26be-6966-4937-be1b-8c274bb19d6d'::uuid AND source_sha256=v_sha AND content_hash=v_hash) THEN
    INSERT INTO mark_scheme_assets(id,mark_scheme_id,source_paper_id,source_sha256,kind,content_md,alt_text,source_page,source_bbox,structure_json,content_hash,sort_order)
    VALUES(gen_random_uuid(),'6c7b26be-6966-4937-be1b-8c274bb19d6d'::uuid,v_source,v_sha,'table',v_svg,'Official completed mantissa and exponent boxes for Q1(a)',3,'[82,205,285,235]'::jsonb,
      '{"representation":"SVG-CODE","reviewedAtDpi":180,"mantissa":"1000110000","exponent":"000011"}'::jsonb,v_hash,0);
  END IF;

  -- Q1(c): normalised mantissa/exponent boxes.
  v_svg := $q1c$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 170" width="420" height="170" role="img" aria-label="Normalised mantissa and exponent for Q1(c)">
<rect width="420" height="170" fill="white"/><style>.h{font-family:Arial,Helvetica,sans-serif;font-size:19px;fill:#222}.b{font-family:Arial,Helvetica,sans-serif;font-size:19px;fill:#222}.g{fill:white;stroke:#555;stroke-width:1.1}</style>
<text class="h" x="165" y="24" text-anchor="middle">Mantissa</text>
<rect class="g" x="15" y="34" width="30" height="42"/><rect class="g" x="45" y="34" width="30" height="42"/><rect class="g" x="75" y="34" width="30" height="42"/><rect class="g" x="105" y="34" width="30" height="42"/><rect class="g" x="135" y="34" width="30" height="42"/><rect class="g" x="165" y="34" width="30" height="42"/><rect class="g" x="195" y="34" width="30" height="42"/><rect class="g" x="225" y="34" width="30" height="42"/><rect class="g" x="255" y="34" width="30" height="42"/><rect class="g" x="285" y="34" width="30" height="42"/>
<text class="b" x="30" y="61" text-anchor="middle">0</text><text class="b" x="60" y="61" text-anchor="middle">1</text><text class="b" x="90" y="61" text-anchor="middle">1</text><text class="b" x="120" y="61" text-anchor="middle">1</text><text class="b" x="150" y="61" text-anchor="middle">0</text><text class="b" x="180" y="61" text-anchor="middle">0</text><text class="b" x="210" y="61" text-anchor="middle">0</text><text class="b" x="240" y="61" text-anchor="middle">0</text><text class="b" x="270" y="61" text-anchor="middle">0</text><text class="b" x="300" y="61" text-anchor="middle">0</text>
<text class="h" x="105" y="111" text-anchor="middle">Exponent</text>
<rect class="g" x="15" y="121" width="30" height="42"/><rect class="g" x="45" y="121" width="30" height="42"/><rect class="g" x="75" y="121" width="30" height="42"/><rect class="g" x="105" y="121" width="30" height="42"/><rect class="g" x="135" y="121" width="30" height="42"/><rect class="g" x="165" y="121" width="30" height="42"/>
<text class="b" x="30" y="148" text-anchor="middle">1</text><text class="b" x="60" y="148" text-anchor="middle">0</text><text class="b" x="90" y="148" text-anchor="middle">0</text><text class="b" x="120" y="148" text-anchor="middle">0</text><text class="b" x="150" y="148" text-anchor="middle">0</text><text class="b" x="180" y="148" text-anchor="middle">1</text>
</svg>$q1c$; v_hash:=encode(digest(v_svg,'sha256'),'hex');
  IF NOT EXISTS (SELECT 1 FROM mark_schemes WHERE id='b4a5400b-84a9-4b53-bbdb-2ded1c55d16e'::uuid AND source_paper_id=v_source AND status='approved')
  THEN RAISE EXCEPTION 'ms31_q1c_provenance_mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM mark_scheme_assets WHERE mark_scheme_id='b4a5400b-84a9-4b53-bbdb-2ded1c55d16e'::uuid AND source_sha256=v_sha AND content_hash=v_hash) THEN
    INSERT INTO mark_scheme_assets(id,mark_scheme_id,source_paper_id,source_sha256,kind,content_md,alt_text,source_page,source_bbox,structure_json,content_hash,sort_order)
    VALUES(gen_random_uuid(),'b4a5400b-84a9-4b53-bbdb-2ded1c55d16e'::uuid,v_source,v_sha,'table',v_svg,'Official normalised mantissa and exponent boxes for Q1(c)',3,'[82,402,285,458]'::jsonb,
      '{"representation":"SVG-CODE","reviewedAtDpi":180,"mantissa":"0111000000","exponent":"100001"}'::jsonb,v_hash,0);
  END IF;

  -- Q3(a): replace placeholder matching diagram.
  v_svg := $q3a$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 520" width="760" height="520" role="img" aria-label="Official completed operating-system matching diagram">
<rect width="760" height="520" fill="white"/><style>.h{font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:16px;fill:#222}.g{fill:white;stroke:#333;stroke-width:1.6}.l{stroke:#333;stroke-width:1.5;fill:none}</style>
<text class="h" x="135" y="28" text-anchor="middle">OS term</text><text class="h" x="545" y="28" text-anchor="middle">Description</text>
<rect class="g" x="30" y="55" width="210" height="58"/><text class="t" x="135" y="90" text-anchor="middle">Multi-tasking</text><rect class="g" x="30" y="137" width="210" height="58"/><text class="t" x="135" y="172" text-anchor="middle">Paging</text><rect class="g" x="30" y="219" width="210" height="58"/><text class="t" x="135" y="254" text-anchor="middle">Interrupt handling</text><rect class="g" x="30" y="301" width="210" height="58"/><text class="t" x="135" y="336" text-anchor="middle">Scheduling</text><rect class="g" x="30" y="383" width="210" height="58"/><text class="t" x="135" y="418" text-anchor="middle">Virtual memory</text>
<rect class="g" x="405" y="35" width="325" height="62"/><text class="t" x="567" y="60" text-anchor="middle">Using secondary storage to simulate</text><text class="t" x="567" y="80" text-anchor="middle">additional main memory</text>
<rect class="g" x="405" y="118" width="325" height="62"/><text class="t" x="567" y="143" text-anchor="middle">Managing the processes running on</text><text class="t" x="567" y="163" text-anchor="middle">the CPU</text>
<rect class="g" x="405" y="201" width="325" height="72"/><text class="t" x="567" y="226" text-anchor="middle">Managing the execution of many programs</text><text class="t" x="567" y="246" text-anchor="middle">that appear to run at the same time</text>
<rect class="g" x="405" y="294" width="325" height="62"/><text class="t" x="567" y="319" text-anchor="middle">Locating non-contiguous blocks of data and</text><text class="t" x="567" y="339" text-anchor="middle">relocating them</text>
<rect class="g" x="405" y="377" width="325" height="62"/><text class="t" x="567" y="402" text-anchor="middle">Transferring control to another routine when</text><text class="t" x="567" y="422" text-anchor="middle">a service is required</text>
<rect class="g" x="405" y="458" width="325" height="52"/><text class="t" x="567" y="480" text-anchor="middle">Reading/writing same-size blocks of data</text><text class="t" x="567" y="499" text-anchor="middle">from/to secondary storage when required</text>
<path class="l" d="M240 84 L405 237"/><path class="l" d="M240 166 L405 484"/><path class="l" d="M240 248 L405 408"/><path class="l" d="M240 330 L405 149"/><path class="l" d="M240 412 L405 66"/>
</svg>$q3a$; v_hash:=encode(digest(v_svg,'sha256'),'hex');
  UPDATE mark_scheme_assets SET content_md=v_svg,content_hash=v_hash,source_page=5,
    source_bbox='[84,99,326,286]'::jsonb,alt_text='Official completed operating-system term matching diagram',
    structure_json='{"representation":"SVG-CODE","reviewedAtDpi":180,"pairs":5,"distractors":1}'::jsonb
  WHERE id='6ad8e162-f94a-4e05-a5a5-b6bf014729ed'::uuid
    AND mark_scheme_id='463b5b8e-2944-43ae-b68d-bd6bc2fe485d'::uuid
    AND source_paper_id=v_source;

  -- Q5(a): replace placeholder result table.
  v_svg := $q5a$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 110" width="720" height="110" role="img" aria-label="Correct shortest-route values for Town 1 to Town 6">
<rect width="720" height="110" fill="white"/><style>.h{font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:18px;fill:#222}.g{fill:white;stroke:#555;stroke-width:1.1}</style>
<rect class="g" x="0" y="0" width="120" height="55"/><rect class="g" x="0" y="55" width="120" height="55"/><rect class="g" x="120" y="0" width="120" height="55"/><rect class="g" x="120" y="55" width="120" height="55"/><rect class="g" x="240" y="0" width="120" height="55"/><rect class="g" x="240" y="55" width="120" height="55"/><rect class="g" x="360" y="0" width="120" height="55"/><rect class="g" x="360" y="55" width="120" height="55"/><rect class="g" x="480" y="0" width="120" height="55"/><rect class="g" x="480" y="55" width="120" height="55"/><rect class="g" x="600" y="0" width="120" height="55"/><rect class="g" x="600" y="55" width="120" height="55"/>
<text class="h" x="60" y="34" text-anchor="middle">Town 1</text><text class="h" x="180" y="34" text-anchor="middle">Town 2</text><text class="h" x="300" y="34" text-anchor="middle">Town 3</text><text class="h" x="420" y="34" text-anchor="middle">Town 4</text><text class="h" x="540" y="34" text-anchor="middle">Town 5</text><text class="h" x="660" y="34" text-anchor="middle">Town 6</text>
<text class="t" x="60" y="89" text-anchor="middle">3</text><text class="t" x="180" y="89" text-anchor="middle">5</text><text class="t" x="300" y="89" text-anchor="middle">2</text><text class="t" x="420" y="89" text-anchor="middle">9</text><text class="t" x="540" y="89" text-anchor="middle">3</text><text class="t" x="660" y="89" text-anchor="middle">8</text>
</svg>$q5a$; v_hash:=encode(digest(v_svg,'sha256'),'hex');
  UPDATE mark_scheme_assets SET content_md=v_svg,content_hash=v_hash,source_page=6,
    source_bbox='[83,427,313,463]'::jsonb,alt_text='Official final shortest-route values for Town 1 to Town 6',
    structure_json='{"representation":"SVG-CODE","reviewedAtDpi":180,"values":[3,5,2,9,3,8]}'::jsonb
  WHERE id='999da8d7-f339-4cd8-8569-a78b7892ddaa'::uuid
    AND mark_scheme_id='9d18edc6-9691-4a55-af4b-6bb3c5d16864'::uuid
    AND source_paper_id=v_source;

  -- Q7(a): replace placeholder full-adder truth table.
  v_svg := $q7a$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 450" width="720" height="450" role="img" aria-label="Official completed full-adder truth table">
<rect width="720" height="450" fill="white"/><style>.h{font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:18px;fill:#222}.g{fill:white;stroke:#555;stroke-width:1.1}.s{stroke:#333;stroke-width:2}</style>
<rect class="g" x="0" y="0" width="90" height="50"/><rect class="g" x="0" y="50" width="90" height="50"/><rect class="g" x="0" y="100" width="90" height="50"/><rect class="g" x="0" y="150" width="90" height="50"/><rect class="g" x="0" y="200" width="90" height="50"/><rect class="g" x="0" y="250" width="90" height="50"/><rect class="g" x="0" y="300" width="90" height="50"/><rect class="g" x="0" y="350" width="90" height="50"/><rect class="g" x="0" y="400" width="90" height="50"/><rect class="g" x="90" y="0" width="90" height="50"/><rect class="g" x="90" y="50" width="90" height="50"/><rect class="g" x="90" y="100" width="90" height="50"/><rect class="g" x="90" y="150" width="90" height="50"/><rect class="g" x="90" y="200" width="90" height="50"/><rect class="g" x="90" y="250" width="90" height="50"/><rect class="g" x="90" y="300" width="90" height="50"/><rect class="g" x="90" y="350" width="90" height="50"/><rect class="g" x="90" y="400" width="90" height="50"/><rect class="g" x="180" y="0" width="90" height="50"/><rect class="g" x="180" y="50" width="90" height="50"/><rect class="g" x="180" y="100" width="90" height="50"/><rect class="g" x="180" y="150" width="90" height="50"/><rect class="g" x="180" y="200" width="90" height="50"/><rect class="g" x="180" y="250" width="90" height="50"/><rect class="g" x="180" y="300" width="90" height="50"/><rect class="g" x="180" y="350" width="90" height="50"/><rect class="g" x="180" y="400" width="90" height="50"/><rect class="g" x="270" y="0" width="90" height="50"/><rect class="g" x="270" y="50" width="90" height="50"/><rect class="g" x="270" y="100" width="90" height="50"/><rect class="g" x="270" y="150" width="90" height="50"/><rect class="g" x="270" y="200" width="90" height="50"/><rect class="g" x="270" y="250" width="90" height="50"/><rect class="g" x="270" y="300" width="90" height="50"/><rect class="g" x="270" y="350" width="90" height="50"/><rect class="g" x="270" y="400" width="90" height="50"/><rect class="g" x="360" y="0" width="90" height="50"/><rect class="g" x="360" y="50" width="90" height="50"/><rect class="g" x="360" y="100" width="90" height="50"/><rect class="g" x="360" y="150" width="90" height="50"/><rect class="g" x="360" y="200" width="90" height="50"/><rect class="g" x="360" y="250" width="90" height="50"/><rect class="g" x="360" y="300" width="90" height="50"/><rect class="g" x="360" y="350" width="90" height="50"/><rect class="g" x="360" y="400" width="90" height="50"/><rect class="g" x="450" y="0" width="90" height="50"/><rect class="g" x="450" y="50" width="90" height="50"/><rect class="g" x="450" y="100" width="90" height="50"/><rect class="g" x="450" y="150" width="90" height="50"/><rect class="g" x="450" y="200" width="90" height="50"/><rect class="g" x="450" y="250" width="90" height="50"/><rect class="g" x="450" y="300" width="90" height="50"/><rect class="g" x="450" y="350" width="90" height="50"/><rect class="g" x="450" y="400" width="90" height="50"/><rect class="g" x="540" y="0" width="90" height="50"/><rect class="g" x="540" y="50" width="90" height="50"/><rect class="g" x="540" y="100" width="90" height="50"/><rect class="g" x="540" y="150" width="90" height="50"/><rect class="g" x="540" y="200" width="90" height="50"/><rect class="g" x="540" y="250" width="90" height="50"/><rect class="g" x="540" y="300" width="90" height="50"/><rect class="g" x="540" y="350" width="90" height="50"/><rect class="g" x="540" y="400" width="90" height="50"/><rect class="g" x="630" y="0" width="90" height="50"/><rect class="g" x="630" y="50" width="90" height="50"/><rect class="g" x="630" y="100" width="90" height="50"/><rect class="g" x="630" y="150" width="90" height="50"/><rect class="g" x="630" y="200" width="90" height="50"/><rect class="g" x="630" y="250" width="90" height="50"/><rect class="g" x="630" y="300" width="90" height="50"/><rect class="g" x="630" y="350" width="90" height="50"/><rect class="g" x="630" y="400" width="90" height="50"/>
<line class="s" x1="270" y1="0" x2="270" y2="450"/><line class="s" x1="540" y1="0" x2="540" y2="450"/>
<text class="h" x="45" y="31" text-anchor="middle">A</text><text class="h" x="135" y="31" text-anchor="middle">B</text><text class="h" x="225" y="31" text-anchor="middle">C</text><text class="h" x="315" y="31" text-anchor="middle">P</text><text class="h" x="405" y="31" text-anchor="middle">Q</text><text class="h" x="495" y="31" text-anchor="middle">R</text><text class="h" x="585" y="31" text-anchor="middle">Y</text><text class="h" x="675" y="31" text-anchor="middle">Z</text>
<text class="t" x="45" y="81" text-anchor="middle">0</text><text class="t" x="135" y="81" text-anchor="middle">0</text><text class="t" x="225" y="81" text-anchor="middle">0</text><text class="t" x="315" y="81" text-anchor="middle">0</text><text class="t" x="405" y="81" text-anchor="middle">0</text><text class="t" x="495" y="81" text-anchor="middle">0</text><text class="t" x="585" y="81" text-anchor="middle">0</text><text class="t" x="675" y="81" text-anchor="middle">0</text><text class="t" x="45" y="131" text-anchor="middle">0</text><text class="t" x="135" y="131" text-anchor="middle">0</text><text class="t" x="225" y="131" text-anchor="middle">1</text><text class="t" x="315" y="131" text-anchor="middle">0</text><text class="t" x="405" y="131" text-anchor="middle">0</text><text class="t" x="495" y="131" text-anchor="middle">0</text><text class="t" x="585" y="131" text-anchor="middle">1</text><text class="t" x="675" y="131" text-anchor="middle">0</text><text class="t" x="45" y="181" text-anchor="middle">0</text><text class="t" x="135" y="181" text-anchor="middle">1</text><text class="t" x="225" y="181" text-anchor="middle">0</text><text class="t" x="315" y="181" text-anchor="middle">1</text><text class="t" x="405" y="181" text-anchor="middle">0</text><text class="t" x="495" y="181" text-anchor="middle">0</text><text class="t" x="585" y="181" text-anchor="middle">1</text><text class="t" x="675" y="181" text-anchor="middle">0</text><text class="t" x="45" y="231" text-anchor="middle">0</text><text class="t" x="135" y="231" text-anchor="middle">1</text><text class="t" x="225" y="231" text-anchor="middle">1</text><text class="t" x="315" y="231" text-anchor="middle">1</text><text class="t" x="405" y="231" text-anchor="middle">0</text><text class="t" x="495" y="231" text-anchor="middle">1</text><text class="t" x="585" y="231" text-anchor="middle">0</text><text class="t" x="675" y="231" text-anchor="middle">1</text><text class="t" x="45" y="281" text-anchor="middle">1</text><text class="t" x="135" y="281" text-anchor="middle">0</text><text class="t" x="225" y="281" text-anchor="middle">0</text><text class="t" x="315" y="281" text-anchor="middle">1</text><text class="t" x="405" y="281" text-anchor="middle">0</text><text class="t" x="495" y="281" text-anchor="middle">0</text><text class="t" x="585" y="281" text-anchor="middle">1</text><text class="t" x="675" y="281" text-anchor="middle">0</text><text class="t" x="45" y="331" text-anchor="middle">1</text><text class="t" x="135" y="331" text-anchor="middle">0</text><text class="t" x="225" y="331" text-anchor="middle">1</text><text class="t" x="315" y="331" text-anchor="middle">1</text><text class="t" x="405" y="331" text-anchor="middle">0</text><text class="t" x="495" y="331" text-anchor="middle">1</text><text class="t" x="585" y="331" text-anchor="middle">0</text><text class="t" x="675" y="331" text-anchor="middle">1</text><text class="t" x="45" y="381" text-anchor="middle">1</text><text class="t" x="135" y="381" text-anchor="middle">1</text><text class="t" x="225" y="381" text-anchor="middle">0</text><text class="t" x="315" y="381" text-anchor="middle">0</text><text class="t" x="405" y="381" text-anchor="middle">1</text><text class="t" x="495" y="381" text-anchor="middle">0</text><text class="t" x="585" y="381" text-anchor="middle">0</text><text class="t" x="675" y="381" text-anchor="middle">1</text><text class="t" x="45" y="431" text-anchor="middle">1</text><text class="t" x="135" y="431" text-anchor="middle">1</text><text class="t" x="225" y="431" text-anchor="middle">1</text><text class="t" x="315" y="431" text-anchor="middle">0</text><text class="t" x="405" y="431" text-anchor="middle">1</text><text class="t" x="495" y="431" text-anchor="middle">0</text><text class="t" x="585" y="431" text-anchor="middle">1</text><text class="t" x="675" y="431" text-anchor="middle">1</text>
</svg>$q7a$; v_hash:=encode(digest(v_svg,'sha256'),'hex');
  UPDATE mark_scheme_assets SET content_md=v_svg,content_hash=v_hash,source_page=8,
    source_bbox='[83,90,318,242]'::jsonb,alt_text='Official completed full-adder truth table including P Q R Y Z',
    structure_json='{"representation":"SVG-CODE","reviewedAtDpi":180,"columns":["A","B","C","P","Q","R","Y","Z"],"rows":8}'::jsonb
  WHERE id='dd74e47e-01c3-4e02-a5d3-18c4aa585b44'::uuid
    AND mark_scheme_id='06cc0dca-d6f4-44eb-93ff-92a99902e17d'::uuid
    AND source_paper_id=v_source;

  -- Q7(c): preserve negation bars in official Boolean expressions.
  v_svg := $q7c$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 150" width="820" height="150" role="img" aria-label="Official Boolean expressions for full-adder outputs">
<rect width="820" height="150" fill="white"/><style>.m{font-family:"Courier New",Courier,monospace;font-size:21px;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:19px;fill:#222}.o{text-decoration:overline}</style>
<text class="m" x="8" y="32">Y = <tspan class="o">A</tspan> <tspan class="o">B</tspan> C + <tspan class="o">A</tspan> B <tspan class="o">C</tspan> + A <tspan class="o">B</tspan> <tspan class="o">C</tspan> + A B C</text>
<text class="t" x="8" y="61">Purpose: Sum bit</text>
<text class="m" x="8" y="105">Z = <tspan class="o">A</tspan> B C + A <tspan class="o">B</tspan> C + A B <tspan class="o">C</tspan> + A B C</text>
<text class="t" x="8" y="134">Purpose: Carry output</text>
</svg>$q7c$; v_hash:=encode(digest(v_svg,'sha256'),'hex');
  IF NOT EXISTS (SELECT 1 FROM mark_scheme_assets WHERE mark_scheme_id='f612bc96-a094-4d87-9945-97692f40a540'::uuid AND source_sha256=v_sha AND content_hash=v_hash) THEN
    INSERT INTO mark_scheme_assets(id,mark_scheme_id,source_paper_id,source_sha256,kind,content_md,alt_text,source_page,source_bbox,structure_json,content_hash,sort_order)
    VALUES(gen_random_uuid(),'f612bc96-a094-4d87-9945-97692f40a540'::uuid,v_source,v_sha,'diagram',v_svg,'Official Boolean expressions and purposes for Q7(c)',8,'[82,281,315,327]'::jsonb,
      '{"representation":"SVG-CODE","reviewedAtDpi":180,"purposeY":"Sum bit","purposeZ":"Carry output"}'::jsonb,v_hash,0);
  END IF;

  -- Q8(b): preserve official example insertion-sort code formatting.
  v_svg := $q8b$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 950 455" width="950" height="455" role="img" aria-label="Official insertion-sort example algorithm">
<rect width="950" height="455" fill="white"/><style>.m{font-family:"Courier New",Courier,monospace;font-size:20px;fill:#444;white-space:pre}</style>
<text class="m" x="8" y="28">YearSize ← 249</text><text class="m" x="8" y="55">FOR Student ← 2 to YearSize</text><text class="m" x="8" y="82">    Temp1 ← Score[Student]</text><text class="m" x="8" y="109">    Temp2 ← Name[Student,1]</text><text class="m" x="8" y="136">    Temp3 ← Name[Student,2]</text><text class="m" x="8" y="163">    Counter ← Student</text><text class="m" x="8" y="190">    WHILE Counter &gt; 1 AND Score[Counter - 1] &lt; Temp1</text><text class="m" x="8" y="217">        Score[Counter] ← Score[Counter - 1]</text><text class="m" x="8" y="244">        Name[Counter,1] ← Name[Counter - 1,1]</text><text class="m" x="8" y="271">        Name[Counter,2] ← Name[Counter - 1,2]</text><text class="m" x="8" y="298">        Counter ← Counter - 1</text><text class="m" x="8" y="325">    ENDWHILE</text><text class="m" x="8" y="352">    Score[Counter] ← Temp1</text><text class="m" x="8" y="379">    Name[Counter,1] ← Temp2</text><text class="m" x="8" y="406">    Name[Counter,2] ← Temp3</text><text class="m" x="8" y="433">NEXT Student</text>
</svg>$q8b$; v_hash:=encode(digest(v_svg,'sha256'),'hex');
  IF NOT EXISTS (SELECT 1 FROM mark_scheme_assets WHERE mark_scheme_id='9c53187e-591b-4fdb-8c27-e1b7bd7dc8f8'::uuid AND source_sha256=v_sha AND content_hash=v_hash) THEN
    INSERT INTO mark_scheme_assets(id,mark_scheme_id,source_paper_id,source_sha256,kind,content_md,alt_text,source_page,source_bbox,structure_json,content_hash,sort_order)
    VALUES(gen_random_uuid(),'9c53187e-591b-4fdb-8c27-e1b7bd7dc8f8'::uuid,v_source,v_sha,'pseudocode',v_svg,'Official example insertion-sort algorithm for Q8(b)',9,'[82,160,337,320]'::jsonb,
      '{"representation":"SVG-CODE","reviewedAtDpi":180,"language":"pseudocode","algorithm":"insertion sort"}'::jsonb,v_hash,0);
  END IF;

  -- Q9(c): replace placeholder completed paradigm table.
  v_svg := $q9c$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" width="800" height="520" role="img" aria-label="Official completed programming paradigm table">
<rect x="0.7" y="0.7" width="798.6" height="518.6" fill="white" stroke="#555" stroke-width="1.2"/>
<line x1="425" y1="0" x2="425" y2="520" stroke="#555" stroke-width="1.2"/>
<line x1="0" y1="48" x2="800" y2="48" stroke="#555" stroke-width="1.2"/><line x1="0" y1="150" x2="800" y2="150" stroke="#555" stroke-width="1.2"/><line x1="0" y1="245" x2="800" y2="245" stroke="#555" stroke-width="1.2"/><line x1="0" y1="340" x2="800" y2="340" stroke="#555" stroke-width="1.2"/>
<style>.h{font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:18px;fill:#222}.m{font-family:"Courier New",Courier,monospace;font-size:17px;fill:#444}</style>
<text class="h" x="212.5" y="31" text-anchor="middle">Program code example</text><text class="h" x="612.5" y="31" text-anchor="middle">Programming paradigm</text>
<text class="m" x="12" y="78">male(john).</text><text class="m" x="12" y="101">female(ethel).</text><text class="m" x="12" y="124">parent(john, ethel).</text><text class="t" x="445" y="104">Declarative</text>
<text class="m" x="12" y="181">FOR Counter = 1 TO 20</text><text class="m" x="46" y="205">X = X * Counter</text><text class="m" x="12" y="229">NEXT Counter</text><text class="t" x="445" y="202">Procedural / imperative</text>
<text class="m" x="12" y="277">Start: LDD Counter</text><text class="m" x="46" y="301">INC ACC</text><text class="m" x="46" y="325">STO Counter</text><text class="t" x="445" y="301">Low-level / assembly</text>
<text class="m" x="12" y="372">public class Vehicle</text><text class="m" x="12" y="395">{</text><text class="m" x="46" y="418">private speed;</text><text class="m" x="46" y="441">public Vehicle()</text><text class="m" x="46" y="464">{ speed = 0; }</text><text class="m" x="12" y="487">}</text><text class="t" x="445" y="442">Object oriented / (OOP)</text>
</svg>$q9c$; v_hash:=encode(digest(v_svg,'sha256'),'hex');
  UPDATE mark_scheme_assets SET content_md=v_svg,content_hash=v_hash,source_page=10,
    source_bbox='[82,80,314,279]'::jsonb,alt_text='Official completed programming-code to paradigm table',
    structure_json='{"representation":"SVG-CODE","reviewedAtDpi":180,"rows":4}'::jsonb
  WHERE id='d23eeb6a-c638-4edd-b483-b945ac1c4ebb'::uuid
    AND mark_scheme_id='406f2879-702b-4a92-a7fb-84b512400403'::uuid
    AND source_paper_id=v_source;

  IF (SELECT count(*) FROM mark_scheme_assets WHERE source_paper_id=v_source AND source_sha256=v_sha) < 8
  THEN RAISE EXCEPTION 'ms31_visual_asset_postcondition_failed'; END IF;

  IF EXISTS (
    SELECT 1 FROM mark_scheme_assets
    WHERE source_paper_id=v_source AND source_bbox='[0, 0, 1, 1]'::jsonb
      AND mark_scheme_id IN (
       '463b5b8e-2944-43ae-b68d-bd6bc2fe485d'::uuid,
       '9d18edc6-9691-4a55-af4b-6bb3c5d16864'::uuid,
       '06cc0dca-d6f4-44eb-93ff-92a99902e17d'::uuid,
       '406f2879-702b-4a92-a7fb-84b512400403'::uuid
      )
  ) THEN RAISE EXCEPTION 'ms31_placeholder_bbox_postcondition_failed'; END IF;
END $$;