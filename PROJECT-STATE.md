# CamPath canonical project state

Updated: 2026-09-07

This file is the **single current-state manifest** for `sarvar9417/cambridge_online`.
Requirements, historical audits, milestone notes and implementation snapshots remain useful
evidence, but they must not be treated as the current release state when they disagree
with this file.

## Truth policy

Use this order when deciding what is current:

1. **`PROJECT-STATE.md`** — current product/release status and unresolved runtime evidence.
2. Executable code, migrations, tests and current CI evidence.
3. Domain plans and acceptance documents.
4. Historical snapshots such as `IMPLEMENTATION-STATUS.md` and older audit reports.

Live production values below are recorded only when they were freshly verified against
the current production database/deployment. A later repository-only review must not
silently replace them with historical counts or assumptions.

`release.evidence_base_sha` is deliberately the **last explicitly verified merged main
commit**, not a promise that the file contains GitHub's live current branch head. The
actual current head must be read from GitHub. This distinction prevents an older verified
SHA from being mislabeled as the current repository head after a later merge.

## Machine-readable state

<!-- PROJECT_STATE:JSON:START -->
```json
{
  "schema_version": 2,
  "state_date": "2026-09-07",
  "release": {
    "branch": "main",
    "evidence_base_sha": "45557d6be21d52786531db1b8dc5ae383d9f80ac",
    "maturity": "late_product_integration_and_production_hardening",
    "latest_migration": "0143_fk_workload_indexes.sql",
    "corpus_window": {
      "9618_lesson_checkpoints": "2021-2026 through current 2026-2028 targets and explicit compatibility edges",
      "0478_chapter_7_checkpoints": "2015-2026 through curated current-target compatibility",
      "note": "Historical source-backed inventory is broader than the strict current-target release gate."
    },
    "corpus_version": "2026 current-target compatibility + source matcher v5 + guarded MS point repair v2",
    "expected_papers": 12,
    "complete_papers": 12,
    "policy_blocked": 0,
    "source_complete_questions": 317,
    "runtime_audit": {
      "status": "verified",
      "audited_at": "2026-09-07T08:13:50Z",
      "target": "production Supabase; syllabus 9618; year 2026; official variants 1..3",
      "strict_gate": "assert_source_verified_year_v1('9618', 2026)",
      "mark_scheme_papers": 12,
      "broken_qp_ms_sources": 0,
      "dependency_cycles": 0,
      "cross_paper_dependencies": 0,
      "self_dependencies": 0,
      "unresolved_errors": 0,
      "missing_answer_dependencies": 0,
      "missing_practical_dependencies": 0
    }
  },
  "product": {
    "question_bank": "implemented; source-fidelity and fail-closed rules are active",
    "lesson_studio": "implemented; three supplied-book lessons are source-complete and released on current 2026 targets; professional navigation controls now have React-owned lifecycle cleanup",
    "assignments": "implemented",
    "submissions": "implemented",
    "marking": "implemented with guarded mark-scheme visibility and source review",
    "reports": "implemented foundation including PDF/DOCX export flows with frozen selection snapshots",
    "student_flow": "implemented foundation; targeted five-question practice fails closed when the approved pool is insufficient",
    "analytics": "implemented foundation",
    "ai": "assistive layer only; Cambridge source/database/human approval remain authoritative"
  },
  "acceptance": {
    "verify": {
      "command": "npm run verify",
      "last_verified_main": "merged PR #126 main SHA 45557d6be21d52786531db1b8dc5ae383d9f80ac passed CI run 2576"
    },
    "ci": {
      "latest_verified_merged_pr": 126,
      "verified_sha": "45557d6be21d52786531db1b8dc5ae383d9f80ac",
      "run_number": 2576,
      "conclusion": "success",
      "note": "Review hardening now includes the selection-to-mastery release regression (PR #122), explicit last-verified evidence semantics (PR #123), current-target versus historical Data Master Plan alignment (PR #125), and the first React-owned Lesson Studio side-effect lifecycle cleanup (PR #126)."
    },
    "lesson_studio": {
      "checked": 17,
      "total": 18,
      "pending": 1,
      "pending_items": [
        "Vercel preview / production deployment — verify after CI."
      ]
    }
  },
  "infrastructure": {
    "database": "production Supabase is realized and application-ledgered through repository migration 0143; 17 late migration filenames (0127..0143, excluding nonexistent 0141) were baselined only after durable postconditions passed; mutable-search-path WARN findings remain cleared and nine workload-prioritized FK indexes are valid/ready",
    "storage": "private question-assets bucket is live; fresh production export audit at 2026-09-07T08:14:26Z verifies all 457 source-backed 9618 assets are renderable and 3302/3302 mark-bearing leaves are staff-searchable; Vercel production readiness still reports durableStorage=false because runtime storage credentials are not configured there",
    "worker": "corpus and source-audit workflows exist and current source verification has been exercised against production",
    "deployment": "last explicitly verified merged main is PR #126 SHA 45557d6be21d52786531db1b8dc5ae383d9f80ac, CI #2576 success. Vercel deployment/runtime verification remains the only unchecked Lesson Studio acceptance item and is intentionally not claimed complete"
  },
  "evidence_files": [
    "00-README.md",
    "IMPLEMENTATION-STATUS.md",
    "docs/DATA-MASTER-PLAN.md",
    "docs/lesson-studio-v3-acceptance.md",
    "docs/RELEASE-HARDENING-PLAN.md",
    "backend/package.json",
    "backend/src/release-learning-loop.integration.test.ts",
    "backend/src/database/migrations/0142_security_function_search_path.sql",
    "backend/src/database/migrations/0143_fk_workload_indexes.sql",
    "backend/src/database/audits/late-migration-ledger-reconcile.sql",
    "backend/src/database/audits/9618-current-release-state.sql",
    "backend/src/database/audits/9618-question-export-readiness.sql",
    "frontend/src/teaching/lesson-studio-professional-controls.ts",
    "frontend/src/teaching/lesson-studio-professional-controls.test.ts"
  ]
}
```
<!-- PROJECT_STATE:JSON:END -->

