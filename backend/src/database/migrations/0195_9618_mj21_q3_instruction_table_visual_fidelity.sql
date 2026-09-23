-- VF-E-000001: 9618/11/M/J/21 Q3(b) instruction-set table.
--
-- Source proof:
--   source_paper_id = fab329b3-9fbc-43ac-938b-5d83c815a1e5
--   source_sha256   = d73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453
--   source_page     = 7
--   200-DPI bbox    = [89,286,1565,1549]
--
-- The old asset was attached to Q3 root, so the portable ancestor chain exposed
-- it to Q3(a) and Q3(c) as well as Q3(b). The official paper introduces this
-- table under part (b), so ownership is moved to Q3(b). The SVG below is a
-- source-coordinate reconstruction from the SHA-pinned PDF and preserves the
-- Cambridge grid geometry, merged header and bordered footer notes.
--
-- This migration is fail-closed and idempotent. It refuses to repair a source
-- whose identity or current asset state has drifted.

DO $migration$
DECLARE
  v_asset_id constant uuid := 'f9483ad1-7672-4b18-bd0c-cb6b21507950';
  v_old_owner constant uuid := 'e8c0b040-a260-456b-bac4-b0a06205a032';
  v_target constant uuid := '6b1f48a6-22ba-4522-a8a4-33c41bcfa9ee';
  v_source constant uuid := 'fab329b3-9fbc-43ac-938b-5d83c815a1e5';
  v_source_sha constant text := 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453';
  v_old_hash constant text := 'd65ce640e4e7ad1e8adc1fafb7cddbfa9f2f57e90b1428a195eab5c2718b6d3a';
  v_new_hash constant text := '3eb93fb3af37767404486d5f5188fef371cdb870f886d6f12eb7bf39a116fef3';
  v_owner uuid;
  v_hash text;
  v_page integer;
  v_actual_sha text;
  v_old_source uuid;
  v_target_source uuid;
BEGIN
  SELECT sha256 INTO v_actual_sha FROM source_papers WHERE id=v_source;
  IF v_actual_sha IS NULL OR lower(v_actual_sha) <> v_source_sha THEN
    RAISE EXCEPTION 'VF-E-000001 source SHA drift: %',coalesce(v_actual_sha,'NULL');
  END IF;

  SELECT source_paper_id INTO v_old_source FROM questions WHERE id=v_old_owner;
  SELECT source_paper_id INTO v_target_source FROM questions WHERE id=v_target;
  IF v_old_source IS DISTINCT FROM v_source OR v_target_source IS DISTINCT FROM v_source THEN
    RAISE EXCEPTION 'VF-E-000001 question/source ownership drift';
  END IF;

  SELECT question_id,content_hash,source_page
  INTO v_owner,v_hash,v_page
  FROM question_assets
  WHERE id=v_asset_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VF-E-000001 asset missing';
  END IF;

  -- Already repaired: verify the exact post-state and exit without re-shifting.
  IF v_owner=v_target AND v_hash=v_new_hash THEN
    IF v_page<>7 THEN
      RAISE EXCEPTION 'VF-E-000001 repaired asset page drift: %',v_page;
    END IF;
    RETURN;
  END IF;

  IF v_owner<>v_old_owner OR v_hash IS DISTINCT FROM v_old_hash OR v_page<>7 THEN
    RAISE EXCEPTION 'VF-E-000001 precondition drift owner=% hash=% page=%',v_owner,v_hash,v_page;
  END IF;

  -- Preserve chronological source order inside Q3(b): page 7 first, then the
  -- existing page 8/page 9 structures.
  UPDATE question_assets
  SET sort_order=sort_order+1
  WHERE question_id=v_target;

  UPDATE question_assets
  SET question_id=v_target,
      sort_order=0,
      source_page=7,
      source_bbox='[89,286,1565,1549]'::jsonb,
      crop_status='not_needed',
      svg_markup=$svg$<svg xmlns="http://www.w3.org/2000/svg" width="531.3" height="454.5" viewBox="0 0 531.3 454.5">
