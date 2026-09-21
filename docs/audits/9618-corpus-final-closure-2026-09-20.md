# Cambridge 9618 Corpus Final Closure — 2026-09-20

Status: **SOURCE-BACKED CORPUS CLOSED / 130 OF 130 OFFICIAL QP OCCURRENCES READY**

Working branch: `audit/9618-corpus-final-closure`  
Pull request: #260  
Production Supabase: `mphmganorvhsnwvhcxyj`

## Final release result

The canonical closure audit now returns **no non-READY official paper** for the 2021–2026 corpus currently present in the project.

| Year / series | READY papers |
|---|---:|
| 2021 M/J | 12 / 12 |
| 2021 O/N | 10 / 10 |
| 2022 M/J | 12 / 12 |
| 2022 O/N | 12 / 12 |
| 2023 M/J | 12 / 12 |
| 2023 O/N | 12 / 12 |
| 2024 M/J | 12 / 12 |
| 2024 O/N | 12 / 12 |
| 2025 M/J | 12 / 12 |
| 2025 O/N | 12 / 12 |
| 2026 M/J | 12 / 12 |
| **Total** | **130 / 130** |

## Corpus identity

- official QP occurrences: **130**
- physical canonical content owners: **109**
- verified exact-content source variants: **21**
- unique approved scoring leaves: **2773**
- scoring-leaf occurrences across all official papers: **3302**
- occurrence marks across official papers: **9750**
- non-canonical legacy 2026 M/J component-1 `variant=0`: excluded by design

The exact-equivalent variants keep their own source provenance through
`question_source_occurrences` while using the verified canonical content owner.

## Question and mark-scheme closure

For the canonical approved corpus:

- approved scoring leaves: **2773 / 2773**
- LaTeX-ready scoring leaves: **2773 / 2773**
- structured-v1 scoring leaves: **2773 / 2773**
- canonical mark schemes: complete
- mark-scheme mark totals: consistent
- mark-scheme points: present
- current source-SHA verification: complete

## Taxonomy closure

All previously pending taxonomy work is closed.

- primary subtopic confidence below 0.95: **0**
- learning-objective confidence below 0.95: **0**
- official papers blocked by taxonomy review: **0**

The final 2026 M/J closure was completed paper-by-paper for 11, 12, 13,
21, 22, 23, 31, 32, 33, 41, 42 and 43 using the official QP/MS and
Cambridge 9618 syllabus evidence.

No taxonomy closure migration rewrites question wording, source LaTeX,
marks or mark-scheme content.

## Assets, dependencies and occurrences

Across all official paper occurrences:

- structured asset references: **1396**
- missing referenced assets: **0**
- unrenderable referenced assets: **0**
- dependency rows: **693**
- missing dependency targets: **0**
- unavailable required dependency targets: **0**
- source occurrence closure: complete

Historical unreferenced asset rows remain cleanup debt only; they do not
block current structured rendering.

## Validation ledger reconciliation

The historical `MANUAL-DURABLE-REPAIR` warning for 9618/11/M/J/21 was
formally reconciled by migration
`0189_reconcile_9618_2021_mj11_stale_validation_warning.sql`.

The resolution was gated on the current paper state:

- 30 / 30 approved scoring leaves
- 75 / 75 marks
- 30 / 30 LaTeX
- 30 / 30 structured-v1
- canonical mark schemes source-verified
- no low-confidence taxonomy/LO mappings

Current unresolved 9618-scoped validation findings: **0**.

## Production migrations in this closure phase

Applied and verified:

- `app_0174_9618_2024_mj11_taxonomy_closure`
- `app_0175_9618_2024_remaining_taxonomy_closure`
- `app_0176_9618_2025_taxonomy_closure`
- `app_0177_9618_2026_mj11_taxonomy_closure`
- `app_0178_9618_2026_mj12_taxonomy_closure`
- `app_0179_9618_2026_mj13_taxonomy_closure`
- `app_0180_9618_2026_mj21_taxonomy_closure`
- `app_0181_9618_2026_mj22_taxonomy_closure`
- `app_0182_9618_2026_mj23_taxonomy_closure`
- `app_0183_9618_2026_mj31_taxonomy_closure`
- `app_0184_9618_2026_mj32_taxonomy_closure`
- `app_0185_9618_2026_mj33_taxonomy_closure`
- `app_0186_9618_2026_mj41_taxonomy_closure`
- `app_0187_9618_2026_mj42_taxonomy_closure`
- `app_0188_9618_2026_mj43_taxonomy_closure`
- `app_0189_reconcile_9618_2021_mj11_stale_validation_warning`

Each data repair was dry-run in a transaction before production application
and includes a fail-closed postcondition.

## Repository / release sequencing

PR #260 remains separate from the Live Challenge feature PR #259.

PR #259 contains the repository copies of production migrations
`0172_unified_live_challenge_controls.sql` and
`0173_live_challenge_database_hardening.sql`. Production already has these
migrations, so #259 must land before #260 (or #260 must be rebased onto it)
to keep the repository migration ledger in the same order as production.

The corpus itself is **READY**. The remaining merge sequencing is repository
release engineering, not corpus-data closure.

## Platform-wide advisor note

The post-migration Supabase advisor still reports platform-wide INFO findings,
including RLS-enabled tables without policies and unindexed foreign keys.
These findings pre-date / extend beyond this corpus-specific closure and should
be handled as a separate platform-hardening workstream rather than by weakening
the corpus release gates.
