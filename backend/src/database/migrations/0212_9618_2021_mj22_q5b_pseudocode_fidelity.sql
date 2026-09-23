-- 9618/22/M/J/21 Q5(b) pseudocode source-consumption repair.
-- Source page 8 presents one monospaced StringClean listing shared by both
-- scoring subparts. The root pseudocode asset is currently dormant/full-page,
-- while both leaves flatten the listing into proportional prose.

DO $$
DECLARE
  v_paper uuid := 'ea1c9885-064f-4a69-a019-7739030fce89'::uuid;
  v_sha text := 'e3427f3edd7844a2f00a4340b444a4d67602b34b08769de2da9126ceb8f70cc5';
  v_root uuid := 'aecb176a-448e-41f1-bdc1-731223ad617e'::uuid;
  v_code uuid := 'c48c8039-7ce7-403d-9435-90f1cfd6d276'::uuid;
  v_qi uuid := 'f82d36b4-2977-43c3-a992-b09da91cf72d'::uuid;
  v_table uuid := 'bc1f1a78-3ace-4a81-b8a0-962b3f6ba2b9'::uuid;
  v_qii uuid := '73cd8595-aca5-4660-9303-c41fa91c9b96'::uuid;
  v_svg text := $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 930 525" width="930" height="525" role="img" aria-label="StringClean pseudocode lines 01 to 19">
  <rect width="930" height="525" fill="white"/>
  <style>.n{font-family:"Courier New",Courier,monospace;font-size:21px;fill:#666}.c{font-family:"Courier New",Courier,monospace;font-size:21px;fill:#555}</style>
  <text class="n" x="12" y="28">01</text>
  <text class="c" x="75" y="28" xml:space="preserve">FUNCTION StringClean(InString : STRING) RETURNS STRING</text>
  <text class="n" x="12" y="54">02</text>
  <text class="n" x="12" y="80">03</text>
  <text class="c" x="110" y="80" xml:space="preserve">DECLARE NextChar : CHAR</text>
  <text class="n" x="12" y="106">04</text>
  <text class="c" x="110" y="106" xml:space="preserve">DECLARE OutString : STRING</text>
  <text class="n" x="12" y="132">05</text>
  <text class="c" x="110" y="132" xml:space="preserve">DECLARE Counter : INTEGER</text>
  <text class="n" x="12" y="158">06</text>
  <text class="n" x="12" y="184">07</text>
  <text class="c" x="110" y="184" xml:space="preserve">OutString ← ""</text>
  <text class="n" x="12" y="210">08</text>
  <text class="n" x="12" y="236">09</text>
  <text class="c" x="110" y="236" xml:space="preserve">FOR Counter ← 1 TO LENGTH(InString)</text>
  <text class="n" x="12" y="262">10</text>
  <text class="c" x="145" y="262" xml:space="preserve">NextChar ← MID(InString, Counter, 1)</text>
  <text class="n" x="12" y="288">11</text>
  <text class="c" x="145" y="288" xml:space="preserve">NextChar ← LCASE(NextChar)</text>
  <text class="n" x="12" y="314">12</text>
  <text class="c" x="145" y="314" xml:space="preserve">IF NOT((NextChar &lt; 'a') OR (NextChar &gt; 'z')) THEN</text>
  <text class="n" x="12" y="340">13</text>
  <text class="c" x="180" y="340" xml:space="preserve">OutString ← OutString &amp; NextChar</text>
  <text class="n" x="12" y="366">14</text>
  <text class="c" x="145" y="366" xml:space="preserve">ENDIF</text>
  <text class="n" x="12" y="392">15</text>
  <text class="c" x="110" y="392" xml:space="preserve">NEXT Counter</text>
  <text class="n" x="12" y="418">16</text>
  <text class="n" x="12" y="444">17</text>
  <text class="c" x="110" y="444" xml:space="preserve">RETURN OutString</text>
  <text class="n" x="12" y="470">18</text>
  <text class="n" x="12" y="496">19</text>
  <text class="c" x="75" y="496" xml:space="preserve">ENDFUNCTION</text>
</svg>$svg$;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    JOIN question_assets qa ON qa.question_id=q.id
    WHERE q.id=v_root AND sp.id=v_paper AND sp.sha256=v_sha
      AND qa.id=v_code AND qa.source_page=8
      AND qa.content_hash='d82c40dac204927959de32e1032adf0727b0b23bae9e1f5f2f89a23e9dac2662'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_table AND question_id=v_qi AND source_page=8
      AND crop_status='ready'
      AND content_hash='ec08c9770038222d79b0eabfc44b4b3fa945e57bd3d3ebfd966e8ba22624cbd6'
  ) THEN RAISE EXCEPTION 'vf_mj21_22_q5b_provenance_mismatch'; END IF;

  UPDATE question_assets
  SET svg_markup=v_svg,storage_path=NULL,source_bbox=NULL,crop_status='not_needed',crop_error=NULL,
      size_bytes=octet_length(v_svg),content_hash=encode(digest(v_svg,'sha256'),'hex')
  WHERE id=v_code;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','The following is a pseudocode function.\n\nLine numbers are given for reference only.','type','text','style','paragraph','source',jsonb_build_object('page',8)),
    jsonb_build_object('type','asset','kind','pseudocode','assetId',v_code::text,'altText','StringClean pseudocode with line numbers 01 to 19','source',jsonb_build_object('page',8)),
    jsonb_build_object('text','Examine the pseudocode and complete the following table.','type','text','style','task','source',jsonb_build_object('page',8)),
    jsonb_build_object('type','asset','kind','table','assetId',v_table::text,'altText','StringClean analysis answer table','source',jsonb_build_object('page',8))
  ),false),updated_at=now() WHERE id=v_qi;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','The following is a pseudocode function.\n\nLine numbers are given for reference only.','type','text','style','paragraph','source',jsonb_build_object('page',8)),
    jsonb_build_object('type','asset','kind','pseudocode','assetId',v_code::text,'altText','StringClean pseudocode with line numbers 01 to 19','source',jsonb_build_object('page',8)),
    jsonb_build_object('text','Write a simplified version of the statement in line 12.','type','text','style','task','source',jsonb_build_object('page',8)),
    jsonb_build_object('type','answer_area','kind','lines','lines',2,'source',jsonb_build_object('page',8))
  ),false),updated_at=now() WHERE id=v_qii;

  IF (
    SELECT count(*) FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id IN (v_qi,v_qii)
      AND b->>'type'='asset'
      AND b->>'assetId'=v_code::text
  ) <> 2 THEN RAISE EXCEPTION 'vf_mj21_22_q5b_code_consumption_postcondition_failed'; END IF;
END $$;