## Current interpretation

### Product goal

CamPath is a source-grounded Cambridge Computer Science teaching platform, not merely
a past-paper viewer. Its core loop is:

```text
Cambridge source
  -> verified corpus / learning objective
  -> Question Bank
  -> Lesson Studio
  -> assignment
  -> student submission
  -> marking
  -> analytics
  -> next teaching decision
```

AI may assist parsing, mapping, tutoring and marking workflows, but it does not replace
Cambridge source provenance, database rules or guarded human/automated approval.

### Current product state

The repository is beyond an early MVP. Question Bank, Lesson Studio, assignments,
submissions, marking, exports/reports and analytics foundations exist. Current work is
primarily integration, corpus/source hardening, visual fidelity, acceptance evidence and
production reliability.

The 2026 Lesson Studio compatibility release moved active lesson targets onto the current
2026-2028 objective set while preserving historical 2021-2025 9618 questions through
explicit compatibility edges. Chapter 7 uses the same principle for historical 0478
questions. `docs/DATA-MASTER-PLAN.md` now explicitly separates this historical/source-backed
inventory from the strict current-target release gate so those two scopes cannot be
mistaken for the same count or approval claim.

## Acceptance state

`docs/lesson-studio-v3-acceptance.md` contains **17/18 checked items**. The last explicitly
verified merged main evidence is PR #126, SHA
`45557d6be21d52786531db1b8dc5ae383d9f80ac`, full CI run **#2576: success**.
The only remaining Lesson Studio acceptance item is a Vercel runtime verification on a
release SHA.

The release-level HTTP regression added in PR #122 protects one Cambridge question identity
through selection, assignment, student attempt, answer, submission, grading, released
result and mastery evidence. This does not replace lower-level SQL or authorization tests;
it closes the cross-domain regression gap identified in the project review.

PR #123 also makes CI evidence semantics explicit: a verified SHA is recorded as **last
verified main**, never implicitly claimed to be GitHub's live current head. PR #126 begins
the incremental Lesson Studio maintainability cleanup by removing import-time auto-install
for professional navigation controls and binding their global observer/fullscreen lifecycle
to the React Lesson Studio owner with regression coverage.

No deployment-only evidence is inferred from database or CI success. The serving Vercel
runtime must be verified independently before 18/18 can be claimed.

