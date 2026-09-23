-- Source-faithful page-8 repair for 9618/11/M/J/21 Q3(b).
-- Fixes two code-based assets and makes structured content consume the exact
-- visual assets instead of flattening source geometry into generic HTML tables.

DO $$
DECLARE
  v_question_id uuid := '6b1f48a6-22ba-4522-a8a4-33c41bcfa9ee'::uuid;
  v_paper_id uuid := 'fab329b3-9fbc-43ac-938b-5d83c815a1e5'::uuid;
  v_expected_sha text := 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453';
  v_memory_id uuid := '8649e01d-0211-4558-a541-bbed3279c6ae'::uuid;
  v_ascii_id uuid := '1894154b-5802-47ca-a2d2-2ee9dc63f6f5'::uuid;
  v_trace_id uuid := 'c43ee7fc-9486-4302-a9c9-b48f51f34a33'::uuid;
  v_memory_svg text := $mem_svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 540" width="250" height="540" role="img" aria-label="Cambridge main memory contents">
  <rect width="250" height="540" fill="white"/>
  <style>
    .h{font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:700;fill:#222}
    .a{font-family:"Courier New",Courier,monospace;font-size:18px;fill:#222}
    .v{font-family:Arial,Helvetica,sans-serif;font-size:18px;fill:#333}
    .g{stroke:#555;stroke-width:1.2;fill:none}
    .d{stroke:#777;stroke-width:1.2;stroke-dasharray:2 3;fill:none}
  </style>
  <text class="h" x="54" y="24" text-anchor="middle">Address</text>
  <text class="h" x="165" y="24" text-anchor="middle">Instruction</text>
  <rect class="g" x="95" y="34" width="145" height="290"/>
  <line class="g" x1="95" y1="63" x2="240" y2="63"/>
  <line class="g" x1="95" y1="92" x2="240" y2="92"/>
  <line class="g" x1="95" y1="121" x2="240" y2="121"/>
  <line class="g" x1="95" y1="150" x2="240" y2="150"/>
  <line class="g" x1="95" y1="179" x2="240" y2="179"/>
  <line class="g" x1="95" y1="208" x2="240" y2="208"/>
  <line class="g" x1="95" y1="237" x2="240" y2="237"/>
  <line class="g" x1="95" y1="266" x2="240" y2="266"/>
  <line class="g" x1="95" y1="295" x2="240" y2="295"/>
  <text class="a" x="82" y="55" text-anchor="end">200</text><text class="a" x="107" y="55">LDD 365</text>
  <text class="a" x="82" y="84" text-anchor="end">201</text><text class="a" x="107" y="84">CMP 366</text>
  <text class="a" x="82" y="113" text-anchor="end">202</text><text class="a" x="107" y="113">JPE 209</text>
  <text class="a" x="82" y="142" text-anchor="end">203</text><text class="a" x="107" y="142">INC ACC</text>
  <text class="a" x="82" y="171" text-anchor="end">204</text><text class="a" x="107" y="171">STO 365</text>
  <text class="a" x="82" y="200" text-anchor="end">205</text><text class="a" x="107" y="200">MOV IX</text>
  <text class="a" x="82" y="229" text-anchor="end">206</text><text class="a" x="107" y="229">LDX 365</text>
  <text class="a" x="82" y="258" text-anchor="end">207</text><text class="a" x="107" y="258">OUT</text>
  <text class="a" x="82" y="287" text-anchor="end">208</text><text class="a" x="107" y="287">JMP 200</text>
  <text class="a" x="82" y="316" text-anchor="end">209</text><text class="a" x="107" y="316">END</text>
  <line class="d" x1="95" y1="324" x2="95" y2="390"/>
  <line class="d" x1="240" y1="324" x2="240" y2="390"/>
  <text class="a" x="82" y="362" text-anchor="end">...</text>
  <path d="M168 338 C178 344 174 355 168 360 C162 365 163 376 163 383" class="g"/>
  <rect class="g" x="95" y="390" width="145" height="145"/>
  <line class="g" x1="95" y1="419" x2="240" y2="419"/>
  <line class="g" x1="95" y1="448" x2="240" y2="448"/>
  <line class="g" x1="95" y1="477" x2="240" y2="477"/>
  <line class="g" x1="95" y1="506" x2="240" y2="506"/>
  <text class="a" x="82" y="411" text-anchor="end">365</text><text class="v" x="107" y="411">1</text>
  <text class="a" x="82" y="440" text-anchor="end">366</text><text class="v" x="107" y="440">3</text>
  <text class="a" x="82" y="469" text-anchor="end">367</text><text class="v" x="107" y="469">65</text>
  <text class="a" x="82" y="498" text-anchor="end">368</text><text class="v" x="107" y="498">66</text>
  <text class="a" x="82" y="527" text-anchor="end">IX</text><text class="v" x="107" y="527">0</text>
</svg>$mem_svg$;
  v_memory_latex text := $mem_tex$\small
\begin{tikzpicture}[font=\small]
\node[font=\bfseries] at (-1.1,0.35) {Address};
\node[font=\bfseries] at (1.25,0.35) {Instruction};
\draw (0,0) rectangle (2.7,-5.0);
\foreach \y in {-0.5,-1.0,-1.5,-2.0,-2.5,-3.0,-3.5,-4.0,-4.5} \draw (0,\y)--(2.7,\y);
\foreach \addr/\inst [count=\i from 0] in {200/LDD 365,201/CMP 366,202/JPE 209,203/INC ACC,204/STO 365,205/MOV IX,206/LDX 365,207/OUT,208/JMP 200,209/END}{
  \node[anchor=east,font=\ttfamily] at (-0.15,-0.25-0.5*\i) {\addr};
  \node[anchor=west,font=\ttfamily] at (0.18,-0.25-0.5*\i) {\inst};
}
\draw[densely dotted] (0,-5.0)--(0,-6.1);
\draw[densely dotted] (2.7,-5.0)--(2.7,-6.1);
\node[anchor=east,font=\ttfamily] at (-0.15,-5.55) {...};
\draw (1.35,-5.2) .. controls (1.55,-5.3) and (1.45,-5.55) .. (1.30,-5.62) .. controls (1.15,-5.7) and (1.18,-5.95) .. (1.18,-6.0);
\draw (0,-6.1) rectangle (2.7,-8.6);
\foreach \y in {-6.6,-7.1,-7.6,-8.1} \draw (0,\y)--(2.7,\y);
\foreach \addr/\val [count=\i from 0] in {365/1,366/3,367/65,368/66,IX/0}{
  \node[anchor=east,font=\ttfamily] at (-0.15,-6.35-0.5*\i) {\addr};
  \node[anchor=west] at (0.18,-6.35-0.5*\i) {\val};
}
\end{tikzpicture}$mem_tex$;
  v_ascii_svg text := $ascii_svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 185" width="420" height="185" role="img" aria-label="ASCII code table selected codes only">
  <rect width="420" height="185" fill="white"/>
  <style>.h{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:18px;fill:#333}.g{stroke:#555;stroke-width:1.2;fill:none}</style>
  <text class="h" x="210" y="23" text-anchor="middle">ASCII code table (selected codes only)</text>
  <rect class="g" x="18" y="34" width="384" height="145"/>
  <line class="g" x1="210" y1="34" x2="210" y2="179"/>
  <line class="g" x1="18" y1="63" x2="402" y2="63"/>
  <line class="g" x1="18" y1="92" x2="402" y2="92"/>
  <line class="g" x1="18" y1="121" x2="402" y2="121"/>
  <line class="g" x1="18" y1="150" x2="402" y2="150"/>
  <text class="h" x="114" y="56" text-anchor="middle">ASCII code</text>
  <text class="h" x="306" y="56" text-anchor="middle">Character</text>
  <text class="t" x="114" y="84" text-anchor="middle">65</text><text class="t" x="306" y="84" text-anchor="middle">A</text>
  <text class="t" x="114" y="113" text-anchor="middle">66</text><text class="t" x="306" y="113" text-anchor="middle">B</text>
  <text class="t" x="114" y="142" text-anchor="middle">67</text><text class="t" x="306" y="142" text-anchor="middle">C</text>
  <text class="t" x="114" y="171" text-anchor="middle">68</text><text class="t" x="306" y="171" text-anchor="middle">D</text>
</svg>$ascii_svg$;
  v_ascii_latex text := $ascii_tex$\small
\begin{minipage}{7.6cm}
\centering\textbf{ASCII code table (selected codes only)}\\[1mm]
\renewcommand{\arraystretch}{1.25}
\begin{tabular}{|c|c|}
\hline
\textbf{ASCII code} & \textbf{Character}\\
\hline
65 & A\\ \hline
66 & B\\ \hline
67 & C\\ \hline
68 & D\\
\hline
\end{tabular}
\end{minipage}$ascii_tex$;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    WHERE q.id=v_question_id AND q.path='3.b' AND sp.id=v_paper_id AND sp.sha256=v_expected_sha
      AND q.content_json->'source'->>'sha256'=v_expected_sha
  ) THEN
    RAISE EXCEPTION 'vf_q3b_source_provenance_mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets qa
    WHERE qa.id=v_memory_id AND qa.question_id=v_question_id AND qa.source_page=8
      AND qa.content_hash='d4c91439d98c451ff20f3b8c6567eb8ae6701d433aa91fee02d8694e10ac83d1'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets qa
    WHERE qa.id=v_ascii_id AND qa.question_id=v_question_id AND qa.source_page=8
      AND qa.content_hash='bfd3305dc7aa63b51c16900963ba33b0423804b174e68eb73534033a71981707'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets qa
    WHERE qa.id=v_trace_id AND qa.question_id=v_question_id AND qa.source_page=9
  ) THEN
    RAISE EXCEPTION 'vf_q3b_asset_provenance_mismatch';
  END IF;

  UPDATE question_assets
  SET svg_markup=v_memory_svg,
      latex_source=v_memory_latex,
      size_bytes=octet_length(v_memory_svg),
      content_hash=encode(digest(v_memory_svg,'sha256'),'hex')
  WHERE id=v_memory_id;

  UPDATE question_assets
  SET svg_markup=v_ascii_svg,
      latex_source=v_ascii_latex,
      size_bytes=octet_length(v_ascii_svg),
      content_hash=encode(digest(v_ascii_svg,'sha256'),'hex')
  WHERE id=v_ascii_id;

  UPDATE questions q
  SET content_json=jsonb_set(
    q.content_json,
    '{blocks}',
    (
      select jsonb_agg(
        case ord
          when 3 then jsonb_build_object(
            'type','asset','kind','table','assetId',v_memory_id::text,
            'altText','Main memory contents from the original Cambridge question paper',
            'source',jsonb_build_object('page',8)
          )
          when 4 then jsonb_build_object(
            'type','asset','kind','table','assetId',v_ascii_id::text,
            'altText','ASCII code table (selected codes only) from the original Cambridge question paper',
            'source',jsonb_build_object('page',8)
          )
          when 6 then jsonb_build_object(
            'type','asset','kind','table','assetId',v_trace_id::text,
            'altText','Trace table from the original Cambridge question paper',
            'source',jsonb_build_object('page',9)
          )
          else block
        end
        order by ord
      )
      from jsonb_array_elements(q.content_json->'blocks') with ordinality as t(block,ord)
    ),
    false
  ),
  updated_at=now()
  WHERE q.id=v_question_id;

  IF (
    SELECT count(*)
    FROM jsonb_array_elements((select content_json->'blocks' from questions where id=v_question_id)) b
    WHERE b->>'type'='asset'
      AND b->>'assetId' in (v_memory_id::text,v_ascii_id::text,v_trace_id::text)
  ) <> 3 THEN
    RAISE EXCEPTION 'vf_q3b_structured_asset_postcondition_failed';
  END IF;
END $$;
