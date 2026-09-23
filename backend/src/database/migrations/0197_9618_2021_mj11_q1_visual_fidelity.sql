-- Source-faithful code-based repair for VF-E-000004, 9618/11/M/J/21 Q1(a)(i).
-- Literal source review shows the current generated asset compresses the two
-- answer rows and omits the six dotted response lines visible in Cambridge.
-- Preserve the canonical asset ID and replace only SVG/LaTeX representations.

DO $$
DECLARE
  v_asset_id uuid := 'ac6a3282-23d5-462b-8212-191ce792db64'::uuid;
  v_question_id uuid := '5b3a6893-9dd0-49cf-832b-517716b46524'::uuid;
  v_paper_id uuid := 'fab329b3-9fbc-43ac-938b-5d83c815a1e5'::uuid;
  v_expected_sha text := 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453';
  v_svg text := $vf_svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 337" width="794" height="337" role="img" aria-label="Cambridge Q1(a)(i) term and description answer table">
  <rect x="0.7" y="0.7" width="792.6" height="335.6" fill="white" stroke="#555" stroke-width="1.4"/>
  <line x1="124" y1="0" x2="124" y2="337" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="36" x2="794" y2="36" stroke="#555" stroke-width="1.4"/>
  <line x1="0" y1="184" x2="794" y2="184" stroke="#555" stroke-width="1.4"/>
  <style>
    .h{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}
    .t{font-family:Arial,Helvetica,sans-serif;font-size:20px;fill:#222}
    .dots{stroke:#444;stroke-width:2;stroke-linecap:round;stroke-dasharray:1 6}
  </style>
  <text class="h" x="62" y="25" text-anchor="middle">Term</text>
  <text class="h" x="459" y="25" text-anchor="middle">Description</text>
  <text class="t" x="62" y="116" text-anchor="middle">Pixel</text>
  <text class="t" x="62" y="264" text-anchor="middle">File header</text>
  <line class="dots" x1="136" y1="77" x2="780" y2="77"/>
  <line class="dots" x1="136" y1="119" x2="780" y2="119"/>
  <line class="dots" x1="136" y1="161" x2="780" y2="161"/>
  <line class="dots" x1="136" y1="226" x2="780" y2="226"/>
  <line class="dots" x1="136" y1="268" x2="780" y2="268"/>
  <line class="dots" x1="136" y1="310" x2="780" y2="310"/>
</svg>$vf_svg$;
  v_latex text := $vf_latex$\renewcommand{\arraystretch}{1}
\begin{tabular}{|p{2.1cm}|p{11.2cm}|}
\hline
\centering\textbf{Term} & \centering\arraybackslash\textbf{Description}\\
\hline
\centering Pixel &
\begin{minipage}[c][3.1cm][c]{10.8cm}
\dotfill\\[0.65cm]
\dotfill\\[0.65cm]
\dotfill
\end{minipage}\\
\hline
\centering File header &
\begin{minipage}[c][3.1cm][c]{10.8cm}
\dotfill\\[0.65cm]
\dotfill\\[0.65cm]
\dotfill
\end{minipage}\\
\hline
\end{tabular}$vf_latex$;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM question_assets qa
    JOIN questions q ON q.id=qa.question_id
    JOIN source_papers sp ON sp.id=q.source_paper_id
    WHERE qa.id=v_asset_id
      AND q.id=v_question_id
      AND q.path='1.a.i'
      AND sp.id=v_paper_id
      AND sp.sha256=v_expected_sha
      AND qa.kind='table'
      AND qa.source_page=2
      AND qa.content_hash='391c6ca5421c3e06107821cf0101752aa9afd4e3990caea503b3eacfc1e4943d'
  ) THEN
    RAISE EXCEPTION 'vf_e_000004_source_or_asset_provenance_mismatch';
  END IF;

  UPDATE question_assets
  SET svg_markup=v_svg,
      latex_source=v_latex,
      size_bytes=octet_length(v_svg),
      content_hash=encode(digest(v_svg,'sha256'),'hex'),
      crop_status='not_needed',
      crop_error=null
  WHERE id=v_asset_id;

  IF NOT EXISTS (
    SELECT 1
    FROM question_assets qa
    WHERE qa.id=v_asset_id
      AND qa.svg_markup LIKE '%stroke-dasharray%'
      AND qa.svg_markup LIKE '%File header%'
      AND qa.latex_source LIKE '%\\dotfill%'
      AND qa.size_bytes=octet_length(qa.svg_markup)
      AND qa.content_hash=encode(digest(qa.svg_markup,'sha256'),'hex')
  ) THEN
    RAISE EXCEPTION 'vf_e_000004_code_based_repair_postcondition_failed';
  END IF;
END $$;
