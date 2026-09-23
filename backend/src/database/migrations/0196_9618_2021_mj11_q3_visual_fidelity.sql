-- Source-faithful code-based repair for VF-E-000001, 9618/11/M/J/21 Q3.
-- Literal source comparison found two concrete defects in the prior generated
-- representation: angle-bracket operands were rendered with wrong OT1 glyphs,
-- and the two source footnotes were outside the bordered final table row.
-- This migration preserves the asset ID and replaces only its code-based
-- render representations. Production apply remains a separate reviewed step.

DO $$
DECLARE
  v_asset_id uuid := 'f9483ad1-7672-4b18-bd0c-cb6b21507950'::uuid;
  v_paper_id uuid := 'fab329b3-9fbc-43ac-938b-5d83c815a1e5'::uuid;
  v_expected_sha text := 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453';
  v_svg text := $vf_svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1180 1012" width="1180" height="1012" role="img" aria-label="Cambridge instruction set table">
<rect width="1180" height="1012" fill="white"/>
<rect x="0.7" y="0.7" width="1178.0" height="1009.6" fill="none" stroke="black" stroke-width="1.4"/>
<line x1="304" y1="0" x2="304" y2="941" stroke="black" stroke-width="1.4"/>
<line x1="127" y1="47" x2="127" y2="941" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="47" x2="304" y2="47" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="91" x2="1179" y2="91" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="135" x2="1179" y2="135" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="179" x2="1179" y2="179" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="249" x2="1179" y2="249" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="318" x2="1179" y2="318" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="362" x2="1179" y2="362" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="406" x2="1179" y2="406" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="450" x2="1179" y2="450" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="494" x2="1179" y2="494" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="538" x2="1179" y2="538" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="582" x2="1179" y2="582" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="627" x2="1179" y2="627" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="671" x2="1179" y2="671" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="715" x2="1179" y2="715" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="759" x2="1179" y2="759" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="803" x2="1179" y2="803" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="872" x2="1179" y2="872" stroke="black" stroke-width="1.4"/>
<line x1="0" y1="941" x2="1179" y2="941" stroke="black" stroke-width="1.4"/>
<style>
.h{font-family:Arial,Helvetica,sans-serif;font-size:23px;font-weight:700;fill:#111}
.s{font-family:Arial,Helvetica,sans-serif;font-size:21px;fill:#111}
.m{font-family:"Courier New",Courier,monospace;font-size:20px;fill:#222}
.f{font-family:Arial,Helvetica,sans-serif;font-size:20px;fill:#111}
</style>
<text class="h" x="152" y="27" text-anchor="middle">Instruction</text>
<text class="h" x="741.5" y="48" text-anchor="middle">Explanation</text>
<text class="h" x="63.5" y="75" text-anchor="middle">Opcode</text>
<text class="h" x="215.5" y="75" text-anchor="middle">Operand</text>
<text class="m" x="115" y="120.0" text-anchor="end">LDM</text>
<text class="m" x="141" y="120.0">#n</text>
<text class="s" x="316" y="120.0">Immediate addressing. Load the number n to ACC</text>
<text class="m" x="115" y="164.0" text-anchor="end">LDD</text>
<text class="m" x="141" y="164.0">&lt;address&gt;</text>
<text class="s" x="316" y="164.0">Direct addressing. Load the contents of the location at the given address to ACC</text>
<text class="m" x="115" y="218.5" text-anchor="end">LDI</text>
<text class="m" x="141" y="218.5">&lt;address&gt;</text>
<text class="s" x="316" y="206.0">Indirect addressing: The address to be used is at the given address. Load the</text>
<text class="s" x="316" y="231.0">contents of this second address to ACC</text>
<text class="m" x="115" y="288.5" text-anchor="end">LDX</text>
<text class="m" x="141" y="288.5">&lt;address&gt;</text>
<text class="s" x="316" y="276.0">Indexed addressing. Form the address from &lt;address&gt; + the contents of the</text>
<text class="s" x="316" y="301.0">Index Register. Copy the contents of this calculated address to ACC</text>
<text class="m" x="115" y="347.0" text-anchor="end">LDR</text>
<text class="m" x="141" y="347.0">#n</text>
<text class="s" x="316" y="347.0">Immediate addressing. Load the number n to IX</text>
<text class="m" x="115" y="391.0" text-anchor="end">MOV</text>
<text class="m" x="141" y="391.0">&lt;register&gt;</text>
<text class="s" x="316" y="391.0">Move the contents of the accumulator to the given register (IX)</text>
<text class="m" x="115" y="435.0" text-anchor="end">STO</text>
<text class="m" x="141" y="435.0">&lt;address&gt;</text>
<text class="s" x="316" y="435.0">Store contents of ACC at the given address</text>
<text class="m" x="115" y="479.0" text-anchor="end">ADD</text>
<text class="m" x="141" y="479.0">&lt;address&gt;</text>
<text class="s" x="316" y="479.0">Add the contents of the given address to the ACC</text>
<text class="m" x="115" y="523.0" text-anchor="end">INC</text>
<text class="m" x="141" y="523.0">&lt;register&gt;</text>
<text class="s" x="316" y="523.0">Add 1 to the contents of the register (ACC or IX)</text>
<text class="m" x="115" y="567.0" text-anchor="end">CMP</text>
<text class="m" x="141" y="567.0">&lt;address&gt;</text>
<text class="s" x="316" y="567.0">Compare the contents of ACC with the contents of &lt;address&gt;</text>
<text class="m" x="115" y="611.5" text-anchor="end">JPE</text>
<text class="m" x="141" y="611.5">&lt;address&gt;</text>
<text class="s" x="316" y="611.5">Following a compare instruction, jump to &lt;address&gt; if the compare was True</text>
<text class="m" x="115" y="656.0" text-anchor="end">JPN</text>
<text class="m" x="141" y="656.0">&lt;address&gt;</text>
<text class="s" x="316" y="656.0">Following a compare instruction, jump to &lt;address&gt; if the compare was False</text>
<text class="m" x="115" y="700.0" text-anchor="end">JMP</text>
<text class="m" x="141" y="700.0">&lt;address&gt;</text>
<text class="s" x="316" y="700.0">Jump to the given address</text>
<text class="m" x="115" y="744.0" text-anchor="end">OUT</text>
<text class="s" x="316" y="744.0">Output to the screen the character whose ASCII value is stored in ACC</text>
<text class="m" x="115" y="788.0" text-anchor="end">END</text>
<text class="s" x="316" y="788.0">Return control to the operating system</text>
<text class="m" x="115" y="842.5" text-anchor="end">LSL</text>
<text class="m" x="141" y="842.5">#n</text>
<text class="s" x="316" y="830.0">Bits in ACC are shifted logically n places to the left. Zeros are introduced on</text>
<text class="s" x="316" y="855.0">the right hand end</text>
<text class="m" x="115" y="911.5" text-anchor="end">LSR</text>
<text class="m" x="141" y="911.5">#n</text>
<text class="s" x="316" y="899.0">Bits in ACC are shifted logically n places to the right. Zeros are introduced on</text>
<text class="s" x="316" y="924.0">the left hand end</text>
<text class="f" x="13" y="969">&lt;address&gt; can be an absolute address or a symbolic address</text>
<text class="f" x="13" y="996"># denotes a denary number, e.g. #123</text>
</svg>$vf_svg$;
  v_latex text := $vf_latex$\scriptsize
\renewcommand{\arraystretch}{1.15}
\begin{tabular}{|p{1.5cm}|p{1.8cm}|p{10.6cm}|}
\hline
\multicolumn{2}{|c|}{\textbf{Instruction}} & \textbf{Explanation}\\
\cline{1-2}
\textbf{Opcode} & \textbf{Operand} & \\
\hline
LDM & \texttt{\#n} & Immediate addressing. Load the number n to ACC\\
\hline
LDD & \texttt{\textless address\textgreater} & Direct addressing. Load the contents of the location at the given address to ACC\\
\hline
LDI & \texttt{\textless address\textgreater} & Indirect addressing: The address to be used is at the given address. Load the contents of this second address to ACC\\
\hline
LDX & \texttt{\textless address\textgreater} & Indexed addressing. Form the address from \texttt{\textless address\textgreater} + the contents of the Index Register. Copy the contents of this calculated address to ACC\\
\hline
LDR & \texttt{\#n} & Immediate addressing. Load the number n to IX\\
\hline
MOV & \texttt{\textless register\textgreater} & Move the contents of the accumulator to the given register (IX)\\
\hline
STO & \texttt{\textless address\textgreater} & Store contents of ACC at the given address\\
\hline
ADD & \texttt{\textless address\textgreater} & Add the contents of the given address to the ACC\\
\hline
INC & \texttt{\textless register\textgreater} & Add 1 to the contents of the register (ACC or IX)\\
\hline
CMP & \texttt{\textless address\textgreater} & Compare the contents of ACC with the contents of \texttt{\textless address\textgreater}\\
\hline
JPE & \texttt{\textless address\textgreater} & Following a compare instruction, jump to \texttt{\textless address\textgreater} if the compare was True\\
\hline
JPN & \texttt{\textless address\textgreater} & Following a compare instruction, jump to \texttt{\textless address\textgreater} if the compare was False\\
\hline
JMP & \texttt{\textless address\textgreater} & Jump to the given address\\
\hline
OUT & & Output to the screen the character whose ASCII value is stored in ACC\\
\hline
END & & Return control to the operating system\\
\hline
LSL & \texttt{\#n} & Bits in ACC are shifted logically n places to the left. Zeros are introduced on the right hand end\\
\hline
LSR & \texttt{\#n} & Bits in ACC are shifted logically n places to the right. Zeros are introduced on the left hand end\\
\hline
\multicolumn{3}{|p{13.9cm}|}{\texttt{\textless address\textgreater} can be an absolute address or a symbolic address\newline
\# denotes a denary number, e.g. \#123}\\
\hline
\end{tabular}$vf_latex$;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM question_assets qa
    JOIN questions q ON q.id=qa.question_id
    JOIN source_papers sp ON sp.id=q.source_paper_id
    WHERE qa.id=v_asset_id
      AND q.id='e8c0b040-a260-456b-bac4-b0a06205a032'::uuid
      AND q.path='3'
      AND sp.id=v_paper_id
      AND sp.sha256=v_expected_sha
      AND qa.kind='table'
      AND qa.source_page=7
      AND qa.content_hash='d65ce640e4e7ad1e8adc1fafb7cddbfa9f2f57e90b1428a195eab5c2718b6d3a'
  ) THEN
    RAISE EXCEPTION 'vf_e_000001_source_or_asset_provenance_mismatch';
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
      AND qa.svg_markup LIKE '%&lt;address&gt;%'
      AND qa.svg_markup LIKE '%# denotes a denary number, e.g. #123%'
      AND qa.latex_source LIKE '%\\textless address\\textgreater%'
      AND qa.size_bytes=octet_length(qa.svg_markup)
      AND qa.content_hash=encode(digest(qa.svg_markup,'sha256'),'hex')
  ) THEN
    RAISE EXCEPTION 'vf_e_000001_code_based_repair_postcondition_failed';
  END IF;
END $$;
