-- Source-faithful Q8(b) visual/pseudocode consumption for 9618/31/M/J/21.
-- Source pages 10-11 show two array tables followed by a monospaced bubble-sort
-- listing, then the insertion-sort task and a full-page response area.
-- Production currently flattens all of that into one text block and consumes
-- neither existing asset row.

DO $$
DECLARE
  v_paper uuid := '5861419d-e79b-4eb2-8070-d72fb07f62cb'::uuid;
  v_sha text := '82f001cd257ae2a2a57b5f47289b9a007b23b48db5496dda4a609c5ed2b5ab9e';
  v_question uuid := 'd9873fb0-1ae6-4f63-a5b2-ae4a9bcbf095'::uuid;
  v_table uuid := '8d33a297-e052-4469-adbf-ffa79718097e'::uuid;
  v_code uuid := '5c0b58cb-b5d2-43f1-8406-cb27bc990877'::uuid;
  v_table_svg text := $table_svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 315" width="760" height="315" role="img" aria-label="Sorted Score and Name arrays">
  <rect width="760" height="315" fill="white"/>
  <style>.h{font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:17px;fill:#222}.m{font-family:"Courier New",Courier,monospace;font-size:17px;fill:#444}.g{fill:white;stroke:#555;stroke-width:1.1}.d{fill:none;stroke:#777;stroke-width:1.1;stroke-dasharray:2 3}</style>
  <rect class="g" x="60" y="15" width="110" height="70"/><text class="h" x="115" y="57" text-anchor="middle">Score</text>
  <rect class="g" x="60" y="85" width="110" height="42"/><rect class="g" x="60" y="127" width="110" height="42"/>
  <text class="m" x="78" y="111">98</text><text class="m" x="78" y="153">97</text>
  <text class="h" x="34" y="111" text-anchor="middle">1</text><text class="h" x="34" y="153" text-anchor="middle">2</text>
  <line class="d" x1="60" y1="169" x2="60" y2="231"/><line class="d" x1="170" y1="169" x2="170" y2="231"/>
  <text class="h" x="34" y="205" text-anchor="middle">...</text><path d="M112 185 C126 190 122 207 112 214 C103 220 102 233 102 239" fill="none" stroke="#555" stroke-width="1.5"/>
  <rect class="g" x="60" y="231" width="110" height="42"/><rect class="g" x="60" y="273" width="110" height="42"/>
  <text class="m" x="78" y="257">5</text><text class="m" x="78" y="299">3</text>
  <text class="h" x="34" y="257" text-anchor="middle">248</text><text class="h" x="34" y="299" text-anchor="middle">249</text>

  <rect class="g" x="350" y="15" width="330" height="42"/><text class="h" x="515" y="42" text-anchor="middle">Name</text>
  <rect class="g" x="350" y="57" width="165" height="42"/><rect class="g" x="515" y="57" width="165" height="42"/>
  <text class="h" x="432.5" y="84" text-anchor="middle">1</text><text class="h" x="597.5" y="84" text-anchor="middle">2</text>
  <rect class="g" x="350" y="99" width="165" height="42"/><rect class="g" x="515" y="99" width="165" height="42"/>
  <rect class="g" x="350" y="141" width="165" height="42"/><rect class="g" x="515" y="141" width="165" height="42"/>
  <text class="m" x="362" y="125">Smithfield</text><text class="m" x="527" y="125">Tom</text>
  <text class="m" x="362" y="167">Johnson</text><text class="m" x="527" y="167">Jane</text>
  <text class="h" x="324" y="125" text-anchor="middle">1</text><text class="h" x="324" y="167" text-anchor="middle">2</text>
  <line class="d" x1="350" y1="183" x2="350" y2="231"/><line class="d" x1="515" y1="183" x2="515" y2="231"/><line class="d" x1="680" y1="183" x2="680" y2="231"/>
  <text class="h" x="324" y="211" text-anchor="middle">...</text><path d="M406 190 C420 194 416 208 406 214 C397 220 397 232 397 239" fill="none" stroke="#555" stroke-width="1.5"/><path d="M571 190 C585 194 581 208 571 214 C562 220 562 232 562 239" fill="none" stroke="#555" stroke-width="1.5"/>
  <rect class="g" x="350" y="231" width="165" height="42"/><rect class="g" x="515" y="231" width="165" height="42"/>
  <rect class="g" x="350" y="273" width="165" height="42"/><rect class="g" x="515" y="273" width="165" height="42"/>
  <text class="m" x="362" y="257">Peters</text><text class="m" x="527" y="257">Jade</text>
  <text class="m" x="362" y="299">Allen</text><text class="m" x="527" y="299">John</text>
  <text class="h" x="324" y="257" text-anchor="middle">248</text><text class="h" x="324" y="299" text-anchor="middle">249</text>
</svg>$table_svg$;
  v_code_svg text := $code_svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 520" width="940" height="520" role="img" aria-label="Bubble sort pseudocode">
  <rect width="940" height="520" fill="white"/>
  <style>.m{font-family:"Courier New",Courier,monospace;font-size:20px;fill:#555;white-space:pre}</style>
  <text class="m" x="12" y="30">YearSize ← 249</text>
  <text class="m" x="12" y="56">Flag ← TRUE</text>
  <text class="m" x="12" y="82">WHILE Flag = TRUE</text>
  <text class="m" x="12" y="108">    Flag ← FALSE</text>
  <text class="m" x="12" y="134">    FOR Student ← 1 TO YearSize - 1</text>
  <text class="m" x="12" y="160">        IF Score[Student] &lt; Score[Student + 1] THEN</text>
  <text class="m" x="12" y="186">            Temp1 ← Score[Student]</text>
  <text class="m" x="12" y="212">            Temp2 ← Name[Student,1]</text>
  <text class="m" x="12" y="238">            Temp3 ← Name[Student,2]</text>
  <text class="m" x="12" y="264">            Score[Student] ← Score[Student + 1]</text>
  <text class="m" x="12" y="290">            Name[Student,1] ← Name[Student + 1,1]</text>
  <text class="m" x="12" y="316">            Name[Student,2] ← Name[Student + 1,2]</text>
  <text class="m" x="12" y="342">            Score[Student + 1] ← Temp1</text>
  <text class="m" x="12" y="368">            Name[Student + 1,1] ← Temp2</text>
  <text class="m" x="12" y="394">            Name[Student + 1,2] ← Temp3</text>
  <text class="m" x="12" y="420">            Flag ← TRUE</text>
  <text class="m" x="12" y="446">        ENDIF</text>
  <text class="m" x="12" y="472">    NEXT Student</text>
  <text class="m" x="12" y="498">ENDWHILE</text>
</svg>$code_svg$;
  v_table_tex text := $table_tex$\begin{tabular}{c@{\hspace{2.0cm}}c}
\begin{tabular}{c|c|}\cline{2-2}
&\textbf{Score}\\\cline{2-2}
1&98\\\cline{2-2}
2&97\\\cline{2-2}
$\vdots$&$\vdots$\\\cline{2-2}
248&5\\\cline{2-2}
249&3\\\cline{2-2}
\end{tabular}
&
\begin{tabular}{c|c|c|}\cline{2-3}
&\multicolumn{2}{c|}{\textbf{Name}}\\\cline{2-3}
&\textbf{1}&\textbf{2}\\\cline{2-3}
1&Smithfield&Tom\\\cline{2-3}
2&Johnson&Jane\\\cline{2-3}
$\vdots$&$\vdots$&$\vdots$\\\cline{2-3}
248&Peters&Jade\\\cline{2-3}
249&Allen&John\\\cline{2-3}
\end{tabular}
\end{tabular}$table_tex$;
  v_code_tex text := $code_tex$\begin{tabular}{@{}l@{}}
\texttt{YearSize $\leftarrow$ 249}\\
\texttt{Flag $\leftarrow$ TRUE}\\
\texttt{WHILE Flag = TRUE}\\
\quad\texttt{Flag $\leftarrow$ FALSE}\\
\quad\texttt{FOR Student $\leftarrow$ 1 TO YearSize - 1}\\
\qquad\texttt{IF Score[Student] < Score[Student + 1] THEN}\\
\qquad\quad\texttt{Temp1 $\leftarrow$ Score[Student]}\\
\qquad\quad\texttt{Temp2 $\leftarrow$ Name[Student,1]}\\
\qquad\quad\texttt{Temp3 $\leftarrow$ Name[Student,2]}\\
\qquad\quad\texttt{Score[Student] $\leftarrow$ Score[Student + 1]}\\
\qquad\quad\texttt{Name[Student,1] $\leftarrow$ Name[Student + 1,1]}\\
\qquad\quad\texttt{Name[Student,2] $\leftarrow$ Name[Student + 1,2]}\\
\qquad\quad\texttt{Score[Student + 1] $\leftarrow$ Temp1}\\
\qquad\quad\texttt{Name[Student + 1,1] $\leftarrow$ Temp2}\\
\qquad\quad\texttt{Name[Student + 1,2] $\leftarrow$ Temp3}\\
\qquad\quad\texttt{Flag $\leftarrow$ TRUE}\\
\qquad\texttt{ENDIF}\\
\quad\texttt{NEXT Student}\\
\texttt{ENDWHILE}
\end{tabular}$code_tex$;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers WHERE id=v_paper AND kind='QP' AND sha256=v_sha AND page_count=12
  ) THEN RAISE EXCEPTION 'vf_mj21_31_q8_source_provenance_mismatch'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_table AND question_id=v_question AND source_page=10
      AND content_hash='eefc0a8fcba2ac9a968fd93ffb63f8f49519114dec3026582e3e8e0105f5497b'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_code AND question_id=v_question AND source_page=10
      AND content_hash='b877f25b807e328f8f08536d93fa6e50d0a36828c4d8020bb87348a38cfb25eb'
  ) THEN RAISE EXCEPTION 'vf_mj21_31_q8_asset_provenance_mismatch'; END IF;

  UPDATE question_assets
  SET svg_markup=v_table_svg,latex_source=v_table_tex,size_bytes=octet_length(v_table_svg),
      content_hash=encode(digest(v_table_svg,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_table;

  UPDATE question_assets
  SET svg_markup=v_code_svg,latex_source=v_code_tex,size_bytes=octet_length(v_code_svg),
      content_hash=encode(digest(v_code_svg,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_code;

  UPDATE questions
  SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','The given algorithm is a simple bubble sort that arranges a set of scores stored in a one-dimensional array into descending order, and orders the corresponding students’ names stored into a two-dimensional array in the same order as the scores. All the arrays are indexed from 1.','type','text','style','paragraph','source',jsonb_build_object('page',10)),
    jsonb_build_object('text','The contents of both arrays after sorting are shown.','type','text','style','paragraph','source',jsonb_build_object('page',10)),
    jsonb_build_object('type','asset','kind','table','assetId',v_table::text,'altText','Sorted Score and Name array contents','source',jsonb_build_object('page',10)),
    jsonb_build_object('type','asset','kind','pseudocode','assetId',v_code::text,'altText','Bubble-sort pseudocode given in Q8(b)','source',jsonb_build_object('page',10)),
    jsonb_build_object('text','Write an algorithm, using pseudocode, that will perform the same task using an insertion sort.','type','text','style','task','source',jsonb_build_object('page',11)),
    jsonb_build_object('type','answer_area','kind','lines','lines',20,'source',jsonb_build_object('page',11))
  ),false),updated_at=now()
  WHERE id=v_question;

  IF (
    SELECT count(*) FROM questions q CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_question AND b->>'type'='asset'
  ) <> 2 THEN RAISE EXCEPTION 'vf_mj21_31_q8_asset_consumption_postcondition_failed'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM questions q CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_question AND b->>'type'='answer_area' AND (b->'source'->>'page')::int=11
  ) THEN RAISE EXCEPTION 'vf_mj21_31_q8_answer_area_postcondition_failed'; END IF;
END $$;