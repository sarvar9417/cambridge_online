-- 9618/22/M/J/21 Q2-Q3 source visual repair.
-- Literal page-3/page-5 review found:
-- * Q2 diagram/table assets point to the same stored crop and Q2(a)(ii) uses an oversized crop.
-- * Q2(a)(i) flattens the diagram/table into prose and adds a duplicate drawing area.
-- * Q3(a/b/c) are the same linked-list source diagram but their stored bboxes grow with each
--   subpart; Q3(d) uses an oversized page-region crop for the blank completion diagram.
-- Reproducible source geometry is rebuilt as crop-sized SVGs and consumed explicitly.

DO $$
DECLARE
  v_paper uuid := 'ea1c9885-064f-4a69-a019-7739030fce89'::uuid;
  v_sha text := 'e3427f3edd7844a2f00a4340b444a4d67602b34b08769de2da9126ceb8f70cc5';

  v_q2i uuid := '89882f23-c818-4ad3-a333-93b1f9a1f390'::uuid;
  v_a2diag uuid := 'eff606e9-f3af-4a3e-977d-9b46f54c8981'::uuid;
  v_a2table uuid := '95dbed94-647a-498f-b4c1-69ff53855cd1'::uuid;
  v_q2ii uuid := 'de1b76d7-2528-4064-a1d0-075849c3f10d'::uuid;
  v_a2diag2 uuid := '59b271ba-5fad-4792-a5af-d634781c99de'::uuid;

  v_q3a uuid := '60d4dacd-2903-4dfc-85fa-c16f2bde7670'::uuid;
  v_a3a uuid := 'ab3b5765-07d8-47e9-a56a-4a2f74bb3cb7'::uuid;
  v_q3b uuid := '849dfd23-9c6f-4019-bb51-f5c9ccc3c84a'::uuid;
  v_a3b uuid := '5741e618-ff35-42fe-ad9c-a95633ab9820'::uuid;
  v_q3c uuid := '414afc4d-8fa9-4589-a2b3-60ba935d4923'::uuid;
  v_a3c uuid := 'ab5f8f19-907e-4d4e-a666-a6aeaecfdf4d'::uuid;
  v_q3d uuid := '72b8d766-3585-486a-8285-975f837a4e17'::uuid;
  v_a3d uuid := '2e2a10ec-3d1c-4a87-8d69-cf0f02015e2c'::uuid;

  v_state_svg text := $state$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 360" width="900" height="360" role="img" aria-label="State-transition diagram with S1 S2 S3">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#222"/>
    </marker>
  </defs>
  <rect width="900" height="360" fill="white"/>
  <style>.s{fill:white;stroke:#222;stroke-width:2}.a{fill:none;stroke:#222;stroke-width:2;marker-end:url(#arrow)}.t{font-family:Arial,Helvetica,sans-serif;font-size:19px;fill:#222}.l{font-family:Arial,Helvetica,sans-serif;font-size:21px;fill:#222}</style>
  <circle cx="60" cy="170" r="8" fill="#222"/>
  <text class="t" x="50" y="147">X</text>
  <line class="a" x1="69" y1="170" x2="158" y2="170"/>
  <circle class="s" cx="220" cy="170" r="58"/>
  <text class="l" x="220" y="178" text-anchor="middle">S1</text>
  <circle class="s" cx="560" cy="150" r="58"/>
  <text class="l" x="560" y="158" text-anchor="middle">S2</text>
  <circle class="s" cx="400" cy="300" r="58"/>
  <circle class="s" cx="400" cy="300" r="47"/>
  <text class="l" x="400" y="308" text-anchor="middle">S3</text>
  <path class="a" d="M 252 119 C 325 42, 470 45, 526 103"/>
  <text class="t" x="388" y="42" text-anchor="middle">Low level detected | Activate pump</text>
  <path class="a" d="M 219 229 C 220 278, 288 311, 342 303"/>
  <text class="t" x="135" y="298">Normal level detected</text>
  <path class="a" d="M 560 209 C 558 260, 503 294, 458 302"/>
  <text class="t" x="575" y="285">Normal level detected | Deactivate pump</text>
  <path class="a" d="M 597 107 C 650 58, 689 83, 666 134 C 656 151, 637 150, 619 145"/>
  <text class="t" x="648" y="90">Low level detected</text>
</svg>$state$;
  v_state_table_svg text := $stable$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 810 214" width="810" height="214" role="img" aria-label="State-transition answer table">
  <rect x="0.7" y="25.7" width="808.6" height="187.6" fill="white" stroke="#555" stroke-width="1.4"/>
  <line x1="655" y1="26" x2="655" y2="214" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="73" x2="810" y2="73" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="120" x2="810" y2="120" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="167" x2="810" y2="167" stroke="#555" stroke-width="1.4"/>
  <style>.h{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:18px;fill:#222}</style>
  <text class="h" x="732" y="19" text-anchor="middle">Answer</text>
  <text class="t" x="12" y="57">The number of transitions that result in a different state</text>
  <text class="t" x="12" y="104">The number of transitions with associated outputs</text>
  <text class="t" x="12" y="151">The label that should replace ‘X’</text>
  <text class="t" x="12" y="198">The final or halting state</text>
</svg>$stable$;
  v_linked_svg text := $linked$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 930 105" width="930" height="105" role="img" aria-label="Linked-list ADT with Dolphin Cat Fish Elk">
  <defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#222"/></marker></defs>
  <rect width="930" height="105" fill="white"/>
  <style>.g{fill:white;stroke:#222;stroke-width:1.5}.w{stroke:#222;stroke-width:1.6;marker-end:url(#a)}.t{font-family:Arial,Helvetica,sans-serif;font-size:19px;fill:#222}.h{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}</style>
  <text class="h" x="22" y="22">A</text>
  <rect class="g" x="10" y="35" width="42" height="40"/>
  <line class="w" x1="52" y1="55" x2="122" y2="55"/>
  <rect class="g" x="128" y="35" width="112" height="40"/><line class="g" x1="206" y1="35" x2="206" y2="75"/><text class="t" x="167" y="62" text-anchor="middle">Dolphin</text>
  <line class="w" x1="240" y1="55" x2="308" y2="55"/>
  <rect class="g" x="314" y="35" width="112" height="40"/><line class="g" x1="392" y1="35" x2="392" y2="75"/><text class="t" x="353" y="62" text-anchor="middle">Cat</text>
  <line class="w" x1="426" y1="55" x2="494" y2="55"/>
  <rect class="g" x="500" y="35" width="112" height="40"/><line class="g" x1="578" y1="35" x2="578" y2="75"/><text class="t" x="539" y="62" text-anchor="middle">Fish</text>
  <line class="w" x1="612" y1="55" x2="680" y2="55"/>
  <rect class="g" x="686" y="35" width="112" height="40"/><line class="g" x1="764" y1="35" x2="764" y2="75"/><text class="t" x="725" y="62" text-anchor="middle">Elk</text>
  <text class="h" x="783" y="22">B</text>
</svg>$linked$;
  v_blank_linked_svg text := $blank$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 930 105" width="930" height="105" role="img" aria-label="Blank linked-list completion diagram">
  <rect width="930" height="105" fill="white"/>
  <style>.g{fill:white;stroke:#222;stroke-width:1.5}.t{font-family:Arial,Helvetica,sans-serif;font-size:19px;fill:#222}</style>
  <rect class="g" x="10" y="35" width="42" height="40"/>
  <rect class="g" x="128" y="35" width="112" height="40"/><line class="g" x1="206" y1="35" x2="206" y2="75"/><text class="t" x="167" y="62" text-anchor="middle">Dolphin</text>
  <rect class="g" x="314" y="35" width="112" height="40"/><line class="g" x1="392" y1="35" x2="392" y2="75"/><text class="t" x="353" y="62" text-anchor="middle">Cat</text>
  <rect class="g" x="500" y="35" width="112" height="40"/><line class="g" x1="578" y1="35" x2="578" y2="75"/><text class="t" x="539" y="62" text-anchor="middle">Fish</text>
  <rect class="g" x="686" y="35" width="112" height="40"/><line class="g" x1="764" y1="35" x2="764" y2="75"/><text class="t" x="725" y="62" text-anchor="middle">Elk</text>
</svg>$blank$;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers WHERE id=v_paper AND sha256=v_sha
  ) THEN RAISE EXCEPTION 'vf_mj21_22_q2_q3_source_provenance_mismatch'; END IF;

  IF NOT EXISTS (SELECT 1 FROM question_assets WHERE id=v_a2diag AND question_id=v_q2i AND source_page=3
      AND content_hash='40c560ab25fc619d73047192995cc0324b67ef2073a79cd93ae01fe8dad2dc4b')
  OR NOT EXISTS (SELECT 1 FROM question_assets WHERE id=v_a2table AND question_id=v_q2i AND source_page=3
      AND content_hash='752877d3392dd6694bc4df0d3e2aa41efbde940c2c70cafb58a0c81d5c14668e')
  OR NOT EXISTS (SELECT 1 FROM question_assets WHERE id=v_a2diag2 AND question_id=v_q2ii AND source_page=3
      AND content_hash='40c560ab25fc619d73047192995cc0324b67ef2073a79cd93ae01fe8dad2dc4b')
  OR NOT EXISTS (SELECT 1 FROM question_assets WHERE id=v_a3a AND question_id=v_q3a AND source_page=5
      AND content_hash='ed5f18ee08afa2934dfdd04ecf3160d12e2e6afb6c2a457a726c07c4b432bedd')
  OR NOT EXISTS (SELECT 1 FROM question_assets WHERE id=v_a3b AND question_id=v_q3b AND source_page=5
      AND content_hash='ed5f18ee08afa2934dfdd04ecf3160d12e2e6afb6c2a457a726c07c4b432bedd')
  OR NOT EXISTS (SELECT 1 FROM question_assets WHERE id=v_a3c AND question_id=v_q3c AND source_page=5
      AND content_hash='ed5f18ee08afa2934dfdd04ecf3160d12e2e6afb6c2a457a726c07c4b432bedd')
  OR NOT EXISTS (SELECT 1 FROM question_assets WHERE id=v_a3d AND question_id=v_q3d AND source_page=5
      AND content_hash='2a04673cbd3ff0badf5640198f218300bc7be08658e25ae238f70342aef451a9')
  THEN RAISE EXCEPTION 'vf_mj21_22_q2_q3_asset_provenance_mismatch'; END IF;

  UPDATE question_assets
  SET svg_markup=v_state_svg,storage_path=NULL,source_bbox=NULL,crop_status='not_needed',crop_error=NULL,
      size_bytes=octet_length(v_state_svg),content_hash=encode(digest(v_state_svg,'sha256'),'hex')
  WHERE id IN (v_a2diag,v_a2diag2);

  UPDATE question_assets
  SET svg_markup=v_state_table_svg,storage_path=NULL,source_bbox=NULL,crop_status='not_needed',crop_error=NULL,
      size_bytes=octet_length(v_state_table_svg),content_hash=encode(digest(v_state_table_svg,'sha256'),'hex')
  WHERE id=v_a2table;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','Examine the following state-transition diagram.','type','text','style','paragraph','source',jsonb_build_object('page',3)),
    jsonb_build_object('type','asset','kind','diagram','assetId',v_a2diag::text,'altText','State-transition diagram with states S1, S2 and final state S3','source',jsonb_build_object('page',3)),
    jsonb_build_object('text','Complete the table with reference to the diagram.','type','text','style','task','source',jsonb_build_object('page',3)),
    jsonb_build_object('type','asset','kind','table','assetId',v_a2table::text,'altText','State-transition answer table','source',jsonb_build_object('page',3))
  ),false),updated_at=now() WHERE id=v_q2i;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','Examine the following state-transition diagram.','type','text','style','paragraph','source',jsonb_build_object('page',3)),
    jsonb_build_object('type','asset','kind','diagram','assetId',v_a2diag2::text,'altText','State-transition diagram with states S1, S2 and final state S3','source',jsonb_build_object('page',3)),
    jsonb_build_object('text','The current state is S1. The following inputs occur.\n\n1. Low level detected\n2. Low level detected\n3. Low level detected\n4. Low level detected\n\nGive the number of outputs and the current state.','type','text','style','task','source',jsonb_build_object('page',3)),
    jsonb_build_object('type','answer_area','kind','lines','lines',2,'source',jsonb_build_object('page',3))
  ),false),updated_at=now() WHERE id=v_q2ii;

  UPDATE question_assets
  SET svg_markup=v_linked_svg,storage_path=NULL,source_bbox=NULL,crop_status='not_needed',crop_error=NULL,
      size_bytes=octet_length(v_linked_svg),content_hash=encode(digest(v_linked_svg,'sha256'),'hex')
  WHERE id IN (v_a3a,v_a3b,v_a3c);

  UPDATE question_assets
  SET svg_markup=v_blank_linked_svg,storage_path=NULL,source_bbox=NULL,crop_status='not_needed',crop_error=NULL,
      size_bytes=octet_length(v_blank_linked_svg),content_hash=encode(digest(v_blank_linked_svg,'sha256'),'hex')
  WHERE id=v_a3d;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','The following diagram represents an Abstract Data Type (ADT).','type','text','style','paragraph','source',jsonb_build_object('page',5)),
    jsonb_build_object('type','asset','kind','diagram','assetId',v_a3a::text,'altText','Linked-list ADT with A start item and B null item','source',jsonb_build_object('page',5)),
    jsonb_build_object('text','Identify this type of ADT.','type','text','style','task','source',jsonb_build_object('page',5)),
    jsonb_build_object('type','answer_area','kind','lines','lines',1,'source',jsonb_build_object('page',5))
  ),false),updated_at=now() WHERE id=v_q3a;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','The following diagram represents an Abstract Data Type (ADT).','type','text','style','paragraph','source',jsonb_build_object('page',5)),
    jsonb_build_object('type','asset','kind','diagram','assetId',v_a3b::text,'altText','Linked-list ADT with A start item and B null item','source',jsonb_build_object('page',5)),
    jsonb_build_object('text','Give the technical term for the item labelled A in the diagram.','type','text','style','task','source',jsonb_build_object('page',5)),
    jsonb_build_object('type','answer_area','kind','lines','lines',1,'source',jsonb_build_object('page',5))
  ),false),updated_at=now() WHERE id=v_q3b;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','The following diagram represents an Abstract Data Type (ADT).','type','text','style','paragraph','source',jsonb_build_object('page',5)),
    jsonb_build_object('type','asset','kind','diagram','assetId',v_a3c::text,'altText','Linked-list ADT with A start item and B null item','source',jsonb_build_object('page',5)),
    jsonb_build_object('text','Give the technical term for the item labelled B in the diagram.\n\nExplain the meaning of the value given to this item.','type','text','style','task','source',jsonb_build_object('page',5)),
    jsonb_build_object('type','answer_area','kind','lines','lines',4,'source',jsonb_build_object('page',5))
  ),false),updated_at=now() WHERE id=v_q3c;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','The following diagram represents an Abstract Data Type (ADT).','type','text','style','paragraph','source',jsonb_build_object('page',5)),
    jsonb_build_object('type','asset','kind','diagram','assetId',v_a3a::text,'altText','Linked-list ADT with A start item and B null item','source',jsonb_build_object('page',5)),
    jsonb_build_object('text','Complete the diagram to show the ADT after the data has been sorted in alphabetical order.','type','text','style','task','source',jsonb_build_object('page',5)),
    jsonb_build_object('type','asset','kind','diagram','assetId',v_a3d::text,'altText','Blank linked-list completion diagram','source',jsonb_build_object('page',5))
  ),false),updated_at=now() WHERE id=v_q3d;

  IF EXISTS (
    SELECT 1 FROM question_assets
    WHERE id IN (v_a2diag,v_a2table,v_a2diag2,v_a3a,v_a3b,v_a3c,v_a3d)
      AND storage_path IS NOT NULL
  ) THEN RAISE EXCEPTION 'vf_mj21_22_q2_q3_stale_storage_precedence'; END IF;
END $$;