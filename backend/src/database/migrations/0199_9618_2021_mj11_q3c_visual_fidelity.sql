-- Source-faithful Q3(c) register repair for 9618/11/M/J/21.
-- The source uses eight equal-width, tall register cells and prints LSL/LSR as
-- separate monospaced instructions. The current structured tables collapse
-- cell width to content and merge the instruction into prose.

DO $$
DECLARE
  v_paper_id uuid := 'fab329b3-9fbc-43ac-938b-5d83c815a1e5'::uuid;
  v_sha text := 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453';
  v_q_ci uuid := '65a578cd-6296-4167-a467-108db756924e'::uuid;
  v_q_cii uuid := '18a43ef1-5579-4f3a-bd74-e983e85ba3f2'::uuid;
  v_filled_ci uuid := 'b8bf030d-017b-4577-a9eb-15547cc6638c'::uuid;
  v_blank_ci uuid := '9ad478a9-6db1-4571-b99b-ec2aa0484cf0'::uuid;
  v_filled_cii uuid := 'e6d89739-5797-42ce-9b13-abc43e526d8a'::uuid;
  v_filled_svg text := $filled_svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 66" width="520" height="66" role="img" aria-label="8-bit accumulator register 00110101">
  <rect x="0.6" y="0.6" width="518.8" height="64.8" fill="white" stroke="#555" stroke-width="1.2"/>
  <line x1="65" y1="0" x2="65" y2="66" stroke="#555" stroke-width="1.2"/>
  <line x1="130" y1="0" x2="130" y2="66" stroke="#555" stroke-width="1.2"/>
  <line x1="195" y1="0" x2="195" y2="66" stroke="#555" stroke-width="1.2"/>
  <line x1="260" y1="0" x2="260" y2="66" stroke="#555" stroke-width="1.2"/>
  <line x1="325" y1="0" x2="325" y2="66" stroke="#555" stroke-width="1.2"/>
  <line x1="390" y1="0" x2="390" y2="66" stroke="#555" stroke-width="1.2"/>
  <line x1="455" y1="0" x2="455" y2="66" stroke="#555" stroke-width="1.2"/>
  <style>.b{font-family:Arial,Helvetica,sans-serif;font-size:21px;fill:#333}</style>
  <text class="b" x="32.5" y="40" text-anchor="middle">0</text>
  <text class="b" x="97.5" y="40" text-anchor="middle">0</text>
  <text class="b" x="162.5" y="40" text-anchor="middle">1</text>
  <text class="b" x="227.5" y="40" text-anchor="middle">1</text>
  <text class="b" x="292.5" y="40" text-anchor="middle">0</text>
  <text class="b" x="357.5" y="40" text-anchor="middle">1</text>
  <text class="b" x="422.5" y="40" text-anchor="middle">0</text>
  <text class="b" x="487.5" y="40" text-anchor="middle">1</text>
</svg>$filled_svg$;
  v_blank_svg text := $blank_svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 66" width="520" height="66" role="img" aria-label="Empty 8-bit accumulator register">
  <rect x="0.6" y="0.6" width="518.8" height="64.8" fill="white" stroke="#555" stroke-width="1.2"/>
  <line x1="65" y1="0" x2="65" y2="66" stroke="#555" stroke-width="1.2"/>
  <line x1="130" y1="0" x2="130" y2="66" stroke="#555" stroke-width="1.2"/>
  <line x1="195" y1="0" x2="195" y2="66" stroke="#555" stroke-width="1.2"/>
  <line x1="260" y1="0" x2="260" y2="66" stroke="#555" stroke-width="1.2"/>
  <line x1="325" y1="0" x2="325" y2="66" stroke="#555" stroke-width="1.2"/>
  <line x1="390" y1="0" x2="390" y2="66" stroke="#555" stroke-width="1.2"/>
  <line x1="455" y1="0" x2="455" y2="66" stroke="#555" stroke-width="1.2"/>
</svg>$blank_svg$;
  v_filled_tex text := $filled_tex$\renewcommand{\arraystretch}{2.1}
\begin{tabular}{|*{8}{>{\centering\arraybackslash}p{1.05cm}|}}
\hline
0&0&1&1&0&1&0&1\\
\hline
\end{tabular}$filled_tex$;
  v_blank_tex text := $blank_tex$\renewcommand{\arraystretch}{2.1}
\begin{tabular}{|*{8}{>{\centering\arraybackslash}p{1.05cm}|}}
\hline
&&&&&&&\\
\hline
\end{tabular}$blank_tex$;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers
    WHERE id=v_paper_id AND sha256=v_sha AND year=2021 AND series='MJ' AND variant=1 AND kind='QP'
  ) THEN RAISE EXCEPTION 'vf_q3c_source_provenance_mismatch'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_filled_ci AND question_id=v_q_ci AND source_page=10
      AND content_hash='9b7f558efa74d0524705e64200b26983d0a22768296a7874f5ae65687ef93620'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_blank_ci AND question_id=v_q_ci AND source_page=10
      AND content_hash='7b8302d1a07862f173165c6eb3f7e07ac5e44c57bde5ad7e1971ac66476af6c0'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_filled_cii AND question_id=v_q_cii AND source_page=10
      AND content_hash='9b7f558efa74d0524705e64200b26983d0a22768296a7874f5ae65687ef93620'
  ) THEN RAISE EXCEPTION 'vf_q3c_asset_provenance_mismatch'; END IF;

  UPDATE question_assets
  SET svg_markup=v_filled_svg,latex_source=v_filled_tex,size_bytes=octet_length(v_filled_svg),
      content_hash=encode(digest(v_filled_svg,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id IN (v_filled_ci,v_filled_cii);

  UPDATE question_assets
  SET svg_markup=v_blank_svg,latex_source=v_blank_tex,size_bytes=octet_length(v_blank_svg),
      content_hash=encode(digest(v_blank_svg,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_blank_ci;

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    content_json->'blocks'->0,
    jsonb_build_object('text','The Accumulator currently contains the binary number:','type','text','style','task','source',jsonb_build_object('page',10)),
    jsonb_build_object('type','asset','kind','table','assetId',v_filled_ci::text,'altText','8-bit Accumulator value 00110101','source',jsonb_build_object('page',10)),
    jsonb_build_object('text','Write the contents of the Accumulator after the processor has executed the following instruction:','type','text','style','task','source',jsonb_build_object('page',10)),
    jsonb_build_object('text','LSL #2','type','code','language','pseudocode','source',jsonb_build_object('page',10)),
    jsonb_build_object('type','asset','kind','table','assetId',v_blank_ci::text,'altText','Empty 8-bit Accumulator register','source',jsonb_build_object('page',10))
  ),false),updated_at=now()
  WHERE id=v_q_ci;

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    content_json->'blocks'->0,
    jsonb_build_object('text','The Accumulator currently contains the binary number:','type','text','style','task','source',jsonb_build_object('page',10)),
    jsonb_build_object('type','asset','kind','table','assetId',v_filled_cii::text,'altText','8-bit Accumulator value 00110101','source',jsonb_build_object('page',10)),
    jsonb_build_object('text','Identify the mathematical operation that the following instruction will perform on the contents of the accumulator.','type','text','style','task','source',jsonb_build_object('page',10)),
    jsonb_build_object('text','LSR #3','type','code','language','pseudocode','source',jsonb_build_object('page',10)),
    jsonb_build_object('type','answer_area','kind','lines','lines',2,'source',jsonb_build_object('page',10))
  ),false),updated_at=now()
  WHERE id=v_q_cii;

  IF (
    SELECT count(*) FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id IN (v_q_ci,v_q_cii) AND b->>'type'='asset'
  ) <> 3 THEN RAISE EXCEPTION 'vf_q3c_structured_asset_postcondition_failed'; END IF;
END $$;
