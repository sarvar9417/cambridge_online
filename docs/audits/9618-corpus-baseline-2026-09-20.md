# Cambridge 9618 Corpus Final Closure — Baseline 2026-09-20

Status: **Phase 0 baseline complete (read-only production audit)**  
Working branch: `audit/9618-corpus-final-closure`  
Base main SHA: `0046c83e0cfca82234f6c6e7a9363458c1e2fdbb`  
Production mutation during this baseline: **none**

## 1. Purpose

This snapshot is the fixed starting point for the final 9618 past-paper corpus closure programme.

The three independent truth layers are:

1. **Source truth** — connected Google Drive Cambridge QP/MS/IN/GT/ER files.
2. **Database truth** — production Supabase corpus.
3. **Code truth** — current GitHub `main`.

No repair is accepted unless these layers remain reconcilable.

## 2. Canonical source inventory

The connected Drive session folders and the production source inventory agree for the canonical QP/MS sets currently present:

| Year | Series | Canonical QP | Canonical MS |
|---|---:|---:|---:|
| 2021 | M/J | 12 | 12 |
| 2021 | O/N | 10 | 10 |
| 2022 | M/J | 12 | 12 |
| 2022 | O/N | 12 | 12 |
| 2023 | M/J | 12 | 12 |
| 2023 | O/N | 12 | 12 |
| 2024 | M/J | 12 | 12 |
| 2024 | O/N | 12 | 12 |
| 2025 | M/J | 12 | 12 |
| 2025 | O/N | 12 | 12 |
| 2026 | M/J | 12 | 12 |
| **Total** |  | **130** | **130** |

All canonical QP/MS rows above have SHA-256 and page-count metadata.

### Non-canonical legacy record

Production also contains one legacy manual 2026 M/J Paper 1 `variant=0` pair:

- QP storage: `legacy/manual/phase-0-qp.pdf`
- MS storage: `legacy/manual/phase-0-ms.pdf`
- 40 archived question rows, including 20 marked leaves
- no source URL/page count

It is **not** a fourth Cambridge variant and is excluded from canonical coverage.

## 3. Approved scoring corpus

Production approved scoring leaves:

| Year | Approved scoring leaves | stem_latex | body_format=latex | structured v1 |
|---|---:|---:|---:|---:|
| 2021 | 319 | 319 | 319 | 319 |
| 2022 | 510 | 510 | 510 | 510 |
| 2023 | 511 | 511 | 511 | 511 |
| 2024 | 510 | 510 | 510 | 510 |
| 2025 | 606 | 606 | 606 | 606 |
| 2026 M/J | 317 | 317 | 317 | 317 |
| **Total** | **2773** | **2773** | **2773** | **2773** |

Canonical scoring corpus therefore currently has:

- missing approved question LaTeX: **0**
- missing structured content: **0**
- source-host contamination in structured content: **0**

## 4. Canonical mark-scheme integrity

For all **2773** approved scoring leaves:

- missing canonical mark scheme: **0**
- non-approved canonical mark scheme: **0**
- question/MS mark mismatch: **0**
- canonical MS without mark points: **0**
- missing current exact verified MS source audit: **0**

The canonical mark-scheme selection view is therefore healthy for the approved corpus.

A naive "latest audit row must equal canonical source row" check reports 65 mismatches because historical/equivalent-source audit rows can be newer. The correct contract is existence of a verified audit against the canonical MS current source SHA; under that contract the gap is **0**.

## 5. Taxonomy / Learning Objective baseline

Every approved leaf has a primary subtopic and at least one LO mapping.

Low-confidence mappings still requiring source-backed closure review:

| Year | Primary subtopic < 0.95 | LO < 0.95 |
|---|---:|---:|
| 2021 | 0 | 0 |
| 2022 | 0 | 0 |
| 2023 | 0 | 0 |
| 2024 | 6 | 40 |
| 2025 | 1 | 10 |
| 2026 | 259 | 301 |

This is the largest remaining **data-quality P1 workstream**, especially 2026.

Important: confidence is not to be increased merely to satisfy a threshold. Every correction/review must be source-syllabus backed.

## 6. Asset / visual baseline

9618 QP-backed asset rows:

- total question asset rows: **1111**
- visual rows (diagram/image): **323**
- visual rows with LaTeX source: **268**
- visual rows with compiled SVG: **258**
- structured asset references from approved scoring content: **1158**
- missing referenced asset rows: **0**
- cross-source referenced assets: **0**
- unrenderable referenced assets: **0**

Four approved 2022 historical diagram rows match the row-level "unresolved" detector, but:

