-- Source-faithful Q3(a) drawing-area repair for 9618/12/M/J/21.
-- Source page 5 uses a tall ~1.72:1 circuit drawing box with A/B/C labels
-- outside the left edge and S outside the right edge. The previous 13x5
-- generated rectangle was much too wide and content_json also added a second
-- generic drawing answer-area beneath the canonical source visual.

DO $$
DECLARE
  v_paper uuid := '77905939-ac1e-441e-b68a-386f22dfcd3d'::uuid;
  v_sha text := '63c51bb1e39c8795d3dae421cf4e2a79c82a823fcfbdd817c2041b6c6c052eb1';
  v_question uuid := 'e9bf31ba-6fa9-41c7-978c-1d25e43a3c1b'::uuid;
  v_asset uuid := 'e4d7e967-08df-476a-8042-f1c14aea4896'::uuid;
  v_svg text := $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 950 475" width="950" height="475" role="img" aria-label="Logic circuit drawing area with inputs A B C and output S">
  <rect x="58" y="0.7" width="814" height="473.6" fill="white" stroke="#666" stroke-width="1.2"/>
  <style>.l{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}.w{stroke:#666;stroke-width:1.2}</style>
  <text class="l" x="8" y="82">A</text>
  <line class="w" x1="32" y1="76" x2="58" y2="76"/>
  <text class="l" x="8" y="239">B</text>
  <line class="w" x1="32" y1="233" x2="58" y2="233"/>
  <text class="l" x="8" y="396">C</text>
  <line class="w" x1="32" y1="390" x2="58" y2="390"/>
  <line class="w" x1="872" y1="233" x2="918" y2="233"/>
  <text class="l" x="926" y="239">S</text>
</svg>$svg$;
  v_tex text := $tex$\begin{tikzpicture}[font=\sffamily\small]
\draw (0,0) rectangle (13.7,8.0);
\node[font=\bfseries,anchor=east] at (-0.75,6.7) {A};
\draw (-0.65,6.6)--(0,6.6);
\node[font=\bfseries,anchor=east] at (-0.75,4.0) {B};
\draw (-0.65,4.0)--(0,4.0);
\node[font=\bfseries,anchor=east] at (-0.75,1.3) {C};
\draw (-0.65,1.4)--(0,1.4);
\draw (13.7,4.0)--(14.45,4.0);
\node[font=\bfseries,anchor=west] at (14.55,4.0) {S};
\end{tikzpicture}$tex$;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    JOIN question_assets qa ON qa.question_id=q.id
    WHERE q.id=v_question AND q.path='3.a'
      AND sp.id=v_paper AND sp.sha256=v_sha
      AND qa.id=v_asset AND qa.source_page=5
      AND qa.content_hash='749606ded0467888968bd9e141a86b84638cc84e59fd8f794ad1e30f2909f612'
  ) THEN RAISE EXCEPTION 'vf_mj21_12_q3a_provenance_mismatch'; END IF;

  UPDATE question_assets
  SET svg_markup=v_svg,latex_source=v_tex,size_bytes=octet_length(v_svg),
      content_hash=encode(digest(v_svg,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_asset;

  UPDATE questions
  SET content_json=jsonb_set(
    content_json,'{blocks}',
    (
      SELECT jsonb_agg(b.value ORDER BY b.ordinality)
      FROM jsonb_array_elements(content_json->'blocks') WITH ORDINALITY b(value,ordinality)
      WHERE b.value->>'type'<>'answer_area'
    ),
    false
  ),updated_at=now()
  WHERE id=v_question;

  IF NOT EXISTS (
    SELECT 1 FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_question AND b->>'type'='asset' AND b->>'assetId'=v_asset::text
  ) OR EXISTS (
    SELECT 1 FROM questions q
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks') b
    WHERE q.id=v_question AND b->>'type'='answer_area'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets qa
    WHERE qa.id=v_asset
      AND qa.svg_markup LIKE '%viewBox="0 0 950 475"%'
      AND qa.content_hash=encode(digest(qa.svg_markup,'sha256'),'hex')
  ) THEN RAISE EXCEPTION 'vf_mj21_12_q3a_postcondition_failed'; END IF;
END $$;