## Corpus state rule

A fresh production audit at **2026-09-07 08:13:50 UTC** verified the strict current 9618
target: **12 QP papers, 12 MS papers, 317 mark-bearing source-complete questions, zero
blocked questions, zero broken QP/MS source pairs and zero dependency-integrity
failures**. These values describe the strict 2026 release scope, not every historical row.

The same audit currently reports **3302** historical/source-backed mark-bearing questions;
historical paper inventory is intentionally broader than the strict current-target gate.
The executable audit is `backend/src/database/audits/9618-current-release-state.sql`.

## Storage and export state

Fresh production export readiness at **2026-09-07 08:14:26 UTC** passed the merged audit
contract: all **3302** source-backed 9618 mark-bearing leaves are staff-searchable, all
**457/457** source-backed assets are renderable through inline content or verified private
storage, all **3302** mark schemes are exportable, and both required export migrations are
ledgered.

The private `question-assets` bucket remains non-public; referenced private objects were
verified present rather than weakening storage authorization. This does **not** imply
Vercel runtime storage readiness, which remains a separate deployment-environment concern.

## Security hardening state

Migration `0142_security_function_search_path.sql` is merged, applied and now application-
ledgered in production. The three trigger functions have exact `search_path=public,
pg_temp` configuration. A fresh Supabase security-advisor pass at **2026-09-07 08:14:33
UTC** reports no WARN-level security finding; remaining RLS-without-policy notices are
INFO-level and are not being converted into permissive policies because many affected
relations are intentionally server/internal-only.

Reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## FK performance state

Migration `0143_fk_workload_indexes.sql` is merged, applied and now application-ledgered
in production. All nine selected indexes were checked directly in `pg_index` and are
`indisvalid=true` and `indisready=true`. The corresponding unindexed-FK advisor findings
were cleared.

The remaining foreign-key findings are INFO-level and deliberately deferred: the selected
set was based on relation size, production table statistics and `pg_stat_statements`
workload rather than mechanically indexing every relationship. Newly-created indexes may
appear as `unused_index` until post-migration traffic exercises them; that alone is not a
removal signal.

## Migration ledger state

Before PR #119, production had realized migrations through 0143 while the application
ledger stopped at `0126_source_dependency_approval_gate.sql`. Because `migrate.ts` treats
an absent filename as unapplied, this created a replay risk for any future normal
`db:migrate` run.

`backend/src/database/audits/late-migration-ledger-reconcile.sql` resolves that risk without
replaying migrations. It uses the same `campath_schema_migrations` advisory-lock key as the
application migration runner, requires the 0126 baseline, proves durable postconditions
for each of the **17** repository filenames from 0127 through 0143, then baselines only
those exact names transactionally. Production reconciliation completed at **2026-09-07
08:12:39 UTC**, and all 17 expected rows are present in `public.schema_migrations`.

## Required next release gates

A release candidate should not be declared until all of the following are true:

- `npm run project:state:check` passes on the final SHA.
- `npm run verify` passes on the final SHA.
- Lesson Studio acceptance reaches 18/18, or any intentionally waived item is documented.
- Vercel preview or production smoke verification succeeds on the release SHA with the
  required database environment available.
- Vercel runtime durable storage is enabled for the environment that performs source-asset
  rendering/export, or the affected feature is explicitly blocked from release.

Repository governance is tracked separately in issue #124: `main` should be protected by
PR + required CI policy. Until GitHub reports that protection/ruleset evidence, the
presence of green CI alone must not be called an enforced governance gate.

## Maintaining this manifest

Repository-derived values are checked by:

```bash
npm run project:state:check
```

To refresh repository-derived fields after migrations or acceptance checklist changes:

```bash
npm run project:state:refresh
```

The checker also enforces CI evidence semantics: `release.evidence_base_sha` and
`acceptance.ci.verified_sha` must match, the recorded CI conclusion must be successful,
and the human-readable `last_verified_main` line must name both the exact SHA and CI run.
Legacy ambiguous keys such as `current_main` and `head_sha` are rejected.

The refresh command deliberately does not invent live database/deployment metrics or a
new verified SHA. Live/runtime and CI evidence must remain explicit, evidence-backed facts.
