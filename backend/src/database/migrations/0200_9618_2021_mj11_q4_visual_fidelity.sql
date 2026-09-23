-- Source-faithful Q4(c) table repair for 9618/11/M/J/21.
-- Preserve Cambridge column proportions and the headerless two-row choice table.

DO $$
DECLARE
  v_paper uuid := 'fab329b3-9fbc-43ac-938b-5d83c815a1e5'::uuid;
  v_sha text := 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453';
  v_q_i uuid := '560c749b-567d-4f45-9ef4-7cc67d4c25e3'::uuid;
  v_q_ii uuid := 'b0304966-4b2b-4a9d-9bb8-b4ba34b7740d'::uuid;
  v_a_i uuid := 'a6403741-7948-46e6-9c22-c96acb8711d5'::uuid;
  v_a_ii uuid := '29e7c51c-1a27-46f7-a122-b629f0985bd5'::uuid;
  v_svg_i text := $svg_i$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 205" width="850" height="205" role="img" aria-label="Router task tick table">
  <rect x="0.6" y="0.6" width="848.8" height="203.8" fill="white" stroke="#555" stroke-width="1.2"/>
  <line x1="540" y1="0" x2="540" y2="205" stroke="#555" stroke-width="1.2"/>
  <line x1="688" y1="0" x2="688" y2="205" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="58" x2="850" y2="58" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="95" x2="850" y2="95" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="132" x2="850" y2="132" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="169" x2="850" y2="169" stroke="#555" stroke-width="1.2"/>
  <style>.h{font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:17px;fill:#222}</style>
  <text class="h" x="270" y="37" text-anchor="middle">Task</text>
  <text class="h" x="614" y="25" text-anchor="middle">Performed by</text>
  <text class="h" x="614" y="47" text-anchor="middle">router</text>
  <text class="h" x="769" y="25" text-anchor="middle">Not performed</text>
  <text class="h" x="769" y="47" text-anchor="middle">by router</text>
  <text class="t" x="10" y="84">Receives packets from devices</text>
  <text class="t" x="10" y="121">Finds the IP address of a Uniform Resource Locator (URL)</text>
  <text class="t" x="10" y="158">Directs each packet to all devices attached to it</text>
  <text class="t" x="10" y="195">Stores the IP and/or MAC address of all devices attached to it</text>
</svg>$svg_i$;
  v_svg_ii text := $svg_ii$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 263 76" width="263" height="76" role="img" aria-label="Wired or wireless tick table">
  <rect x="0.6" y="0.6" width="261.8" height="74.8" fill="white" stroke="#555" stroke-width="1.2"/>
  <line x1="131" y1="0" x2="131" y2="76" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="38" x2="263" y2="38" stroke="#555" stroke-width="1.2"/>
  <style>.t{font-family:Arial,Helvetica,sans-serif;font-size:18px;fill:#222}</style>
  <text class="t" x="10" y="25">Wired</text>
  <text class="t" x="10" y="63">Wireless</text>
</svg>$svg_ii$;
  v_tex_i text := $tex_i$\small
\renewcommand{\arraystretch}{1.5}
\begin{tabular}{|p{8.7cm}|>{\centering\arraybackslash}p{2.15cm}|>{\centering\arraybackslash}p{2.45cm}|}
\hline
\centering\textbf{Task} & \textbf{Performed by\\router} & \textbf{Not performed\\by router}\\
\hline
Receives packets from devices & &\\ \hline
Finds the IP address of a Uniform Resource Locator (URL) & &\\ \hline
Directs each packet to all devices attached to it & &\\ \hline
Stores the IP and/or MAC address of all devices attached to it & &\\
\hline
\end{tabular}$tex_i$;
  v_tex_ii text := $tex_ii$\small
\renewcommand{\arraystretch}{1.55}
\begin{tabular}{|p{2.9cm}|p{2.9cm}|}
\hline
Wired &\\ \hline
Wireless &\\
\hline
\end{tabular}$tex_ii$;
BEGIN
  IF NOT EXISTS (select 1 from source_papers where id=v_paper and sha256=v_sha) THEN
    RAISE EXCEPTION 'vf_q4_source_provenance_mismatch';
  END IF;
  IF NOT EXISTS (
    select 1 from question_assets where id=v_a_i and question_id=v_q_i and source_page=11
      and content_hash='6959464460989d42a161d57cc67a14c2fe4bfa0a0a1f3edb8989e2f7eb5eb338'
  ) OR NOT EXISTS (
    select 1 from question_assets where id=v_a_ii and question_id=v_q_ii and source_page=12
      and content_hash='80ffa03d3f191bcf1c02f176e75a80b800ac597700fd1158cad8423fc5691ec3'
  ) THEN RAISE EXCEPTION 'vf_q4_asset_provenance_mismatch'; END IF;

  UPDATE question_assets
  SET svg_markup=v_svg_i,latex_source=v_tex_i,size_bytes=octet_length(v_svg_i),
      content_hash=encode(digest(v_svg_i,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_a_i;

  UPDATE question_assets
  SET svg_markup=v_svg_ii,latex_source=v_tex_ii,size_bytes=octet_length(v_svg_ii),
      content_hash=encode(digest(v_svg_ii,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_a_ii;

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    content_json->'blocks'->0,
    content_json->'blocks'->1,
    jsonb_build_object('type','asset','kind','table','assetId',v_a_i::text,
      'altText','Router task table with performed/not performed columns','source',jsonb_build_object('page',11))
  ),false),updated_at=now()
  WHERE id=v_q_i;

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    content_json->'blocks'->0,
    jsonb_build_object('text','Melinda mainly uses the internet to watch films and play computer games.','type','text','style','paragraph','source',jsonb_build_object('page',12)),
    jsonb_build_object('text','Tick one box to identify whether Melinda should connect to the router using a wired or wireless network and justify your choice.','type','text','style','task','source',jsonb_build_object('page',12)),
    jsonb_build_object('type','asset','kind','table','assetId',v_a_ii::text,
      'altText','Wired or wireless choice table','source',jsonb_build_object('page',12)),
    jsonb_build_object('type','answer_area','kind','lines','lines',5,'source',jsonb_build_object('page',12))
  ),false),updated_at=now()
  WHERE id=v_q_ii;

  IF (
    select count(*) from questions q
    cross join lateral jsonb_array_elements(q.content_json->'blocks') b
    where q.id in (v_q_i,v_q_ii) and b->>'type'='asset'
  ) <> 2 THEN RAISE EXCEPTION 'vf_q4_asset_consumption_postcondition_failed'; END IF;
END $$;