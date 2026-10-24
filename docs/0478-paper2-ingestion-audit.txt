# Cambridge IGCSE Computer Science 0478 — Paper 2 ingestion audit

Snapshot: **2026-10-14**, read-only interrogation of the connected `cambridge_online` Supabase database. Numbers may change; re-run `backend/src/database/audits/0478-paper2-source-readiness.sql` for current evidence.

## Scope and invariants

- Only **0478 Paper 2** (components 21, 22, 23) is authorized in this workstream.
- Existing 9618 and 0478 Paper 1 questions must not be re-ingested or changed.
- Database writes, deploys and production migrations are **out of scope** until separately authorized.
- Exam question original meaning, source-order, contexts, pseudocode, diagrams, tables, mark allocations, and mark-scheme provenance must be preserved.
- Every 0478 question must be tagged against the correct *year-specific* syllabus version.
- A marks-total match is necessary but does not establish accurate OCR, mark points, or source fidelity.

## Baseline from live database (read-only)

| Metric | Value |
| --- | ---: |
| 0478 Paper 2 QP records | 79 |
| QP records with no question rows | 24 |
| Papers with question rows | 55 |
| All question rows, including non-mark-bearing parents | 1,223 |
| Mark-bearing leaf questions | 919 |
| Question rows flagged `needs_review` | 306 |
| Mark-bearing leaves with very short/empty text | 2 |
| Leaves containing margin spill or Unicode replacement marker | 149 |
| Diagram/table leaves with no *direct* asset relationship | 39 |

The 39 figure does **not** establish missing images: a visual may be linked to a parent context. Review inheritance and original source pages before judging.

All 55 ingested variants require source-level QA on at least one tracked dimension in the query. No variant is reported fully source-verified by this audit.

Historical Paper 2 (2015–2022) uses a 50-mark component; Paper 2 from 2023 onward uses a 75-mark component in the current syllabus catalogs/database. Do not use one fixed expected-marks threshold across eras.

## Observed error class

A database-approved 0478/21/M/J/26 flowchart prompt contained repeated `DO NOT WRITE IN THIS MARGIN` fragments and corrupted characters in `stem_md`. This is **not** acceptable as a student-facing, source-faithful representation. Being `approved` or having a mark-scheme record does not prove visual readiness.

## Proposed safe delivery sequence

1. Maintain a zero-write audit mode as the default; the old push trigger must not import automatically.
2. Scope both Drive manifest discovery **and** the previously staged DB bootstrap to Paper 2. Reject Paper 1 data even when it was staged before this branch.
3. Audit QP/MS pairing, filename identity, year-specific syllabus and totals.
4. Extract high-confidence text and source structure. Reject margin spill, control characters and visually incomplete content rather than letting confidence scores silently mark it approved.
5. Reconstruct missing diagrams/flowcharts, pseudocode blocks, table layouts and shared contexts from source PDF pages; retain verified structured assets and source page references.
6. Decompose the mark scheme into real, source-verifiable criteria. Do not treat a one-point `manual_only` wrapper representing all marks as automatically gradeable.
7. Resolve the 24 empty variants, then re-audit the existing 55 variants. Use immutable source identities and idempotent transactions; no reimport that overwrites prior answer IDs.
8. Review 0478 Paper 2 display in question bank, teacher challenge, and student view; verify Live readiness gates and do not bypass source fidelity.
9. Run tests, a non-production preview, compare pre/post database counts and source fingerprints, and request **separate production authorization**.

## What the branch implements

- Paper-2-only import scope for manifest **and** bootstrap candidates.
- Read-only audit as the default mode; an explicit separately authorized mode is needed before any writes.
- A manual GitHub workflow, rather than the previous push-triggered import.
- Fail-closed import checks for margin text/control or replacement characters, and for content that requires a verified diagram/table representation.
- A SQL readiness report and scope/safety regression tests.

**Not yet done:** repaired corpus assets, missing 24 paper imports, verified mark-point segmentation, independent PDF-by-PDF source sign-off, Live Challenge end-to-end validation. Do not describe this branch as full 0478 Paper 2 completion.

## Read-only verification

```sql
-- Run backend/src/database/audits/0478-paper2-source-readiness.sql
-- It returns one row per QP with source/quality counters and audit_state.
```

The GitHub Actions workflow's default `audit` mode never calls the corpus-runner RPC, so it is suitable for an isolated preview of source inventory. Its `apply` mode remains production-writing and **must not** be invoked as part of this branch review.
