-- Source-faithful remaining tick-grid repairs for 9618/11/M/J/21.
-- Q7(b)(ii) and Q8 are reproducible code-based tables; preserve the exact
-- column proportions in SVG/LaTeX and consume those canonical assets directly.

DO $$
DECLARE
  v_paper uuid := 'fab329b3-9fbc-43ac-938b-5d83c815a1e5'::uuid;
  v_sha text := 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453';
  v_q7 uuid := '15f5674e-b6cf-4386-89e6-8f50a604e948'::uuid;
  v_a7 uuid := '17eb0daa-5410-45db-8843-633f7fb02272'::uuid;
  v_q8 uuid := '62e94632-92d3-435f-8ea2-61e8a003d6be'::uuid;
  v_a8 uuid := '168599f4-5cee-4993-a3b4-d7cecea66c43'::uuid;
  v_svg7 text := $svg7$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 244 198" width="244" height="198" role="img" aria-label="Relationship tick table">
  <rect x="0.6" y="0.6" width="242.8" height="196.8" fill="white" stroke="#555" stroke-width="1.2"/>
  <line x1="143" y1="0" x2="143" y2="198" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="39" x2="244" y2="39" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="92" x2="244" y2="92" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="145" x2="244" y2="145" stroke="#555" stroke-width="1.2"/>
  <style>.h{font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:17px;fill:#222}</style>
  <text class="h" x="71.5" y="25" text-anchor="middle">Relationship</text>
  <text class="h" x="193.5" y="25" text-anchor="middle">Tick (✓)</text>
  <text class="t" x="71.5" y="72" text-anchor="middle">one-to-one</text>
  <text class="t" x="71.5" y="125" text-anchor="middle">one-to-many</text>
  <text class="t" x="71.5" y="178" text-anchor="middle">many-to-many</text>
</svg>$svg7$;
  v_svg8 text := $svg8$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 202" width="850" height="202" role="img" aria-label="Logic gate identification table">
  <rect x="0.6" y="0.6" width="848.8" height="200.8" fill="white" stroke="#555" stroke-width="1.2"/>
  <line x1="443" y1="0" x2="443" y2="202" stroke="#555" stroke-width="1.2"/>
  <line x1="524" y1="0" x2="524" y2="202" stroke="#555" stroke-width="1.2"/>
  <line x1="605" y1="0" x2="605" y2="202" stroke="#555" stroke-width="1.2"/>
  <line x1="686" y1="0" x2="686" y2="202" stroke="#555" stroke-width="1.2"/>
  <line x1="767" y1="0" x2="767" y2="202" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="40" x2="850" y2="40" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="94" x2="850" y2="94" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="148" x2="850" y2="148" stroke="#555" stroke-width="1.2"/>
  <style>.h{font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:17px;fill:#222}</style>
  <text class="h" x="221.5" y="27" text-anchor="middle">Statement</text>
  <text class="h" x="483.5" y="27" text-anchor="middle">AND</text>
  <text class="h" x="564.5" y="27" text-anchor="middle">NAND</text>
  <text class="h" x="645.5" y="27" text-anchor="middle">NOR</text>
  <text class="h" x="726.5" y="27" text-anchor="middle">XOR</text>
  <text class="h" x="808.5" y="27" text-anchor="middle">OR</text>
  <text class="t" x="10" y="73">The output is 1 only when both inputs are 1</text>
  <text class="t" x="10" y="127">The output is 1 only when both inputs are different</text>
  <text class="t" x="10" y="181">The output is 1 only when both inputs are 0</text>
</svg>$svg8$;
  v_tex7 text := $tex7$\small
\renewcommand{\arraystretch}{1.65}
\begin{tabular}{|>{\centering\arraybackslash}p{3.3cm}|>{\centering\arraybackslash}p{2.25cm}|}
\hline
\textbf{Relationship} & \textbf{Tick (\(\checkmark\))}\\
\hline
one-to-one &\\ \hline
one-to-many &\\ \hline
many-to-many &\\
\hline
\end{tabular}$tex7$;
  v_tex8 text := $tex8$\small
\renewcommand{\arraystretch}{1.65}
\begin{tabular}{|p{8.5cm}|*{5}{>{\centering\arraybackslash}p{1.15cm}|}}
\hline
\centering\textbf{Statement} & \textbf{AND} & \textbf{NAND} & \textbf{NOR} & \textbf{XOR} & \textbf{OR}\\
\hline
The output is 1 only when both inputs are 1 & & & & &\\ \hline
The output is 1 only when both inputs are different & & & & &\\ \hline
The output is 1 only when both inputs are 0 & & & & &\\
\hline
\end{tabular}$tex8$;
BEGIN
  IF NOT EXISTS(select 1 from source_papers where id=v_paper and sha256=v_sha) THEN
    RAISE EXCEPTION 'vf_q7_q8_source_provenance_mismatch';
  END IF;
  IF NOT EXISTS (
    select 1 from question_assets where id=v_a7 and question_id=v_q7 and source_page=15
      and content_hash='5ff2659bc994c9500c4721a4e8d61b2f34fb8242ec737811bf9e1e6207f80272'
  ) OR NOT EXISTS (
    select 1 from question_assets where id=v_a8 and question_id=v_q8 and source_page=16
      and content_hash='dc781f64677d717ce77a7e2eca32e3739672dcf300fff8789636c4302a030b76'
  ) THEN RAISE EXCEPTION 'vf_q7_q8_asset_provenance_mismatch'; END IF;

  UPDATE question_assets
  SET svg_markup=v_svg7,latex_source=v_tex7,size_bytes=octet_length(v_svg7),
      content_hash=encode(digest(v_svg7,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_a7;

  UPDATE question_assets
  SET svg_markup=v_svg8,latex_source=v_tex8,size_bytes=octet_length(v_svg8),
      content_hash=encode(digest(v_svg8,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_a8;

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    content_json->'blocks'->0,
    content_json->'blocks'->1,
    jsonb_build_object('type','asset','kind','table','assetId',v_a7::text,
      'altText','Relationship table with one tick column','source',jsonb_build_object('page',15))
  ),false),updated_at=now()
  WHERE id=v_q7;

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    content_json->'blocks'->0,
    jsonb_build_object('type','asset','kind','table','assetId',v_a8::text,
      'altText','Logic gate identification table','source',jsonb_build_object('page',16))
  ),false),updated_at=now()
  WHERE id=v_q8;

  IF (
    select count(*) from questions q
    cross join lateral jsonb_array_elements(q.content_json->'blocks') b
    where q.id in (v_q7,v_q8) and b->>'type'='asset'
  ) <> 2 THEN RAISE EXCEPTION 'vf_q7_q8_asset_consumption_postcondition_failed'; END IF;
END $$;