- none is referenced by current structured content;
- each has a separate renderable companion asset;
- all four have `latex_source`;
- current approved scoring content has no unrenderable asset reference.

A fifth unresolved row belongs only to the archived legacy 2026 variant-0 data.

These rows are cleanup debt, not a current rendering blocker.

## 7. Dependency integrity

For approved 9618 scoring leaves:

- dependency rows: **534**
- missing dependency targets: **0**
- unavailable required dependency targets: **0**

## 8. Source occurrence model

The occurrence ledger is operating under migration 0144 semantics:

- every canonical question has a primary occurrence;
- exact duplicated official variants are represented by verified non-primary occurrences;
- primary backfill rows are intentionally allowed to have `verified_at = NULL`;
- non-primary `source_verified_exact` rows require verification.

Therefore a raw count of NULL `verified_at` on primary occurrences is **not a blocker**.

## 9. Auxiliary Drive source inventory

Against the currently connected session folders, database indexing matches the visible named auxiliary sources:

- Inserts (IN): **33** files
- Grade thresholds (GT): **9** files
- Examiner reports (ER): **1** file

The single visible ER is `9618_s22_er.pdf`; 2024 session folders currently contain no GT/ER PDFs. We must not invent missing auxiliary documents that are not present in the source folders.

Source-file ZIPs (SF) remain a separate operational/source-artifact category and are not counted as scoring-corpus QP/MS completeness.

## 10. Validation findings

Only one unresolved 9618-scoped validation finding remains:

- `MANUAL-DURABLE-REPAIR` warning on 2021 M/J Paper 11.

Its message describes an August ingest state where persisted rows were still `needs_review` after an external classifier failed. Current corpus state is now approved/source-verified, so this finding is a likely **stale audit warning** that must be formally reconciled rather than silently deleted.

## 11. Export readiness

Current production readiness audit:

- approved scoring leaves: **2773**
- missing structured content: **0**
- source-host contamination: **0**
- missing referenced assets: **0**
- cross-source asset refs: **0**
- unrenderable asset refs: **0**
- missing canonical MS: **0**
- non-approved canonical MS: **0**
- mark mismatch: **0**
- canonical MS without points: **0**
- missing dependency targets: **0**
- unavailable required dependencies: **0**

There are **261 sibling/ancestor-external structured asset references across 156 leaves** that require portable export closure. Current main contains portable snapshot logic added after this audit model was introduced, so this count must be validated against actual PDF/DOCX E2E behavior before classifying it as a blocker.

## 12. Code / database migration reconciliation

Production migration ledger is ahead of the current main baseline in naming/state:

- production includes `app_0168_live_exam_peer_integrity`
- `app_0169_live_exam_override_audit`
- `app_0170_live_exam_learning_evidence`
- `app_0172_unified_live_challenge_controls`
- `app_0173_live_challenge_database_hardening`

The repository main contains the 0168–0170 migration work under repository migration filenames, but no current-main code-search hit was found for the 0172/0173 migration identities.

**Rule:** no production DB mutation will be made from this closure branch until this migration-ledger/code drift is reconciled.

## 13. Phase-0 classification

### DONE / healthy
- canonical QP/MS source identity: 130/130 pairs
- approved scoring corpus: 2773/2773
- question LaTeX coverage: 2773/2773
- structured v1 coverage: 2773/2773
- canonical MS coverage/approval: 2773/2773
- exact current MS source-audit coverage: 2773/2773
- mark totals
- required dependency integrity
- referenced asset renderability
- currently visible IN/GT/ER inventory coverage

### PARTIAL / requires closure
- 2024 taxonomy/LO low-confidence review
- 2025 taxonomy/LO low-confidence review
- 2026 taxonomy/LO review (largest gap)
- row-level historical visual cleanup
- stale validation warning reconciliation
- portable export closure verification for sibling assets
- production migration ledger vs current-main reconciliation

### NON-CANONICAL / excluded from readiness totals
- legacy 2026 M/J Paper 1 variant 0

## 14. Next execution order

1. Reconcile current main with production migrations, especially 0172/0173.
2. Validate the 261 portable-closure asset references using the current export implementation/E2E contracts.
3. Reconcile the stale 2021 M/J 11 warning.
4. Close the 4 approved orphan historical visual rows without changing current referenced rendering.
5. Source-review low-confidence taxonomy in order:
   - 2024
   - 2025
   - 2026 by paper, with 0-blocker per-paper gates.
6. Re-run corpus-wide source/LaTeX/MS/asset/dependency/export audits.
7. Record final closure snapshot before merge/release.

