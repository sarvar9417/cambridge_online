-- Verified source visual recovery for four approved Cambridge 9618 assets.
--
-- This migration preserves question IDs and asset IDs. Each repair is guarded
-- by the exact question ID and the recorded SHA-256 of the source QP.
--
-- The SVGs below are source-faithful redraws verified against the exact source
-- pages downloaded from the recorded Google Drive source URLs. The source PDF
-- bytes matched source_papers.sha256 before this migration was authored.

DO $repair$
DECLARE
  v_svg text;
  v_count integer;
BEGIN
  -- 9618/22/O/N/22 Q2(b), source page 4.
  IF NOT EXISTS (
    SELECT 1
    FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    WHERE q.id='3569fc0d-6acb-40ca-a27c-08edf8a84316'
      AND sp.sha256='93bdce2d34e77a3e0f1e66426103320e15cc632c7ab4cee5707105132b4efd7e'
  ) THEN
    RAISE EXCEPTION 'source SHA mismatch for 9618/22/O/N/22 Q2(b)';
  END IF;

  v_svg := $state$
<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="850" viewBox="0 0 1000 850">
<defs>
  <marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z"/></marker>
  <pattern id="h" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="8" stroke="#222" stroke-width="2"/></pattern>
  <style>.t{font-family:Arial,sans-serif;font-size:24px;fill:#111}.b{font-weight:700}.s{fill:#fff;stroke:#111;stroke-width:3}.e{fill:none;stroke:#111;stroke-width:3;marker-end:url(#a)}</style>
</defs>
<circle cx="50" cy="180" r="6" fill="#111"/><text class="t" x="12" y="150">START</text><path class="e" d="M58 180H142"/>
<circle class="s" cx="195" cy="180" r="54"/><text class="t" x="178" y="188">S1</text>
<circle class="s" cx="505" cy="180" r="54"/><text class="t" x="488" y="188">S2</text>
<circle class="s" cx="765" cy="180" r="54"/><text class="t" x="748" y="188">S3</text>
<circle class="s" cx="285" cy="410" r="54"/><text class="t" x="268" y="418">S4</text>
<path class="e" d="M200 126C275 40 430 45 470 140"/><text class="t" x="250" y="55">Input-A | Output-X</text>
<path class="e" d="M548 145C605 82 690 90 724 142"/><text class="t" x="575" y="78">Input-B | Output-W</text>
<path class="e" d="M812 158C870 118 884 194 816 198"/><text class="t" x="840" y="145">Input-B</text>
<path class="e" d="M548 195C620 220 572 300 520 232"/><text class="t" x="565" y="278">Input-A</text>
<path class="e" d="M735 225C780 360 580 510 337 426"/><text class="t" x="670" y="405">Input-A | Output-W</text>
<path class="e" d="M275 357C390 305 395 205 250 185"/><text class="t" x="385" y="330">Input-A</text>
<path class="e" d="M153 215C65 310 125 455 231 422"/><text class="t" x="25" y="365">Input-B</text>
<text class="t b" x="80" y="535">Complete the table to show the inputs, outputs and next states.</text>
<rect x="160" y="565" width="660" height="240" fill="#fff" stroke="#111" stroke-width="2"/>
<line x1="380" y1="565" x2="380" y2="805" stroke="#111" stroke-width="2"/><line x1="600" y1="565" x2="600" y2="805" stroke="#111" stroke-width="2"/>
<line x1="160" y1="605" x2="820" y2="605" stroke="#111" stroke-width="2"/><line x1="160" y1="645" x2="820" y2="645" stroke="#111" stroke-width="2"/>
<line x1="160" y1="685" x2="820" y2="685" stroke="#111" stroke-width="2"/><line x1="160" y1="725" x2="820" y2="725" stroke="#111" stroke-width="2"/><line x1="160" y1="765" x2="820" y2="765" stroke="#111" stroke-width="2"/>
<rect x="160" y="605" width="220" height="40" fill="url(#h)"/><rect x="380" y="605" width="220" height="40" fill="url(#h)"/>
<text class="t b" x="240" y="594">Input</text><text class="t b" x="455" y="594">Output</text><text class="t b" x="660" y="594">Next state</text>
<text class="t" x="675" y="635">S1</text><text class="t" x="235" y="675">Input-A</text><text class="t" x="675" y="715">S2</text>
<text class="t" x="455" y="755">Output-W</text><text class="t" x="455" y="795">Output-W</text>
</svg>
$state$;

  UPDATE question_assets qa
  SET svg_markup=v_svg,
      crop_status='not_needed',
      crop_error=NULL,
      content_hash=encode(digest(v_svg,'sha256'),'hex'),
      size_bytes=octet_length(v_svg)
  WHERE qa.id='e798f5c0-f449-4dc6-8b94-f1e87ef562be'
    AND qa.question_id='3569fc0d-6acb-40ca-a27c-08edf8a84316';
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>1 THEN RAISE EXCEPTION 'asset update failed for 9618/22/O/N/22 Q2(b)'; END IF;

  -- 9618/31/O/N/22 Q4, source page 5.
  IF NOT EXISTS (
    SELECT 1
    FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    WHERE q.id='6674f538-15b0-4502-9708-1b5e8b80f6a5'
      AND sp.sha256='7175b7ae719b5735be4040f48c73d7f31310d392d0a2cd80fc3fc27b9292c9ed'
  ) THEN
    RAISE EXCEPTION 'source SHA mismatch for 9618/31/O/N/22 Q4';
  END IF;

  v_svg := $compiler$
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="760" viewBox="0 0 900 760">
<style>.t{font-family:Arial,sans-serif;font-size:22px;fill:#111}.b{font-weight:700}.box{fill:#fff;stroke:#111;stroke-width:3}</style>
<text class="t b" x="20" y="35">Stage of compilation</text><text class="t b" x="610" y="35">Description</text>
<rect class="box" x="15" y="100" width="200" height="105"/><text class="t" x="48" y="160">Lexical analysis</text>
<rect class="box" x="15" y="250" width="200" height="105"/><text class="t" x="47" y="310">Syntax analysis</text>
<rect class="box" x="15" y="400" width="200" height="105"/><text class="t" x="42" y="460">Code generation</text>
<rect class="box" x="15" y="550" width="200" height="105"/><text class="t" x="55" y="610">Optimisation</text>
<rect class="box" x="430" y="40" width="450" height="105"/><text class="t" text-anchor="middle" x="655" y="87"><tspan x="655">minimising a program’s execution time and</tspan><tspan x="655" dy="30">memory requirement</tspan></text>
<rect class="box" x="430" y="180" width="450" height="105"/><text class="t" text-anchor="middle" x="655" y="225"><tspan x="655">converting an intermediate representation of</tspan><tspan x="655" dy="30">source code into an executable form</tspan></text>
<rect class="box" x="430" y="320" width="450" height="105"/><text class="t" text-anchor="middle" x="655" y="365"><tspan x="655">converting a sequence of characters into a</tspan><tspan x="655" dy="30">sequence of tokens</tspan></text>
<rect class="box" x="430" y="460" width="450" height="105"/><text class="t" text-anchor="middle" x="655" y="505"><tspan x="655">directly executing instructions written in a</tspan><tspan x="655" dy="30">scripting language</tspan></text>
<rect class="box" x="430" y="600" width="450" height="105"/><text class="t" text-anchor="middle" x="655" y="645"><tspan x="655">using parsing algorithms to interpret the</tspan><tspan x="655" dy="30">meaning of a sequence of tokens</tspan></text>
</svg>
$compiler$;

  UPDATE question_assets qa
  SET svg_markup=v_svg,
      crop_status='not_needed',
      crop_error=NULL,
      content_hash=encode(digest(v_svg,'sha256'),'hex'),
      size_bytes=octet_length(v_svg)
  WHERE qa.id='37725cd5-035f-43ae-b01d-013cc38bdadc'
    AND qa.question_id='6674f538-15b0-4502-9708-1b5e8b80f6a5';
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>1 THEN RAISE EXCEPTION 'asset update failed for 9618/31/O/N/22 Q4'; END IF;

  -- Shared source-faithful K-map for 9618/31/O/N/22 Q7(a) and Q7(b), page 7.
  v_svg := $kmap$
<svg xmlns="http://www.w3.org/2000/svg" width="620" height="560" viewBox="0 0 620 560">
<style>.t{font-family:Arial,sans-serif;font-size:28px;fill:#111}.b{font-weight:700}.g{stroke:#111;stroke-width:2;fill:none}</style>
<text class="t b" x="105" y="45">AB</text><text class="t b" x="22" y="105">CD</text><line class="g" x1="55" y1="20" x2="145" y2="110"/>
<text class="t b" x="190" y="92">00</text><text class="t b" x="300" y="92">01</text><text class="t b" x="410" y="92">11</text><text class="t b" x="520" y="92">10</text>
<text class="t b" x="55" y="155">00</text><text class="t b" x="55" y="255">01</text><text class="t b" x="55" y="355">11</text><text class="t b" x="55" y="455">10</text>
<rect class="g" x="145" y="110" width="440" height="400"/>
<line class="g" x1="255" y1="110" x2="255" y2="510"/><line class="g" x1="365" y1="110" x2="365" y2="510"/><line class="g" x1="475" y1="110" x2="475" y2="510"/>
<line class="g" x1="145" y1="210" x2="585" y2="210"/><line class="g" x1="145" y1="310" x2="585" y2="310"/><line class="g" x1="145" y1="410" x2="585" y2="410"/>
</svg>
$kmap$;

  IF NOT EXISTS (
    SELECT 1
    FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id
    WHERE q.id IN ('e064de7c-645d-4069-bceb-7973c975b193','320a2484-cdf8-4a66-8243-01486aaf9545')
    GROUP BY sp.sha256
    HAVING sp.sha256='7175b7ae719b5735be4040f48c73d7f31310d392d0a2cd80fc3fc27b9292c9ed'
       AND count(*)=2
  ) THEN
    RAISE EXCEPTION 'source SHA mismatch for 9618/31/O/N/22 Q7';
  END IF;

  UPDATE question_assets qa
  SET svg_markup=v_svg,
      crop_status='not_needed',
      crop_error=NULL,
      content_hash=encode(digest(v_svg,'sha256'),'hex'),
      size_bytes=octet_length(v_svg)
  WHERE qa.id IN ('296cb706-6ea4-4bda-8559-8aa23a6aabf4','427d42ea-4da5-4eb9-bdca-fb4200481d70')
    AND qa.question_id IN ('e064de7c-645d-4069-bceb-7973c975b193','320a2484-cdf8-4a66-8243-01486aaf9545');
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>2 THEN RAISE EXCEPTION 'asset update failed for 9618/31/O/N/22 Q7'; END IF;
END
$repair$;
