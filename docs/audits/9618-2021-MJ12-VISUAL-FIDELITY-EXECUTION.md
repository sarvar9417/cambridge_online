# 9618/12/M/J/21 - Visual Fidelity Execution Evidence

**Source paper:** 9618/12/M/J/21  
**Source paper id:** `77905939-ac1e-441e-b68a-386f22dfcd3d`  
**Source SHA256:** `63c51bb1e39c8795d3dae421cf4e2a79c82a823fcfbdd817c2041b6c6c052eb1`  
**Source pages:** 16  
**Execution branch:** `agent/9618-visual-fidelity-execution`  
**Production mutation:** NONE  
**Closure state:** SOURCE-SIDE REVIEW COMPLETE; STORED-CROP AND PRODUCT-SURFACE PROOF PENDING

## Evidence rule

The original Cambridge PDF was rendered and the visual-bearing source pages 2, 3, 4, 5, 6, 7, 8 and 11 were inspected.
Metadata such as `crop_status=ready`, a storage path, or an SVG existing is not treated as visual PASS.
No row below is promoted to VF-0/VF-1 until Question Bank, PDF, DOCX and Live Challenge evidence exists.

| # | Question | Asset | Page | Source-side finding | Repair / guard | Current state |
|---|---|---|---:|---|---|---|
| 1 | Q1(a) | `216e9449-f087-4ca7-aaf4-1296a0dcbcfa` | 2 | Existing code table omitted nine dotted response lines and compressed the three answer rows. | `0202_9618_2021_mj12_q1_visual_fidelity.sql` | Repair prepared; VF-5 |
| 2 | Q1(b) | `49a0cd3f-ef9a-48d8-b8da-581683cf4574` | 2 | Source is a headerless 2x2 bordered grid. Previous TikZ drew isolated boxes before the labels instead of the table. | same 0202 migration | Repair prepared; VF-5 |
| 3 | Q1(c)(i) | `d0359a72-8bc2-4292-bfa7-b8acf2cbee39` | 3 | Source DDL completion layout inspected; DB has a ready source-repair crop with page/bbox/storage provenance. | crop provenance guard | Stored crop not independently opened; VF-5 |
| 4 | Q1(c)(ii) | `55a240b0-70e4-45ad-bfb7-047c55def1e0` | 3 | Literal source crop already exists inline in `content_md`, but generated `svg_markup` wins in the current repository coalesce order because no storage URL exists. | `0206_9618_2021_mj12_q1cii_inline_source_crop.sql` copies literal inline crop to authoritative svg_markup | Repair prepared; VF-5 |
| 5 | Q2(c) | `0a4f2cb9-811b-4048-8227-967d4bb38cd9` | 4 | Licence tick table source inspected; ready source-repair crop is registered. | crop provenance guard | Stored crop not independently opened; VF-5 |
| 6 | Q3(a) | `e4d7e967-08df-476a-8042-f1c14aea4896` | 5 | Source drawing box is tall (~1.72:1); old 13x5 representation was much too wide. A second generic drawing answer area also duplicated the source box. | `0203_9618_2021_mj12_q3a_visual_fidelity.sql` | Repair prepared; VF-5 |
| 7 | Q3(b) | `086cc71a-9c6a-44a4-86f5-c6286cd9d067` | 5 | Truth table source inspected; ready source-repair crop is registered. | crop provenance guard | Stored crop not independently opened; VF-5 |
| 8 | Q4 shared context | `0159b3cf-5c56-4b91-abff-fd5bef63ba07` | 6 | Legacy code representation boxed Address values, invented a Main memory heading, shortened the ASCII title, and used unsafe angle-bracket LaTeX glyphs. | `0205_9618_2021_mj12_q4_context_visual_fidelity.sql` | Repair prepared; VF-5 |
| 9 | Q4(a) | `95ecf9c8-6cd4-4c53-9667-92f5766ba93a` | 7 | Trace-table source inspected; ready source crop is registered. | crop provenance guard | Stored crop not independently opened; VF-5 |
| 10 | Q4(b)(i) | `6115db6b-68bc-4575-ae6c-0bf71d2423b3` | 8 | Bit-manipulation table + memory-300 source context inspected; shared ready crop is registered. | crop provenance guard | Stored crop not independently opened; VF-5 |
| 11 | Q4(b)(ii) | `2aa387ee-2917-46aa-8a12-8095f6c52a2b` | 8 | Same preceding source visual is correctly shared by this subpart. | crop provenance guard | Stored crop not independently opened; VF-5 |
| 12 | Q4(b)(iii) | `e42684a4-bb83-43bb-b6ba-2e0c6418afde` | 8 | Same preceding source visual is correctly shared by this subpart. | crop provenance guard | Stored crop not independently opened; VF-5 |
| 13 | Q5(d) | `e5e6713d-3d48-40c2-9ed1-3d64cf36faf2` | 11 | Asset row correctly says page 11 but content_json incorrectly tagged the asset as page 10. | `0204_9618_2021_mj12_q5d_source_page.sql` | Provenance repair prepared; VF-5 |

## Source-side coverage

- Canonical asset rows: **13**
- Source visual pages inspected: **2, 3, 4, 5, 6, 7, 8, 11**
- Rows with concrete repair prepared: **6**
- Rows retained with ready source-crop registration: **7**
- VF-0/VF-1 promotions: **0**
- Production writes: **0**

## Next gate

1. CI must pass on the current-main-reconciled execution branch.
2. Apply migrations only to an authorised non-production/staging environment.
3. Open every stored/inline source crop and compare it literally with the SHA-pinned PDF.
4. Capture Question Bank evidence for all 13 rows.
5. Generate and inspect PDF + DOCX exports.
6. Capture Live Challenge evidence.
7. Keep any missing surface at VF-5; repair any mismatch as VF-3/VF-4.

# EXECUTION HANDOFF FOR NEXT AI

Continue with literal stored-crop and four-surface proof for 9618/12/M/J/21.
Do not call this paper visually closed while any required surface is unverified.
After its four-surface gate, continue canonical order with 9618/13/M/J/21.
