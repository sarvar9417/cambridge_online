# 9618/13/M/J/21 - Exact Source Equivalence Evidence

**Source QP:** `9618_s21_qp_13.pdf`  
**QP source paper id:** `31e99020-8886-4391-9c61-1e535bf04bd5`  
**QP SHA256:** `c98d466d79c7e1cb71906d108dc17f3222e27c152f4e554b689c3a2facd783a3`  
**Canonical equivalent QP:** `9618_s21_qp_11.pdf`  
**Canonical source paper id:** `fab329b3-9fbc-43ac-938b-5d83c815a1e5`  
**Production mutation:** NONE

## Why this paper must not be repaired independently

Production models all **42** Paper 13 official question occurrences as non-primary occurrences of the Paper 11 canonical questions.
All 42 rows currently carry:

- `equivalence_basis = source_verified_exact`
- `qpBodyTextExact = true`
- `qpBodyRasterExact = true`
- `msExact = true`
- canonical source paper id = Paper 11

There are **16 distinct visual asset occurrences** and they resolve to the same canonical visual assets reviewed/repaired for 9618/11/M/J/21.

## Independent QP raster comparison performed in this execution

Both original Drive PDFs were rendered with the PDF audit workflow at **180 DPI** and compared page-by-page.

Result:

- pages: 16 vs 16
- pages 2-16 differ only in the footer paper-code region
- for each page 2-16: changed-pixel fraction = **0.0003927455**
- diff bounding box for each page 2-16 = **[675, 1997, 810, 2013]**
- therefore all question-body and visual regions on pages 2-16 are pixel-identical at the audited render resolution
- page 1 also differs only in cover/variant-identifying material; no question visual is on page 1

This independently corroborates the existing `qpBodyRasterExact` evidence instead of merely trusting its metadata flag.

## Independent MS raster comparison

Original `9618_s21_ms_11.pdf` and `9618_s21_ms_13.pdf` were also rendered and compared at **180 DPI**.

Result:

- pages: 10 vs 10
- all differences are tiny paper-code/header identifiers outside marking-body content
- page 1 changed-pixel fraction: **0.0000529616**, bbox **[1333, 376, 1346, 395]**
- pages 2-10 changed-pixel fraction: **0.0000599806** each, bbox **[209, 58, 223, 79]**
- marking-body content is raster-identical at the audited render resolution

This independently corroborates the existing `msExact=true` evidence.

## Visual-fidelity consequence

Paper 13 should inherit the same canonical visual repairs as Paper 11 rather than creating duplicate assets.
That includes the Q1 answer table, Q2 matching visual, Q3 instruction/memory/ASCII/trace/register visuals,
Q4 tick tables, Q6 pseudocode, Q7 relationship table and Q8 logic table.

This equivalence evidence does **not** promote any element to VF-0/VF-1.
The shared canonical assets still require Question Bank, PDF, DOCX and Live Challenge proof after repair deployment.

## Regression guard

`backend/src/database/audits/9618-2021-mj13-exact-source-equivalence.sql`

fails if any of the 42 occurrences loses exact-source evidence or stops pointing to the Paper 11 canonical source.

# EXECUTION HANDOFF FOR NEXT AI

Do not create duplicate Paper 13 repairs while exact equivalence holds.
Apply and verify the Paper 11 canonical repairs once; then collect product-surface evidence for both display references
(Paper 11 and Paper 13) where the product surface exposes occurrence-specific references.
