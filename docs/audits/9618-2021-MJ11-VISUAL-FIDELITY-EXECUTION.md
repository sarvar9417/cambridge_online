# 9618/11/M/J/21 — Visual Fidelity Execution Evidence

**Source paper:** 9618/11/M/J/21  
**Source paper id:** `fab329b3-9fbc-43ac-938b-5d83c815a1e5`  
**Source SHA256:** `d73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453`  
**Source pages:** 16  
**Execution branch:** `agent/9618-visual-fidelity-execution`  
**Production mutation:** NONE  
**Closure state:** SOURCE-SIDE REVIEW COMPLETE; PRODUCT-SURFACE PROOF PENDING

## Evidence rule

This file records literal source-page findings for all 16 canonical visual/structured asset rows in this paper.
A source-side repair being prepared does **not** promote an element to VF-0/VF-1.
Question Bank, PDF, DOCX and Live Challenge proof is still mandatory.

| # | Question | Asset | Page | Source-side finding | Repair / guard | Current audit state |
|---|---|---|---:|---|---|---|
| 1 | Q1(a)(i) | `ac6a3282-23d5-462b-8212-191ce792db64` | 2 | Existing generated table compressed both answer rows and omitted six dotted response lines. | migration `0197_9618_2021_mj11_q1_visual_fidelity.sql`; regression audit added | Repair prepared; VF-5 until 4-surface proof |
| 2 | Q2(a) | `1e91f11f-37f0-43d3-afbb-64f1c7efda3c` | 5 | Reviewed source crop exists; generated substitute has visible spacing/wrapping drift. Export path previously preferred generated content over ready crop. | export crop precedence fix + `9618-2021-mj11-q2a-source-crop.sql` | Repair prepared; VF-5 until 4-surface proof |
| 3 | Q3(b) instruction set | `f9483ad1-7672-4b18-bd0c-cb6b21507950` | 7 | Asset ownership/context was wrong for independent Q3(b); prior representation also had angle-glyph/footer-layout drift. | `0195_9618_mj21_q3_instruction_table_visual_fidelity.sql` + `0199_9618_mj21_q3_explicit_context_and_latex.sql` | Repair prepared; VF-5 until 4-surface proof |
| 4 | Q3(b) memory | `8649e01d-0211-4558-a541-bbed3279c6ae` | 8 | Generic table flattened source geometry; address labels should sit outside the instruction box with a source break before 365. | `0198_9618_2021_mj11_q3b_source_visuals.sql` | Repair prepared; VF-5 until 4-surface proof |
| 5 | Q3(b) ASCII | `1894154b-5802-47ca-a2d2-2ee9dc63f6f5` | 8 | Generic table omitted source title and exact proportions. | `0198_9618_2021_mj11_q3b_source_visuals.sql` | Repair prepared; VF-5 until 4-surface proof |
| 6 | Q3(b) trace table | `c43ee7fc-9486-4302-a9c9-b48f51f34a33` | 9 | Trace header requires merged `Memory address` geometry; generic rendering was not sufficient. | trace-header migration/audit + Q3(b) canonical visual consumption guard | Repair prepared; VF-5 until 4-surface proof |
| 7 | Q3(c)(i) filled register | `b8bf030d-017b-4577-a9eb-15547cc6638c` | 10 | Source uses eight equal-width tall cells; generic content-width table is not source-faithful. | `0199_9618_2021_mj11_q3c_visual_fidelity.sql` | Repair prepared; VF-5 until 4-surface proof |
| 8 | Q3(c)(i) blank register | `9ad478a9-6db1-4571-b99b-ec2aa0484cf0` | 10 | Same equal-width/tall-cell requirement; source instruction is separate monospaced `LSL #2`. | `0199_9618_2021_mj11_q3c_visual_fidelity.sql` | Repair prepared; VF-5 until 4-surface proof |
| 9 | Q3(c)(ii) filled register | `e6d89739-5797-42ce-9b13-abc43e526d8a` | 10 | Same register geometry; source instruction is separate monospaced `LSR #3`. | `0199_9618_2021_mj11_q3c_visual_fidelity.sql` | Repair prepared; VF-5 until 4-surface proof |
| 10 | Q4(c)(i) router table | `a6403741-7948-46e6-9c22-c96acb8711d5` | 11 | Source has fixed wide task column and two multiline narrow headers; generic table loses exact proportions. | `0200_9618_2021_mj11_q4_visual_fidelity.sql` | Repair prepared; VF-5 until 4-surface proof |
| 11 | Q4(c)(ii) wired/wireless | `29e7c51c-1a27-46f7-a122-b629f0985bd5` | 12 | Source is a headerless two-row grid; invented semantic header was incorrect. | `0198_9618_2021_mj11_q4cii_source_layout.sql` + `0200_9618_2021_mj11_q4_visual_fidelity.sql` | Repair prepared; VF-5 until 4-surface proof |
| 12 | Q6(a) pseudocode | `a788cc18-3d0d-4981-a54f-33a43e537045` | 14 | Canonical code block text and indentation match source; no representation rewrite required. | `9618-2021-mj11-q6-pseudocode-source.sql` | Source representation acceptable; VF-5 until 4-surface proof |
| 13 | Q6(b) pseudocode | `949abd24-4bfd-4784-a85e-d852e786a23e` | 14 | Canonical code block text and indentation match source; no representation rewrite required. | same Q6 regression guard | Source representation acceptable; VF-5 until 4-surface proof |
| 14 | Q6(c) pseudocode | `9ee6950f-c1f4-4b00-97f1-a1dfab02ed4b` | 14 | Canonical code block text and indentation match source; no representation rewrite required. | same Q6 regression guard | Source representation acceptable; VF-5 until 4-surface proof |
| 15 | Q7(b)(ii) relationship table | `17eb0daa-5410-45db-8843-633f7fb02272` | 15 | Source table proportions are fixed and compact; canonical visual asset is used directly after repair. | `0201_9618_2021_mj11_q7_q8_visual_fidelity.sql` | Repair prepared; VF-5 until 4-surface proof |
| 16 | Q8 logic-gate table | `168599f4-5cee-4993-a3b4-d7cecea66c43` | 16 | Legacy bbox pointed at the wrong region; source table also requires preserved wide statement column and five equal gate columns. | `0196_9618_mj21_q8_logic_table_visual_fidelity.sql` + `0201_9618_2021_mj11_q7_q8_visual_fidelity.sql` | Repair prepared; VF-5 until 4-surface proof |

## Source-side coverage result

- Canonical visual/structured asset rows: **16**
- Literal source pages reviewed: **2, 5, 7, 8, 9, 10, 11, 12, 14, 15, 16**
- Rows with a concrete source-side repair prepared: **13**
- Rows whose existing code representation was retained after source review: **3** (Q6 a/b/c)
- Rows promoted to VF-0/VF-1: **0**
- Production writes: **0**

## Required next gate

For every row above, capture and compare:

1. Question Bank
2. PDF export
3. DOCX export
4. Live Challenge

Any mismatch remains VF-3/VF-4. Any surface without literal evidence remains VF-5.

## Current-main reconciliation

The execution branch was merged forward to main SHA
`4c1b96b02e4888681e63b7339521b6d5a5045553` before continuing.
Overlapping source-asset logic was reconciled with main's stricter SVG parsing.

# EXECUTION HANDOFF FOR NEXT AI

Do not repeat the source inventory for 9618/11/M/J/21 unless provenance changes.
Run CI, stage/apply the prepared migrations only in an authorised non-production environment,
then collect literal Question Bank/PDF/DOCX/Live evidence for all 16 rows.
Do not call this paper visually closed while any required surface is unverified.
