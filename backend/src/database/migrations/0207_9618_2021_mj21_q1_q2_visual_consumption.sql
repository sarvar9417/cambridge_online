-- 9618/21/M/J/21 Q1-Q2 source-consumption repair.
-- Literal source review: current structured text duplicates the source tables,
-- Q2(a) has an original inline crop that loses precedence to generated SVG,
-- and Q2(b)'s canonical table asset is not consumed at all.

DO $$
DECLARE
  v_paper uuid := 'f0350704-d7c2-4d3d-b3c9-c2c5e658565c'::uuid;
  v_sha text := '95bf694f682ec9bea716a69249c4bac86c34c09aea1ef5c9d8da7ca9124089b6';
  v_q1a uuid := '41a269dd-ea89-4c6b-b49a-519a67ae3e74'::uuid;
  v_a1a uuid := 'ba8d9f75-4ea5-40d9-a98d-f84e9345ad89'::uuid;
  v_q1b uuid := '9f233bc1-533a-4bc8-9b26-104691f7c633'::uuid;
  v_a1b uuid := 'e52b93b5-1767-4484-92c2-42fe050a1001'::uuid;
  v_q2a uuid := 'c0f58766-e2f3-445a-97da-86827ffdcc54'::uuid;
  v_a2a uuid := '8df0f70a-fc95-4218-af24-94e2335fa4ed'::uuid;
  v_q2b uuid := 'f70b5181-5c23-4b7d-8020-e3d19f0c847f'::uuid;
  v_a2b uuid := '2bb16eec-53da-4834-add0-7f88ee50a823'::uuid;
  v_q2b_svg text := $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 128" width="820" height="128" role="img" aria-label="Amended LoanReturn module description table">
  <rect x="0.7" y="0.7" width="818.6" height="126.6" fill="white" stroke="#555" stroke-width="1.4"/>
  <line x1="166" y1="0" x2="166" y2="128" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="42" x2="820" y2="42" stroke="#555" stroke-width="1.4"/>
  <style>.h{font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:17px;fill:#222}.m{font-family:"Courier New",Courier,monospace;font-size:17px;fill:#555}</style>
  <text class="h" x="83" y="27" text-anchor="middle">Module name</text>
  <text class="h" x="493" y="27" text-anchor="middle">Description</text>
  <text class="m" x="83" y="84" text-anchor="middle">LoanReturn()</text>
  <text class="t" x="178" y="64">Called with parameters <tspan class="m">LoanID</tspan>, <tspan class="m">BookID</tspan> and <tspan class="m">Fine</tspan></text>
  <text class="t" x="178" y="87">The module code checks whether the book has been returned on time</text>
  <text class="t" x="178" y="110">and then assigns a new value to <tspan class="m">Fine</tspan></text>
</svg>$svg$;
  v_q2b_tex text := $tex$\small
\renewcommand{\arraystretch}{1.25}
\begin{tabular}{|p{3.0cm}|p{11.2cm}|}
\hline
\textbf{Module name} & \centering\arraybackslash\textbf{Description}\\
\hline
\centering\texttt{LoanReturn()} &
Called with parameters \texttt{LoanID}, \texttt{BookID} and \texttt{Fine}\\
& The module code checks whether the book has been returned on time and then assigns a new value to \texttt{Fine}\\
\hline
\end{tabular}$tex$;
  v_q2a_source_svg text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers
    WHERE id=v_paper AND sha256=v_sha AND year=2021 AND series='MJ' AND variant=1 AND kind='QP'
  ) THEN RAISE EXCEPTION 'vf_mj21_21_q1_q2_source_provenance_mismatch'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_a1a AND question_id=v_q1a AND source_page=2
      AND content_hash='228007d91f93b5fcad133e5f4968ace9d78e8edd5db83f6bfca51b32e89b239b'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_a1b AND question_id=v_q1b AND source_page=2
      AND content_hash='3e62b3ae8e5ebc22caafde0af1816ff3f42edc7ccb0102764484cfb565960a08'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_a2a AND question_id=v_q2a AND source_page=4
      AND content_hash='282019204991d4a3a57ece2924ec76ad63f25f6c456109f7829fedd3c15ff7d0'
      AND content_md LIKE '<svg%<image href="data:image/png;base64,%'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_a2b AND question_id=v_q2b AND source_page=5
      AND content_hash='611bc8b4ed14314dcfb499697c1839fbaca7addfd9b3d8c8607c1032d5cbb293'
  ) THEN RAISE EXCEPTION 'vf_mj21_21_q1_q2_asset_provenance_mismatch'; END IF;

  -- Q1(a): retain prompt prose once, then the literal source table.
  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','A program is being developed to help manage the membership of a football club.','type','text','style','paragraph','source',jsonb_build_object('page',2)),
    jsonb_build_object('text','Complete the following identifier table.','type','text','style','task','source',jsonb_build_object('page',2)),
    jsonb_build_object('type','asset','kind','table','assetId',v_a1a::text,'altText','Identifier table with example value, explanation, variable name and data type columns','source',jsonb_build_object('page',2))
  ),false),updated_at=now() WHERE id=v_q1a;

  -- Q1(b): the statement/error grid must not be flattened into prompt text.
  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','Each pseudocode statement in the following table may contain an error due to the incorrect use of the function or operator.\n\nDescribe the error in each case, or write ‘NO ERROR’ if the statement contains no error.\n\nYou can assume that none of the variables referenced are of an incorrect type.','type','text','style','task','source',jsonb_build_object('page',2)),
    jsonb_build_object('type','asset','kind','table','assetId',v_a1b::text,'altText','Pseudocode statement and error table with five rows','source',jsonb_build_object('page',2))
  ),false),updated_at=now() WHERE id=v_q1b;

  -- Q2(a): use the already-present original source crop, not the generated full-page SVG fallback.
  SELECT content_md INTO v_q2a_source_svg FROM question_assets WHERE id=v_a2a;
  UPDATE question_assets
    SET svg_markup=v_q2a_source_svg,size_bytes=octet_length(v_q2a_source_svg),
        content_hash=encode(digest(v_q2a_source_svg,'sha256'),'hex'),
        crop_status='ready',crop_error=null
    WHERE id=v_a2a;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','Four program modules form part of a program for a library.\n\nA description of the relationship between the modules is summarised as follows:','type','text','style','paragraph','source',jsonb_build_object('page',4)),
    jsonb_build_object('type','asset','kind','table','assetId',v_a2a::text,'altText','Module name and description table for UpdateLoan, LoanExtend, CheckReserve and LoanReturn','source',jsonb_build_object('page',4)),
    jsonb_build_object('text','Draw a structure chart to show the relationship between the four modules and the parameters passed between them.','type','text','style','task','source',jsonb_build_object('page',4)),
    jsonb_build_object('type','answer_area','kind','drawing','lines',null,'source',jsonb_build_object('page',4))
  ),false),updated_at=now() WHERE id=v_q2a;

  -- Q2(b): crop-sized code-based source table + explicit consumption.
  UPDATE question_assets
    SET svg_markup=v_q2b_svg,latex_source=v_q2b_tex,size_bytes=octet_length(v_q2b_svg),
        content_hash=encode(digest(v_q2b_svg,'sha256'),'hex'),crop_status='not_needed',crop_error=null
    WHERE id=v_a2b;

  UPDATE questions SET content_json=jsonb_set(content_json,'{blocks}',jsonb_build_array(
    jsonb_build_object('text','The definition for module LoanReturn() is amended as follows:','type','text','style','paragraph','source',jsonb_build_object('page',5)),
    jsonb_build_object('type','asset','kind','table','assetId',v_a2b::text,'altText','Amended LoanReturn module-name and description table','source',jsonb_build_object('page',5)),
    jsonb_build_object('items',jsonb_build_array('LoanID and BookID are of type STRING','Fine is of type REAL'),'type','list','source',jsonb_build_object('page',5)),
    jsonb_build_object('text','Write the pseudocode header for the amended module LoanReturn().','type','text','style','task','source',jsonb_build_object('page',5)),
    jsonb_build_object('type','answer_area','kind','lines','lines',2,'source',jsonb_build_object('page',5))
  ),false),updated_at=now() WHERE id=v_q2b;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets WHERE id=v_a2a AND svg_markup=content_md
      AND svg_markup LIKE '<svg%<image href="data:image/png;base64,%'
  ) OR NOT EXISTS (
    SELECT 1 FROM questions q CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_q2b AND b->>'type'='asset' AND b->>'assetId'=v_a2b::text
  ) THEN RAISE EXCEPTION 'vf_mj21_21_q1_q2_postcondition_failed'; END IF;
END $$;