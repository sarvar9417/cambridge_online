-- Source-faithful Q1(a)/(b) visual repair for 9618/12/M/J/21.
-- Literal source review of page 2:
--  * Q1(a) has three tall response rows with three dotted lines in each row.
--  * Q1(b) is a headerless 2x2 bordered table with labels in the left column.
-- Existing generated representations flatten/omit these source features.

DO $$
DECLARE
  v_paper uuid := '77905939-ac1e-441e-b68a-386f22dfcd3d'::uuid;
  v_sha text := '63c51bb1e39c8795d3dae421cf4e2a79c82a823fcfbdd817c2041b6c6c052eb1';
  v_q1a uuid := '2f1dc63e-e1ff-472f-9242-1475d879416f'::uuid;
  v_a1a uuid := '216e9449-f087-4ca7-aaf4-1296a0dcbcfa'::uuid;
  v_q1b uuid := 'e186bf38-2f29-457f-84e9-9506421875e7'::uuid;
  v_a1b uuid := '49a0cd3f-ef9a-48d8-b8da-581683cf4574'::uuid;
  v_svg1a text := $q1a_svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 816 483" width="816" height="483" role="img" aria-label="Database terms definition and example table">
  <rect x="0.7" y="0.7" width="814.6" height="481.6" fill="white" stroke="#555" stroke-width="1.4"/>
  <line x1="127" y1="0" x2="127" y2="483" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="39" x2="816" y2="39" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="187" x2="816" y2="187" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="335" x2="816" y2="335" stroke="#555" stroke-width="1.4"/>
  <style>
    .h{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}
    .t{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}
    .dots{stroke:#444;stroke-width:2;stroke-linecap:round;stroke-dasharray:1 6}
  </style>
  <text class="h" x="63.5" y="27" text-anchor="middle">Term</text>
  <text class="h" x="471.5" y="27" text-anchor="middle">Definition and example</text>
  <text class="t" x="63.5" y="121" text-anchor="middle">Field</text>
  <text class="t" x="63.5" y="269" text-anchor="middle">Entity</text>
  <text class="t" x="63.5" y="417" text-anchor="middle">Foreign key</text>
  <line class="dots" x1="139" y1="80" x2="802" y2="80"/>
  <line class="dots" x1="139" y1="125" x2="802" y2="125"/>
  <line class="dots" x1="139" y1="170" x2="802" y2="170"/>
  <line class="dots" x1="139" y1="228" x2="802" y2="228"/>
  <line class="dots" x1="139" y1="273" x2="802" y2="273"/>
  <line class="dots" x1="139" y1="318" x2="802" y2="318"/>
  <line class="dots" x1="139" y1="376" x2="802" y2="376"/>
  <line class="dots" x1="139" y1="421" x2="802" y2="421"/>
  <line class="dots" x1="139" y1="466" x2="802" y2="466"/>
</svg>$q1a_svg$;
  v_svg1b text := $q1b_svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 292 111" width="292" height="111" role="img" aria-label="Third Normal Form choice table">
  <rect x="0.7" y="0.7" width="290.6" height="109.6" fill="white" stroke="#555" stroke-width="1.4"/>
  <line x1="136" y1="0" x2="136" y2="111" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="55.5" x2="292" y2="55.5" stroke="#555" stroke-width="1.4"/>
  <style>.t{font-family:Arial,Helvetica,sans-serif;font-size:19px;fill:#222}</style>
  <text class="t" x="124" y="35" text-anchor="end">In 3NF</text>
  <text class="t" x="124" y="90" text-anchor="end">Not in 3NF</text>
</svg>$q1b_svg$;
  v_tex1a text := $q1a_tex$\small
\renewcommand{\arraystretch}{1}
\begin{tabular}{|p{2.3cm}|p{11.7cm}|}
\hline
\centering\textbf{Term} & \centering\arraybackslash\textbf{Definition and example}\\
\hline
\centering\textbf{Field} &
\begin{minipage}[c][2.7cm][c]{11.3cm}
\dotfill\\[0.55cm]\dotfill\\[0.55cm]\dotfill
\end{minipage}\\
\hline
\centering\textbf{Entity} &
\begin{minipage}[c][2.7cm][c]{11.3cm}
\dotfill\\[0.55cm]\dotfill\\[0.55cm]\dotfill
\end{minipage}\\
\hline
\centering\textbf{Foreign key} &
\begin{minipage}[c][2.7cm][c]{11.3cm}
\dotfill\\[0.55cm]\dotfill\\[0.55cm]\dotfill
\end{minipage}\\
\hline
\end{tabular}$q1a_tex$;
  v_tex1b text := $q1b_tex$\small
\renewcommand{\arraystretch}{1.8}
\begin{tabular}{|>{\raggedleft\arraybackslash}p{2.7cm}|p{3.1cm}|}
\hline
In 3NF &\\ \hline
Not in 3NF &\\
\hline
\end{tabular}$q1b_tex$;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM source_papers
    WHERE id=v_paper AND sha256=v_sha AND year=2021 AND series='MJ' AND variant=2 AND kind='QP'
  ) THEN RAISE EXCEPTION 'vf_mj21_12_q1_source_provenance_mismatch'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_a1a AND question_id=v_q1a AND source_page=2
      AND content_hash='a76aacbd36a6e9011160a29a6adc24eee26f40f4c57055509f97d1effd2e4051'
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_a1b AND question_id=v_q1b AND source_page=2
      AND content_hash='726913f185ff7997741b799064eb8cd50e06b629f10a63eee4567838c34c8dda'
  ) THEN RAISE EXCEPTION 'vf_mj21_12_q1_asset_provenance_mismatch'; END IF;

  UPDATE question_assets
  SET svg_markup=v_svg1a,latex_source=v_tex1a,size_bytes=octet_length(v_svg1a),
      content_hash=encode(digest(v_svg1a,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_a1a;

  UPDATE question_assets
  SET svg_markup=v_svg1b,latex_source=v_tex1b,size_bytes=octet_length(v_svg1b),
      content_hash=encode(digest(v_svg1b,'sha256'),'hex'),crop_status='not_needed',crop_error=null
  WHERE id=v_a1b;

  IF NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_a1a AND svg_markup LIKE '%stroke-dasharray%' AND latex_source LIKE '%\\dotfill%'
      AND size_bytes=octet_length(svg_markup)
      AND content_hash=encode(digest(svg_markup,'sha256'),'hex')
  ) OR NOT EXISTS (
    SELECT 1 FROM question_assets
    WHERE id=v_a1b AND svg_markup LIKE '%viewBox="0 0 292 111"%'
      AND latex_source NOT LIKE '%tikzpicture%'
      AND size_bytes=octet_length(svg_markup)
      AND content_hash=encode(digest(svg_markup,'sha256'),'hex')
  ) THEN RAISE EXCEPTION 'vf_mj21_12_q1_postcondition_failed'; END IF;
END $$;