<rect width="531.3" height="454.5" fill="white"/>
<path d="M57.16,40.15L57.16,21.05 M57.16,60.34L57.16,41.14 M1.01,60.49L57.16,60.49 M57.16,60.49L136.96,60.49 M57.16,80.18L57.16,60.64 M1.01,80.33L57.16,80.33 M57.16,80.33L136.96,80.33 M57.16,111.36L57.16,80.48 M1.01,111.51L57.16,111.51 M57.16,111.51L136.96,111.51 M57.16,142.54L57.16,111.66 M1.01,142.69L57.16,142.69 M57.16,142.69L136.96,142.69 M57.16,162.38L57.16,142.84 M1.01,162.53L57.16,162.53 M57.16,162.53L136.96,162.53 M57.16,182.23L57.16,162.68 M1.01,182.38L57.16,182.38 M57.16,182.38L136.96,182.38 M57.16,202.07L57.16,182.53 M1.01,202.22L57.16,202.22 M57.16,202.22L136.96,202.22 M57.16,221.91L57.16,202.37 M1.01,222.06L57.16,222.06 M57.16,222.06L136.96,222.06 M57.16,241.75L57.16,222.21 M1.01,241.90L57.16,241.90 M57.16,241.90L136.96,241.90 M57.16,261.60L57.16,242.05 M1.01,261.75L57.16,261.75 M57.16,261.75L136.96,261.75 M57.16,281.44L57.16,261.90 M1.01,281.59L57.16,281.59 M57.16,281.59L136.96,281.59 M57.16,301.28L57.16,281.74 M1.01,301.43L57.16,301.43 M57.16,301.43L136.96,301.43 M57.16,321.13L57.16,301.58 M1.01,321.27L57.16,321.27 M57.16,321.27L136.96,321.27 M57.16,340.97L57.16,321.42 M1.01,341.12L57.16,341.12 M57.16,341.12L136.96,341.12 M57.16,360.81L57.16,341.27 M1.01,360.96L57.16,360.96 M57.16,360.96L136.96,360.96 M57.16,391.99L57.16,361.11 M1.01,392.14L57.16,392.14 M57.16,392.14L136.96,392.14 M57.16,422.82L57.16,392.29 M136.96,60.49L530.26,60.49 M136.96,80.33L530.26,80.33 M136.96,111.51L530.26,111.51 M136.96,142.69L530.26,142.69 M136.96,162.53L530.26,162.53 M136.96,182.38L530.26,182.38 M136.96,202.22L530.26,202.22 M136.96,222.06L530.26,222.06 M136.96,241.90L530.26,241.90 M136.96,261.75L530.26,261.75 M136.96,281.59L530.26,281.59 M136.96,301.43L530.26,301.43 M136.96,321.27L530.26,321.27 M136.96,341.12L530.26,341.12 M136.96,360.96L530.26,360.96 M136.96,392.14L530.26,392.14" fill="none" stroke="#231f20" stroke-width="0.30"/>
<path d="M1.01,20.80L57.16,20.80 M57.16,20.80L136.46,20.80" fill="none" stroke="#231f20" stroke-width="0.50"/>
<path d="M0.01,0.04L57.16,0.04 M0.51,20.80L0.51,0.54 M57.16,0.04L136.96,0.04 M0.51,40.15L0.51,20.80 M0.51,60.49L0.51,41.15 M136.96,60.34L136.96,41.14 M530.76,60.49L530.76,41.15 M0.51,80.33L0.51,60.49 M136.96,80.18L136.96,60.64 M530.76,80.33L530.76,60.49 M0.51,111.51L0.51,80.33 M136.96,111.36L136.96,80.48 M530.76,111.51L530.76,80.33 M0.51,142.69L0.51,111.51 M136.96,142.54L136.96,111.66 M530.76,142.69L530.76,111.51 M0.51,162.53L0.51,142.69 M136.96,162.38L136.96,142.84 M530.76,162.53L530.76,142.69 M0.51,182.38L0.51,162.53 M136.96,182.23L136.96,162.68 M530.76,182.38L530.76,162.53 M0.51,202.22L0.51,182.38 M136.96,202.07L136.96,182.53 M530.76,202.22L530.76,182.38 M0.51,222.06L0.51,202.22 M136.96,221.91L136.96,202.37 M530.76,222.06L530.76,202.22 M0.51,241.91L0.51,222.06 M136.96,241.76L136.96,222.21 M530.76,241.91L530.76,222.06 M0.51,261.75L0.51,241.91 M136.96,261.60L136.96,242.05 M530.76,261.75L530.76,241.91 M0.51,281.59L0.51,261.75 M136.96,281.44L136.96,261.90 M530.76,281.59L530.76,261.75 M0.51,301.43L0.51,281.59 M136.96,301.28L136.96,281.74 M530.76,301.43L530.76,281.59 M0.51,321.27L0.51,301.43 M136.96,321.13L136.96,301.58 M530.76,321.27L530.76,301.43 M0.51,341.12L0.51,321.27 M136.96,340.97L136.96,321.42 M530.76,341.12L530.76,321.27 M0.51,360.96L0.51,341.12 M136.96,360.81L136.96,341.27 M530.76,360.96L530.76,341.12 M0.51,392.14L0.51,360.96 M136.96,391.99L136.96,361.11 M530.76,392.14L530.76,360.96 M0.51,422.82L0.51,392.14 M136.96,422.82L136.96,392.29 M530.76,422.82L530.76,392.14 M0.51,454.00L0.51,423.82 M530.76,454.00L530.76,423.82 M136.96,0.04L531.26,0.04 M136.96,20.80L136.96,0.54 M530.76,20.80L530.76,0.54 M136.96,40.15L136.96,20.80 M530.76,40.15L530.76,20.80 M136.96,40.65L531.26,40.65 M0.01,40.65L57.16,40.65 M57.16,40.65L136.96,40.65 M0.01,423.32L57.16,423.32 M57.16,423.32L136.96,423.32 M136.96,423.32L531.26,423.32" fill="none" stroke="#231f20" stroke-width="1.00"/>
<text x="40.32" y="13.72" font-family="Arial" font-size="11" font-weight="bold" fill="#231f20">Instruction</text>
<text x="302.69" y="23.64" font-family="Arial" font-size="11" font-weight="bold" fill="#231f20">Explanation</text>
<text x="8.37" y="34.73" font-family="Arial" font-size="11" font-weight="bold" fill="#231f20">Opcode</text>
<text x="74.46" y="34.73" font-family="Arial" font-size="11" font-weight="bold" fill="#231f20">Operand</text>
<text x="31.70" y="53.93" font-family="Courier New" font-size="11" fill="#231f20">LDM</text>
<text x="62.84" y="53.93" font-family="Courier New" font-size="11" fill="#231f20">#n</text>
<text x="142.64" y="54.57" font-family="Arial" font-size="11" fill="#231f20">Immediate addressing. Load the number n to ACC</text>
<text x="31.70" y="73.78" font-family="Courier New" font-size="11" fill="#231f20">LDD</text>
<text x="62.84" y="73.78" font-family="Courier New" font-size="11" fill="#231f20">&lt;address&gt;</text>
<text x="142.64" y="74.41" font-family="Arial" font-size="11" fill="#231f20">Direct addressing. Load the contents of the location at the given address to ACC</text>
<text x="31.70" y="99.30" font-family="Courier New" font-size="11" fill="#231f20">LDI</text>
<text x="62.84" y="99.30" font-family="Courier New" font-size="11" fill="#231f20">&lt;address&gt;</text>
<text x="142.64" y="93.43" font-family="Arial" font-size="11" fill="#231f20">Indirect addressing: The address to be used is at the given address. Load the </text>
<text x="142.64" y="106.43" font-family="Arial" font-size="11" fill="#231f20">contents of this second address to ACC</text>
<text x="31.70" y="130.48" font-family="Courier New" font-size="11" fill="#231f20">LDX</text>
<text x="62.84" y="130.48" font-family="Courier New" font-size="11" fill="#231f20">&lt;address&gt;</text>
<text x="142.64" y="124.62" font-family="Arial" font-size="11" fill="#231f20">Indexed addressing. Form the address from &lt;address&gt; + the contents of the </text>
<text x="142.64" y="137.62" font-family="Arial" font-size="11" fill="#231f20">Index Register. Copy the contents of this calculated address to ACC</text>
<text x="31.70" y="156.00" font-family="Courier New" font-size="11" fill="#231f20">LDR</text>
<text x="62.84" y="156.00" font-family="Courier New" font-size="11" fill="#231f20">#n</text>
<text x="142.64" y="156.64" font-family="Arial" font-size="11" fill="#231f20">Immediate addressing. Load the number n to IX</text>
<text x="31.70" y="175.84" font-family="Courier New" font-size="11" fill="#231f20">MOV</text>
<text x="62.84" y="175.84" font-family="Courier New" font-size="11" fill="#231f20">&lt;register&gt;</text>
<text x="142.64" y="176.48" font-family="Arial" font-size="11" fill="#231f20">Move the contents of the accumulator to the given register (IX)</text>
<text x="31.70" y="195.69" font-family="Courier New" font-size="11" fill="#231f20">STO</text>
<text x="62.84" y="195.69" font-family="Courier New" font-size="11" fill="#231f20">&lt;address&gt;</text>
<text x="142.64" y="196.33" font-family="Arial" font-size="11" fill="#231f20">Store contents of ACC at the given address</text>
<text x="31.70" y="215.53" font-family="Courier New" font-size="11" fill="#231f20">ADD</text>
<text x="62.84" y="215.53" font-family="Courier New" font-size="11" fill="#231f20">&lt;address&gt;</text>
<text x="142.64" y="216.17" font-family="Arial" font-size="11" fill="#231f20">Add the contents of the given address to the ACC</text>
<text x="31.70" y="235.38" font-family="Courier New" font-size="11" fill="#231f20">INC</text>
<text x="62.84" y="235.38" font-family="Courier New" font-size="11" fill="#231f20">&lt;register&gt;</text>
<text x="142.64" y="236.01" font-family="Arial" font-size="11" fill="#231f20">Add 1 to the contents of the register (ACC or IX)</text>
<text x="31.70" y="255.22" font-family="Courier New" font-size="11" fill="#231f20">CMP</text>
<text x="62.84" y="255.22" font-family="Courier New" font-size="11" fill="#231f20">&lt;address&gt;</text>
<text x="142.64" y="255.86" font-family="Arial" font-size="11" fill="#231f20">Compare the contents of ACC with the contents of &lt;address&gt;</text>
<text x="31.70" y="275.06" font-family="Courier New" font-size="11" fill="#231f20">JPE</text>
<text x="62.84" y="275.06" font-family="Courier New" font-size="11" fill="#231f20">&lt;address&gt;</text>
<text x="142.64" y="275.70" font-family="Arial" font-size="11" fill="#231f20">Following a compare instruction, jump to &lt;address&gt; if the compare was True</text>
<text x="31.70" y="294.91" font-family="Courier New" font-size="11" fill="#231f20">JPN</text>
<text x="62.84" y="294.91" font-family="Courier New" font-size="11" fill="#231f20">&lt;address&gt;</text>
<text x="142.64" y="295.55" font-family="Arial" font-size="11" fill="#231f20">Following a compare instruction, jump to &lt;address&gt; if the compare was False</text>
<text x="31.70" y="313.33" font-family="Courier New" font-size="11" fill="#231f20">JMP</text>
<text x="62.84" y="313.33" font-family="Courier New" font-size="11" fill="#231f20">&lt;address&gt;</text>
<text x="142.64" y="313.97" font-family="Arial" font-size="11" fill="#231f20">Jump to the given address</text>
<text x="31.70" y="333.18" font-family="Courier New" font-size="11" fill="#231f20">OUT</text>
<text x="142.64" y="333.82" font-family="Arial" font-size="11" fill="#231f20">Output to the screen the character whose ASCII value is stored in ACC</text>
<text x="31.70" y="353.02" font-family="Courier New" font-size="11" fill="#231f20">END</text>
<text x="142.64" y="353.66" font-family="Arial" font-size="11" fill="#231f20">Return control to the operating system</text>
<text x="33.12" y="379.25" font-family="Courier New" font-size="11" fill="#231f20">LSL #n</text>
<text x="141.23" y="373.38" font-family="Arial" font-size="11" fill="#231f20">Bits in ACC are shifted logically n places to the left. Zeros are introduced on </text>
<text x="141.23" y="386.38" font-family="Arial" font-size="11" fill="#231f20">the right hand end</text>
<text x="33.12" y="410.43" font-family="Courier New" font-size="11" fill="#231f20">LSR #n</text>
<text x="141.23" y="404.57" font-family="Arial" font-size="11" fill="#231f20">Bits in ACC are shifted logically n places to the right. Zeros are introduced on </text>
<text x="141.23" y="417.57" font-family="Arial" font-size="11" fill="#231f20">the left hand end</text>
<text x="6.19" y="437.17" font-family="Arial" font-size="11" fill="#231f20">&lt;address&gt; can be an absolute address or a symbolic address</text>
<text x="6.19" y="450.17" font-family="Arial" font-size="11" fill="#231f20"># denotes a denary number, e.g. #123</text>
</svg>$svg$,
      latex_source=$latex$\footnotesize
