-- Source-faithful Q9(c) table consumption for 9618/31/M/J/21.
-- Source page 12 is a two-column four-row table. Production currently flattens
-- the entire table into task text and leaves the canonical table asset unused.

DO $$
DECLARE
  v_paper uuid := '5861419d-e79b-4eb2-8070-d72fb07f62cb'::uuid;
  v_sha text := '82f001cd257ae2a2a57b5f47289b9a007b23b48db5496dda4a609c5ed2b5ab9e';
  v_question uuid := '10e7993d-ae05-4ddd-905c-82489b505a70'::uuid;
  v_asset uuid := '2a004f84-7155-4189-b3cb-bd8e11bfb326'::uuid;
  v_svg text := $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 540" width="900" height="540" role="img" aria-label="Program code examples and programming paradigm answer table">
  <rect x="0.7" y="0.7" width="898.6" height="538.6" fill="white" stroke="#555" stroke-width="1.2"/>
  <line x1="455" y1="0" x2="455" y2="540" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="46" x2="900" y2="46" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="145" x2="900" y2="145" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="235" x2="900" y2="235" stroke="#555" stroke-width="1.2"/>
  <line x1="0" y1="325" x2="900" y2="325" stroke="#555" stroke-width="1.2"/>
  <style>.h{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}.m{font-family:"Courier New",Courier,monospace;font-size:18px;fill:#555;white-space:pre}</style>
  <text class="h" x="227.5" y="30" text-anchor="middle">Program code example</text>
  <text class="h" x="677.5" y="30" text-anchor="middle">Programming paradigm</text>
  <text class="m" x="14" y="75">male(john).</text>
  <text class="m" x="14" y="99">female(ethel).</text>
  <text class="m" x="14" y="123">parent(john, ethel).</text>

  <text class="m" x="14" y="174">FOR Counter = 1 TO 20</text>
  <text class="m" x="48" y="199">X = X * Counter</text>
  <text class="m" x="14" y="224">NEXT Counter</text>

  <text class="m" x="14" y="264">Start: LDD Counter</text>
  <text class="m" x="48" y="289">INC ACC</text>
  <text class="m" x="48" y="314">STO Counter</text>

  <text class="m" x="14" y="354">public class Vehicle</text>
  <text class="m" x="14" y="379">{</text>
  <text class="m" x="48" y="404">private speed;</text>
  <text class="m" x="48" y="429">public Vehicle()</text>
  <text class="m" x="48" y="454">{</text>
  <text class="m" x="82" y="479">speed = 0;</text>
  <text class="m" x="48" y="504">}</text>
  <text class="m" x="14" y="529">}</text>
</svg>$svg$;
  v_tex text := $tex$\renewcommand{\arraystretch}{1.15}
\begin{tabular}{|p{7.4cm}|p{6.4cm}|}\hline
\centering\textbf{Program code example}&\centering\arraybackslash\textbf{Programming paradigm}\\\hline
\texttt{male(john).}\\
\texttt{female(ethel).}\\
\texttt{parent(john, ethel).}
&\\[8pt]\hline
\texttt{FOR Counter = 1 TO 20}\\
\quad\texttt{X = X * Counter}\\
\texttt{NEXT Counter}
&\\[8pt]\hline
\texttt{Start: LDD Counter}\\
\quad\texttt{INC ACC}\\
\quad\texttt{STO Counter}
&\\[8pt]\hline
\texttt{public class Vehicle}\\
\texttt{\{}\\
\quad\texttt{private speed;}\\
\quad\texttt{public Vehicle()}\\
\quad\texttt{\{}\\
\qquad\texttt{speed = 0;}\\
\quad\texttt{\}}\\
\texttt{\}}
&\\[8pt]\hline
\end{tabular}$tex$;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers WHERE id=v_paper AND kind='QP' AND sha256=v_sha AND page_count=12
  ) THEN RAISE EXCEPTION 'vf_mj21_31_q9_source_provenance_mismatch'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_asset AND question_id=v_question AND source_page=12
      AND content_hash='08b0b5930f5f3c13f60cf2e087efd5c96ba330576ce2b77decbbbe86f3350213'
  ) THEN RAISE EXCEPTION 'vf_mj21_31_q9_asset_provenance_mismatch'; END IF;

  UPDATE question_assets
  SET svg_markup=v_svg,latex_source=v_tex,size_bytes=octet_length(v_svg),
      content_hash=encode(digest(v_svg,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_asset;

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','Identify the programming paradigm for each of these program code examples.','type','text','style','task','source',jsonb_build_object('page',12)),
    jsonb_build_object('type','asset','kind','table','assetId',v_asset::text,'altText','Program code examples and programming paradigm answer table','source',jsonb_build_object('page',12))
  ),false),updated_at=now()
  WHERE id=v_question;

  IF NOT EXISTS (
    SELECT 1 FROM questions q CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_question AND b->>'type'='asset' AND b->>'assetId'=v_asset::text
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_asset AND svg_markup LIKE '%Program code example%' AND svg_markup LIKE '%public class Vehicle%'
      AND content_hash=encode(digest(svg_markup,'sha256'),'hex')
  ) THEN RAISE EXCEPTION 'vf_mj21_31_q9_postcondition_failed'; END IF;
END $$;