-- 9618/21/M/J/21 Q4 and Q6 source-consumption repair.
-- Q4(a) currently flattens source pseudocode into prose and leaves the canonical
-- pseudocode asset dormant. Q6 duplicates diagram labels in prose, and Q6(b)'s
-- ready crop bbox/storage points at a much larger page region than the shared diagram.

DO $$
DECLARE
  v_paper uuid := 'f0350704-d7c2-4d3d-b3c9-c2c5e658565c'::uuid;
  v_sha text := '95bf694f682ec9bea716a69249c4bac86c34c09aea1ef5c9d8da7ca9124089b6';
  v_q4 uuid := '4d7a0c85-9c28-44df-a7f8-3e30024fc84c'::uuid;
  v_a4 uuid := '2f6ee126-5c8a-4dd8-9b75-e5dff29ecb3a'::uuid;
  v_q4a uuid := '6e4f1c76-7cc2-44cd-b277-aa6358b52d42'::uuid;
  v_a4trace uuid := '79ad474f-634c-486c-bfc6-ce9f129ced2b'::uuid;
  v_q6a uuid := 'de5b4344-b641-470d-bd81-e56ace72aa3a'::uuid;
  v_a6a uuid := '6a79c482-fda1-4652-8fef-6b9d1712f96f'::uuid;
  v_q6b uuid := 'e1069b08-dd0d-423d-9833-6a354d2c97c9'::uuid;
  v_a6b uuid := '3af22c1d-c6f9-42be-b536-ead6f656dd65'::uuid;
  v_q4_svg text := $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 850" width="920" height="850" role="img" aria-label="Convert pseudocode lines 10 to 41">
  <rect width="920" height="850" fill="white"/>
  <style>.n{font-family:"Courier New",Courier,monospace;font-size:20px;fill:#666}.c{font-family:"Courier New",Courier,monospace;font-size:20px;fill:#555}</style>
  <text class="n" x="18" y="30.0">10</text>
  <text class="c" x="78" y="30.0" xml:space="preserve">FUNCTION Convert(Name : STRING) RETURNS STRING</text>
  <text class="n" x="18" y="55.5">11</text>
  <text class="n" x="18" y="81.0">12</text>
  <text class="c" x="112" y="81.0" xml:space="preserve">DECLARE Flag: BOOLEAN</text>
  <text class="n" x="18" y="106.5">13</text>
  <text class="c" x="112" y="106.5" xml:space="preserve">DECLARE Index : INTEGER</text>
  <text class="n" x="18" y="132.0">14</text>
  <text class="c" x="112" y="132.0" xml:space="preserve">DECLARE ThisChar : CHAR</text>
  <text class="n" x="18" y="157.5">15</text>
  <text class="c" x="112" y="157.5" xml:space="preserve">DECLARE NewName : STRING</text>
  <text class="n" x="18" y="183.0">16</text>
  <text class="n" x="18" y="208.5">17</text>
  <text class="c" x="112" y="208.5" xml:space="preserve">CONSTANT SPACECHAR = ' '</text>
  <text class="n" x="18" y="234.0">18</text>
  <text class="n" x="18" y="259.5">19</text>
  <text class="c" x="112" y="259.5" xml:space="preserve">Flag ← TRUE</text>
  <text class="n" x="18" y="285.0">20</text>
  <text class="c" x="112" y="285.0" xml:space="preserve">Index ← 1</text>
  <text class="n" x="18" y="310.5">21</text>
  <text class="c" x="112" y="310.5" xml:space="preserve">NewName ← ""      // formatted name string</text>
  <text class="n" x="18" y="336.0">22</text>
  <text class="n" x="18" y="361.5">23</text>
  <text class="c" x="112" y="361.5" xml:space="preserve">WHILE Index &lt;= LENGTH(Name)</text>
  <text class="n" x="18" y="387.0">24</text>
  <text class="c" x="146" y="387.0" xml:space="preserve">ThisChar ← MID(Name, Index, 1)</text>
  <text class="n" x="18" y="412.5">25</text>
  <text class="c" x="146" y="412.5" xml:space="preserve">IF Flag = TRUE THEN</text>
  <text class="n" x="18" y="438.0">26</text>
  <text class="c" x="180" y="438.0" xml:space="preserve">NewName ← NewName &amp; UCASE(ThisChar)</text>
  <text class="n" x="18" y="463.5">27</text>
  <text class="c" x="180" y="463.5" xml:space="preserve">IF ThisChar &lt;&gt; SPACECHAR THEN</text>
  <text class="n" x="18" y="489.0">28</text>
  <text class="c" x="214" y="489.0" xml:space="preserve">Flag ← FALSE</text>
  <text class="n" x="18" y="514.5">29</text>
  <text class="c" x="180" y="514.5" xml:space="preserve">ENDIF</text>
  <text class="n" x="18" y="540.0">30</text>
  <text class="c" x="146" y="540.0" xml:space="preserve">ELSE</text>
  <text class="n" x="18" y="565.5">31</text>
  <text class="c" x="180" y="565.5" xml:space="preserve">NewName ← NewName &amp; ThisChar</text>
  <text class="n" x="18" y="591.0">32</text>
  <text class="c" x="146" y="591.0" xml:space="preserve">ENDIF</text>
  <text class="n" x="18" y="616.5">33</text>
  <text class="c" x="146" y="616.5" xml:space="preserve">IF ThisChar = SPACECHAR THEN</text>
  <text class="n" x="18" y="642.0">34</text>
  <text class="c" x="180" y="642.0" xml:space="preserve">Flag ← TRUE</text>
  <text class="n" x="18" y="667.5">35</text>
  <text class="c" x="146" y="667.5" xml:space="preserve">ENDIF</text>
  <text class="n" x="18" y="693.0">36</text>
  <text class="c" x="146" y="693.0" xml:space="preserve">Index ← Index + 1</text>
  <text class="n" x="18" y="718.5">37</text>
  <text class="c" x="112" y="718.5" xml:space="preserve">ENDWHILE</text>
  <text class="n" x="18" y="744.0">38</text>
  <text class="n" x="18" y="769.5">39</text>
  <text class="c" x="112" y="769.5" xml:space="preserve">RETURN NewName</text>
  <text class="n" x="18" y="795.0">40</text>
  <text class="n" x="18" y="820.5">41</text>
  <text class="c" x="78" y="820.5" xml:space="preserve">ENDFUNCTION</text>
</svg>$svg$;
  v_q6_source_storage text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers
    WHERE id=v_paper AND sha256=v_sha AND year=2021 AND series='MJ' AND variant=1 AND kind='QP'
  ) THEN RAISE EXCEPTION 'vf_mj21_21_q4_q6_source_provenance_mismatch'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_a4 AND question_id=v_q4 AND source_page=10
      AND content_hash='96e30bbb2e66be8125064bcf5afec4f6e47ff3826f29bbbf1b41142f4280124d'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_a4trace AND question_id=v_q4a AND source_page=11
      AND crop_status='ready' AND content_hash='ca72c3c4dc29450f176641c66d654400efbb535f6756188090dd04019adbd7b6'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_a6a AND question_id=v_q6a AND source_page=16
      AND crop_status='ready' AND source_bbox='[153,154,1542,538]'::jsonb
      AND content_hash='65e194cee13fee05e33eba999a1b0d5e205149d12443aab88be2ea86c111a229'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_a6b AND question_id=v_q6b AND source_page=16
      AND crop_status='ready' AND source_bbox='[153,154,1542,1116]'::jsonb
      AND content_hash='65e194cee13fee05e33eba999a1b0d5e205149d12443aab88be2ea86c111a229'
  ) THEN RAISE EXCEPTION 'vf_mj21_21_q4_q6_asset_provenance_mismatch'; END IF;

  -- Crop-sized pseudocode representation; preserve exact source line numbers and indentation.
  UPDATE question_assets
  SET svg_markup=v_q4_svg,size_bytes=octet_length(v_q4_svg),
      content_hash=encode(digest(v_q4_svg,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_a4;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','Study the following pseudocode. Line numbers are for reference only.','type','text','style','paragraph','source',jsonb_build_object('page',10)),
    jsonb_build_object('type','asset','kind','pseudocode','assetId',v_a4::text,'altText','Convert(Name) pseudocode with Cambridge line numbers 10 to 41','source',jsonb_build_object('page',10)),
    jsonb_build_object('text','Complete the trace table below by dry running the function when it is called as follows:\n\nResult ← Convert("∇in∇a∇∇Cup")\n\nNote: The symbol ''∇'' has been used to represent a space character.\nUse this symbol for any space characters in the trace table.\n\nThe first row has been completed for you.','type','text','style','task','source',jsonb_build_object('page',11)),
    jsonb_build_object('type','asset','kind','table','assetId',v_a4trace::text,'altText','Empty Convert function trace table with Name, Flag, Index, NewName and ThisChar columns','source',jsonb_build_object('page',11))
  ),false),updated_at=now() WHERE id=v_q4a;

  -- Q6(a)/(b) use the same literal diagram crop. Reuse the exact Q6(a) crop path/bbox
  -- for Q6(b) rather than the oversized Q6(b) page-region crop.
  SELECT storage_path INTO v_q6_source_storage FROM question_assets WHERE id=v_a6a;
  UPDATE question_assets
  SET storage_path=v_q6_source_storage,source_bbox='[153,154,1542,538]'::jsonb,
      crop_status='ready',crop_error=null
  WHERE id=v_a6b;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','The following diagram represents an Abstract Data Type (ADT) for a linked list.','type','text','style','paragraph','source',jsonb_build_object('page',16)),
    jsonb_build_object('type','asset','kind','diagram','assetId',v_a6a::text,'altText','Linked-list ADT and free-list diagram','source',jsonb_build_object('page',16)),
    jsonb_build_object('text','Explain how a node containing data value B is added to the list in alphabetic sequence.','type','text','style','task','source',jsonb_build_object('page',16)),
    jsonb_build_object('type','answer_area','kind','lines','lines',7,'source',jsonb_build_object('page',16))
  ),false),updated_at=now() WHERE id=v_q6a;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','The following diagram represents an Abstract Data Type (ADT) for a linked list.','type','text','style','paragraph','source',jsonb_build_object('page',16)),
    jsonb_build_object('type','asset','kind','diagram','assetId',v_a6b::text,'altText','Linked-list ADT and free-list diagram','source',jsonb_build_object('page',16)),
    jsonb_build_object('text','Describe how the linked list in part (a) may be implemented using variables and arrays.','type','text','style','task','source',jsonb_build_object('page',16)),
    jsonb_build_object('type','answer_area','kind','lines','lines',4,'source',jsonb_build_object('page',16))
  ),false),updated_at=now() WHERE id=v_q6b;

  IF NOT EXISTS (
    SELECT 1 FROM questions q CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_q4a AND b->>'type'='asset' AND b->>'assetId'=v_a4::text
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_a6b AND storage_path=v_q6_source_storage AND source_bbox='[153,154,1542,538]'::jsonb
  ) THEN RAISE EXCEPTION 'vf_mj21_21_q4_q6_postcondition_failed'; END IF;
END $$;