\renewcommand{\arraystretch}{1.18}
\setlength{\tabcolsep}{2.5mm}
\begin{tabular}{|p{1.55cm}|p{2.15cm}|p{13.95cm}|}
\hline
\multicolumn{2}{|c|}{\textbf{Instruction}} & \multicolumn{1}{c|}{\textbf{Explanation}}\\ \cline{1-2}
\textbf{Opcode} & \textbf{Operand} & \\
\hline
\texttt{LDM} & \texttt{\#n} & Immediate addressing. Load the number n to ACC\\ \hline
\texttt{LDD} & \texttt{<address>} & Direct addressing. Load the contents of the location at the given address to ACC\\ \hline
\texttt{LDI} & \texttt{<address>} & Indirect addressing: The address to be used is at the given address. Load the contents of this second address to ACC\\ \hline
\texttt{LDX} & \texttt{<address>} & Indexed addressing. Form the address from <address> + the contents of the Index Register. Copy the contents of this calculated address to ACC\\ \hline
\texttt{LDR} & \texttt{\#n} & Immediate addressing. Load the number n to IX\\ \hline
\texttt{MOV} & \texttt{<register>} & Move the contents of the accumulator to the given register (IX)\\ \hline
\texttt{STO} & \texttt{<address>} & Store contents of ACC at the given address\\ \hline
\texttt{ADD} & \texttt{<address>} & Add the contents of the given address to the ACC\\ \hline
\texttt{INC} & \texttt{<register>} & Add 1 to the contents of the register (ACC or IX)\\ \hline
\texttt{CMP} & \texttt{<address>} & Compare the contents of ACC with the contents of <address>\\ \hline
\texttt{JPE} & \texttt{<address>} & Following a compare instruction, jump to <address> if the compare was True\\ \hline
\texttt{JPN} & \texttt{<address>} & Following a compare instruction, jump to <address> if the compare was False\\ \hline
\texttt{JMP} & \texttt{<address>} & Jump to the given address\\ \hline
\texttt{OUT} & & Output to the screen the character whose ASCII value is stored in ACC\\ \hline
\texttt{END} & & Return control to the operating system\\ \hline
\texttt{LSL \#n} & & Bits in ACC are shifted logically n places to the left. Zeros are introduced on the right hand end\\ \hline
\texttt{LSR \#n} & & Bits in ACC are shifted logically n places to the right. Zeros are introduced on the left hand end\\ \hline
\multicolumn{3}{|l|}{\parbox{18.1cm}{<address> can be an absolute address or a symbolic address\\ \# denotes a denary number, e.g. \#123}}\\
\hline
\end{tabular}$latex$,
      content_hash=v_new_hash
  WHERE id=v_asset_id;

  IF NOT EXISTS (
    SELECT 1
    FROM question_assets
    WHERE id=v_asset_id
      AND question_id=v_target
      AND source_page=7
      AND source_bbox='[89,286,1565,1549]'::jsonb
      AND content_hash=v_new_hash
      AND svg_markup LIKE '<svg%'
  ) THEN
    RAISE EXCEPTION 'VF-E-000001 postcondition failed';
  END IF;
END
$migration$;
