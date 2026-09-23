-- Source-faithful Q4 shared context repair for 9618/12/M/J/21.
-- Literal page-6 review found that the legacy code-based representation boxed
-- the Address column, invented a "Main memory" title, shortened the official
-- ASCII title, and used unsafe angle-bracket LaTeX glyphs.

DO $$
DECLARE
 v_paper uuid := '77905939-ac1e-441e-b68a-386f22dfcd3d'::uuid;
 v_sha text := '63c51bb1e39c8795d3dae421cf4e2a79c82a823fcfbdd817c2041b6c6c052eb1';
 v_question uuid := '3ce88e0a-fad3-49b1-93b8-b0d89963d262'::uuid;
 v_asset uuid := '0159b3cf-5c56-4b91-abff-fd5bef63ba07'::uuid;
 v_svg text := $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 1280" width="920" height="1280" role="img" aria-label="Processor instruction set, main memory and ASCII code table">
<rect width="920" height="1160" fill="white"/>
<style>.h{font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;fill:#222}.t{font-family:Arial,Helvetica,sans-serif;font-size:18px;fill:#222}.m{font-family:"Courier New",Courier,monospace;font-size:17px;fill:#444}.g{stroke:#555;stroke-width:1.2;fill:none}.d{stroke:#777;stroke-width:1.2;stroke-dasharray:2 3;fill:none}</style>
<rect class="g" x="0.6" y="0.6" width="918.8" height="560"/>
<line class="g" x1="100" y1="0" x2="100" y2="526"/>
<line class="g" x1="235" y1="0" x2="235" y2="526"/>
<line class="g" x1="0" y1="33" x2="235" y2="33"/>
<line class="g" x1="0" y1="66" x2="920" y2="66"/>
<text class="h" x="117.5" y="24" text-anchor="middle">Instruction</text>
<text class="h" x="577.5" y="42" text-anchor="middle">Explanation</text>
<text class="h" x="50" y="57" text-anchor="middle">Opcode</text>
<text class="h" x="167.5" y="57" text-anchor="middle">Operand</text>
<line class="g" x1="0" y1="100" x2="920" y2="100"/>
<text class="m" x="86" y="89" text-anchor="end">LDM</text>
<text class="m" x="112" y="89">#n</text>
<text class="t" x="247" y="89">Immediate addressing. Load the number n to ACC</text>
<line class="g" x1="0" y1="154" x2="920" y2="154"/>
<text class="m" x="86" y="133" text-anchor="end">LDD</text>
<text class="m" x="112" y="133">&lt;address&gt;</text>
<text class="t" x="247" y="121">Direct addressing. Load the contents of the location at the given address to</text>
<text class="t" x="247" y="143">ACC</text>
<line class="g" x1="0" y1="188" x2="920" y2="188"/>
<text class="m" x="86" y="177" text-anchor="end">STO</text>
<text class="m" x="112" y="177">&lt;address&gt;</text>
<text class="t" x="247" y="177">Store contents of ACC at the given address</text>
<line class="g" x1="0" y1="222" x2="920" y2="222"/>
<text class="m" x="86" y="211" text-anchor="end">ADD</text>
<text class="m" x="112" y="211">&lt;address&gt;</text>
<text class="t" x="247" y="211">Add the contents of the given address to the ACC</text>
<line class="g" x1="0" y1="256" x2="920" y2="256"/>
<text class="m" x="86" y="245" text-anchor="end">INC</text>
<text class="m" x="112" y="245">&lt;register&gt;</text>
<text class="t" x="247" y="245">Add 1 to the contents of the register (ACC or IX)</text>
<line class="g" x1="0" y1="290" x2="920" y2="290"/>
<text class="m" x="86" y="279" text-anchor="end">DEC</text>
<text class="m" x="112" y="279">&lt;register&gt;</text>
<text class="t" x="247" y="279">Subtract 1 from the contents of the register (ACC or IX)</text>
<line class="g" x1="0" y1="324" x2="920" y2="324"/>
<text class="m" x="86" y="313" text-anchor="end">CMP</text>
<text class="m" x="112" y="313">&lt;address&gt;</text>
<text class="t" x="247" y="313">Compare the contents of ACC with the contents of &lt;address&gt;</text>
<line class="g" x1="0" y1="358" x2="920" y2="358"/>
<text class="m" x="86" y="347" text-anchor="end">JPE</text>
<text class="m" x="112" y="347">&lt;address&gt;</text>
<text class="t" x="247" y="347">Following a compare instruction, jump to &lt;address&gt; if the compare was True</text>
<line class="g" x1="0" y1="392" x2="920" y2="392"/>
<text class="m" x="86" y="381" text-anchor="end">JPN</text>
<text class="m" x="112" y="381">&lt;address&gt;</text>
<text class="t" x="247" y="381">Following a compare instruction, jump to &lt;address&gt; if the compare was False</text>
<line class="g" x1="0" y1="426" x2="920" y2="426"/>
<text class="m" x="86" y="415" text-anchor="end">JMP</text>
<text class="m" x="112" y="415">&lt;address&gt;</text>
<text class="t" x="247" y="415">Jump to the given address</text>
<line class="g" x1="0" y1="460" x2="920" y2="460"/>
<text class="m" x="86" y="449" text-anchor="end">IN</text>
<text class="t" x="247" y="449">Key in a character and store its ASCII value in ACC</text>
<line class="g" x1="0" y1="494" x2="920" y2="494"/>
<text class="m" x="86" y="483" text-anchor="end">OUT</text>
<text class="t" x="247" y="483">Output to the screen the character whose ASCII value is stored in ACC</text>
<line class="g" x1="0" y1="528" x2="920" y2="528"/>
<text class="m" x="86" y="517" text-anchor="end">END</text>
<text class="t" x="247" y="517">Return control to the operating system</text>
<text class="t" x="10" y="548"># denotes a denary number, e.g. #123</text>
<text class="t" x="70" y="605">The current contents of the main memory and selected values from the ASCII character set are:</text>
<text class="h" x="43" y="655">Address</text>
<text class="h" x="178" y="655" text-anchor="middle">Instruction</text>
<rect class="g" x="128" y="666" width="135" height="420"/>
<line class="g" x1="128" y1="696" x2="263" y2="696"/>
<line class="g" x1="128" y1="726" x2="263" y2="726"/>
<line class="g" x1="128" y1="756" x2="263" y2="756"/>
<line class="g" x1="128" y1="786" x2="263" y2="786"/>
<line class="g" x1="128" y1="816" x2="263" y2="816"/>
<line class="g" x1="128" y1="846" x2="263" y2="846"/>
<line class="g" x1="128" y1="876" x2="263" y2="876"/>
<line class="g" x1="128" y1="906" x2="263" y2="906"/>
<line class="g" x1="128" y1="936" x2="263" y2="936"/>
<line class="g" x1="128" y1="966" x2="263" y2="966"/>
<line class="g" x1="128" y1="996" x2="263" y2="996"/>
<line class="g" x1="128" y1="1026" x2="263" y2="1026"/>
<line class="g" x1="128" y1="1056" x2="263" y2="1056"/>
<text class="m" x="116" y="687" text-anchor="end">70</text>
<text class="m" x="139" y="687">IN</text>
<text class="m" x="116" y="717" text-anchor="end">71</text>
<text class="m" x="139" y="717">CMP 100</text>
<text class="m" x="116" y="747" text-anchor="end">72</text>
<text class="m" x="139" y="747">JPE 80</text>
<text class="m" x="116" y="777" text-anchor="end">73</text>
<text class="m" x="139" y="777">CMP 101</text>
<text class="m" x="116" y="807" text-anchor="end">74</text>
<text class="m" x="139" y="807">JPE 76</text>
<text class="m" x="116" y="837" text-anchor="end">75</text>
<text class="m" x="139" y="837">JMP 80</text>
<text class="m" x="116" y="867" text-anchor="end">76</text>
<text class="m" x="139" y="867">LDD 102</text>
<text class="m" x="116" y="897" text-anchor="end">77</text>
<text class="m" x="139" y="897">INC ACC</text>
<text class="m" x="116" y="927" text-anchor="end">78</text>
<text class="m" x="139" y="927">STO 102</text>
<text class="m" x="116" y="957" text-anchor="end">79</text>
<text class="m" x="139" y="957">JMP 70</text>
<text class="m" x="116" y="987" text-anchor="end">80</text>
<text class="m" x="139" y="987">LDD 102</text>
<text class="m" x="116" y="1017" text-anchor="end">81</text>
<text class="m" x="139" y="1017">DEC ACC</text>
<text class="m" x="116" y="1047" text-anchor="end">82</text>
<text class="m" x="139" y="1047">STO 102</text>
<text class="m" x="116" y="1077" text-anchor="end">83</text>
<text class="m" x="139" y="1077">JMP 70</text>
<line class="d" x1="128" y1="1086" x2="128" y2="1125"/><line class="d" x1="263" y1="1086" x2="263" y2="1125"/>
<text class="m" x="116" y="1110" text-anchor="end">...</text>
<path class="g" d="M195 1090 C211 1098 203 1109 195 1114 C187 1119 188 1130 188 1135"/>
<rect class="g" x="128" y="1125" width="135" height="0"/>
<text class="h" x="640" y="655" text-anchor="middle">ASCII code table (selected codes only)</text>
<rect class="g" x="500" y="666" width="360" height="150"/>
<line class="g" x1="680" y1="666" x2="680" y2="816"/>
<line class="g" x1="500" y1="696" x2="860" y2="696"/>
<line class="g" x1="500" y1="726" x2="860" y2="726"/>
<line class="g" x1="500" y1="756" x2="860" y2="756"/>
<line class="g" x1="500" y1="786" x2="860" y2="786"/>
<text class="h" x="590" y="687" text-anchor="middle">ASCII code</text><text class="h" x="770" y="687" text-anchor="middle">Character</text>
<text class="m" x="590" y="717" text-anchor="middle">65</text><text class="m" x="770" y="717" text-anchor="middle">A</text>
<text class="m" x="590" y="747" text-anchor="middle">66</text><text class="m" x="770" y="747" text-anchor="middle">B</text>
<text class="m" x="590" y="777" text-anchor="middle">67</text><text class="m" x="770" y="777" text-anchor="middle">C</text>
<text class="m" x="590" y="807" text-anchor="middle">68</text><text class="m" x="770" y="807" text-anchor="middle">D</text>
<rect class="g" x="128" y="1125" width="135" height="0"/>
<rect class="g" x="128" y="1125" width="135" height="90"/>
<line class="g" x1="128" y1="1155" x2="263" y2="1155"/>
<line class="g" x1="128" y1="1185" x2="263" y2="1185"/>
<text class="m" x="116" y="1146" text-anchor="end">100</text><text class="m" x="139" y="1146">68</text>
<text class="m" x="116" y="1176" text-anchor="end">101</text><text class="m" x="139" y="1176">65</text>
<text class="m" x="116" y="1206" text-anchor="end">102</text><text class="m" x="139" y="1206">100</text>
</svg>$svg$;
 v_tex text := $tex$\footnotesize
\renewcommand{\arraystretch}{1.15}
\begin{tabular}{|p{1.5cm}|p{2.0cm}|p{11.1cm}|}
\hline
\multicolumn{2}{|c|}{\textbf{Instruction}} & \multicolumn{1}{c|}{\textbf{Explanation}}\\ \cline{1-2}
\textbf{Opcode} & \textbf{Operand} &\\
\hline
\texttt{LDM} & \texttt{\#n} & Immediate addressing. Load the number n to ACC\\ \hline
\texttt{LDD} & \texttt{\textless address\textgreater} & Direct addressing. Load the contents of the location at the given address to ACC\\ \hline
\texttt{STO} & \texttt{\textless address\textgreater} & Store contents of ACC at the given address\\ \hline
\texttt{ADD} & \texttt{\textless address\textgreater} & Add the contents of the given address to the ACC\\ \hline
\texttt{INC} & \texttt{\textless register\textgreater} & Add 1 to the contents of the register (ACC or IX)\\ \hline
\texttt{DEC} & \texttt{\textless register\textgreater} & Subtract 1 from the contents of the register (ACC or IX)\\ \hline
\texttt{CMP} & \texttt{\textless address\textgreater} & Compare the contents of ACC with the contents of \texttt{\textless address\textgreater}\\ \hline
\texttt{JPE} & \texttt{\textless address\textgreater} & Following a compare instruction, jump to \texttt{\textless address\textgreater} if the compare was True\\ \hline
\texttt{JPN} & \texttt{\textless address\textgreater} & Following a compare instruction, jump to \texttt{\textless address\textgreater} if the compare was False\\ \hline
\texttt{JMP} & \texttt{\textless address\textgreater} & Jump to the given address\\ \hline
\texttt{IN} & & Key in a character and store its ASCII value in ACC\\ \hline
\texttt{OUT} & & Output to the screen the character whose ASCII value is stored in ACC\\ \hline
\texttt{END} & & Return control to the operating system\\ \hline
\multicolumn{3}{|l|}{\# denotes a denary number, e.g. \#123}\\
\hline
\end{tabular}

\vspace{4mm}
The current contents of the main memory and selected values from the ASCII character set are:

\vspace{2mm}
\begin{minipage}[t]{0.42\linewidth}
\begin{tikzpicture}[font=\footnotesize]
\node[font=\bfseries] at (-0.75,0.35) {Address};
\node[font=\bfseries] at (1.25,0.35) {Instruction};
\draw (0,0) rectangle (2.7,-7.0);
\foreach \y in {-0.5,-1.0,-1.5,-2.0,-2.5,-3.0,-3.5,-4.0,-4.5,-5.0,-5.5,-6.0,-6.5} \draw (0,\y)--(2.7,\y);
\foreach \addr/\inst [count=\i from 0] in {70/IN,71/CMP 100,72/JPE 80,73/CMP 101,74/JPE 76,75/JMP 80,76/LDD 102,77/INC ACC,78/STO 102,79/JMP 70,80/LDD 102,81/DEC ACC,82/STO 102,83/JMP 70}{
\node[anchor=east,font=\ttfamily] at (-0.15,-0.25-0.5*\i) {\addr};
\node[anchor=west,font=\ttfamily] at (0.15,-0.25-0.5*\i) {\inst};
}
\draw[densely dotted] (0,-7.0)--(0,-7.8);
\draw[densely dotted] (2.7,-7.0)--(2.7,-7.8);
\node[anchor=east,font=\ttfamily] at (-0.15,-7.4) {...};
\draw (1.35,-7.15) .. controls (1.55,-7.25) and (1.45,-7.45) .. (1.30,-7.5) .. controls (1.15,-7.55) and (1.18,-7.72) .. (1.18,-7.76);
\draw (0,-7.8) rectangle (2.7,-9.3);
\draw (0,-8.3)--(2.7,-8.3);\draw (0,-8.8)--(2.7,-8.8);
\foreach \addr/\val [count=\i from 0] in {100/68,101/65,102/100}{
\node[anchor=east,font=\ttfamily] at (-0.15,-8.05-0.5*\i) {\addr};
\node[anchor=west,font=\ttfamily] at (0.15,-8.05-0.5*\i) {\val};
}
\end{tikzpicture}
\end{minipage}\hfill
\begin{minipage}[t]{0.50\linewidth}
\centering\textbf{ASCII code table (selected codes only)}\\[1mm]
\begin{tabular}{|c|c|}\hline
\textbf{ASCII code}&\textbf{Character}\\\hline
65&A\\\hline 66&B\\\hline 67&C\\\hline 68&D\\\hline
\end{tabular}
\end{minipage}$tex$;
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM questions q JOIN source_papers sp ON sp.id=q.source_paper_id
   JOIN question_assets qa ON qa.question_id=q.id
   WHERE q.id=v_question AND q.path='4' AND sp.id=v_paper AND sp.sha256=v_sha
     AND qa.id=v_asset AND qa.source_page=6
     AND qa.content_hash='437af00903547c2555397c63bd9ef198'
 ) THEN RAISE EXCEPTION 'vf_mj21_12_q4_context_provenance_mismatch'; END IF;

 UPDATE question_assets
 SET svg_markup=v_svg,latex_source=v_tex,size_bytes=octet_length(v_svg),
     content_hash=encode(digest(v_svg,'sha256'),'hex'),crop_status='not_needed',crop_error=null
 WHERE id=v_asset;

 IF NOT EXISTS (
   SELECT 1 FROM question_assets qa
   WHERE qa.id=v_asset
     AND qa.svg_markup LIKE '%ASCII code table (selected codes only)%'
     AND qa.svg_markup LIKE '%Address%'
     AND qa.latex_source LIKE '%\\textless address\\textgreater%'
     AND qa.latex_source NOT LIKE '%Main memory%'
     AND qa.size_bytes=octet_length(qa.svg_markup)
     AND qa.content_hash=encode(digest(qa.svg_markup,'sha256'),'hex')
 ) THEN RAISE EXCEPTION 'vf_mj21_12_q4_context_postcondition_failed'; END IF;
END $$;