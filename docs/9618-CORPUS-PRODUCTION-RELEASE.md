# Cambridge 9618 Corpus Production Release

Released to `main` on 2026-08-17 via PR #10.

## Release state

- 118/118 supplied Question Paper / Mark Scheme pairs are present in production.
- 2,985 mark-bearing question leaves are structured.
- Aggregate paper marks are 8,850 (118 × 75).
- Every supplied QP totals 75 marks and every corresponding MS totals 75 marks.
- Historical syllabus mappings remain version-aware for 2021–2023 and 2024–2025.
- Low-confidence automatic taxonomy mappings remain explicitly review-gated.
- Source-backed `manual_only` mark schemes have explicit safety reasons.
- Deterministic fixed-group scorer invariant failures are 0 after the 0077 repair.
- Production migration ledger is reconciled with all current repository migration filenames; previously realised corpus migrations will not be replayed by `db:migrate`.

## Verification

PR branch CI #836 passed before merge.

Merge commit:

`0a458842e5fe0eef62838f838f23df3d95ef0ed0`

Post-merge `main` CI #837 passed.

A content-identical deployment-trigger commit followed because the Vercel Git integration did not create a production deployment for the merge commit itself. This release note is intentionally tracked as the auditable content change used to trigger a fresh production deployment of the merged `main` tree.

Production database post-merge verification remained:

- QP: 118
- MS: 118
- mark-bearing leaves: 2,985
- marks: 8,850
- bad deterministic groups: 0
- unexplained manual-only reasons: 0

## Authoritative checks

- `backend/src/database/audits/9618-corpus-completion.sql`
- `backend/src/database/audits/9618-manual-only-reasons.sql`
- `backend/src/database/audits/9618-migration-ledger-reconcile.sql`
