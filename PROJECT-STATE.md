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
SHA from being mislabeled as the current repository head after a later documentation-only
merge.

## Machine-readable state

<!-- PROJECT_STATE:JSON:START -->
```json
{
  "schema_version": 2,
  "state_date": "2026-09-07",
  "release": {
    "branch": "main",
    "evidence_base_sha": "f3011e88bd3cd7fc59d11346815e306e2a2cd11f",
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
    "lesson_studio": "implemented; three supplied-book lessons are source-complete and released on current 2026 targets; all inventoried import-time global DOM enhancers now use explicit React-owned lifecycle cleanup",
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
      "last_verified_main": "merged PR #137 main SHA f3011e88bd3cd7fc59d11346815e306e2a2cd11f passed CI run 2673"
    },
    "ci": {
      "latest_verified_merged_pr": 137,
      "verified_sha": "f3011e88bd3cd7fc59d11346815e306e2a2cd11f",
      "run_number": 2673,
      "conclusion": "success",
      "note": "Final scoped application hardening includes the closed-loop release regression, canonical state semantics, current-target Data Master Plan alignment, App lifecycle extractions in PRs #130/#131/#132/#134, and React-owned Lesson Studio DOM lifecycles in PRs #126/#133/#137."
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
    "storage": "private question-assets bucket is live; fresh production export audit at 2026-09-07T08:14:26Z verifies all 457 source-backed 9618 assets are renderable and 3302/3302 mark-bearing leaves are staff-searchable; Vercel readiness rechecked at 2026-09-07T10:58:06Z returned status=ok and database=ok but durableStorage=false, tracked by issue #135",
    "worker": "corpus and source-audit workflows exist and current source verification has been exercised against production",
    "deployment": "application release evidence is main SHA f3011e88bd3cd7fc59d11346815e306e2a2cd11f with CI #2673 success. At the latest deployment inspection, Vercel production was still READY on older main SHA 78aca4fe0c85bb30ff9055c7c94045356cd5a2e3; no deployment for the release evidence SHA had appeared yet, so the final Lesson Studio deployment acceptance item remains intentionally open"
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
    "frontend/src/hooks/useOfflineAnswerSync.ts",
    "frontend/src/hooks/useAttemptTiming.ts",
    "frontend/src/hooks/useStaffExportPolling.ts",
    "frontend/src/hooks/useSessionLifecycle.ts",
    "frontend/src/teaching/lesson-studio-professional-controls.ts",
    "frontend/src/teaching/lesson-question-workspace-controls.ts",
    "frontend/src/teaching/lesson-exam-workspace-v3.ts",
    "frontend/src/teaching/lesson-exam-insights.ts",
    "frontend/src/teaching/lesson-dom-lifecycles.test.ts"
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
primarily release operations, source/runtime reliability and infrastructure governance
rather than adding more application-level feature surface.

The 2026 Lesson Studio compatibility release moved active lesson targets onto the current
2026-2028 objective set while preserving historical 2021-2025 9618 questions through
explicit compatibility edges. Chapter 7 uses the same principle for historical 0478
questions. `docs/DATA-MASTER-PLAN.md` explicitly separates this historical/source-backed
inventory from the strict current-target release gate so those two scopes cannot be
mistaken for the same count or approval claim.

## Acceptance state

The final scoped application-hardening merge is PR #137, main SHA
`f3011e88bd3cd7fc59d11346815e306e2a2cd11f`. Full main CI run **#2673 succeeded**.
`docs/lesson-studio-v3-acceptance.md` remains **17/18** only because Vercel had not yet
created a preview/production deployment for that release evidence SHA at the latest
inspection. CI success is not substituted for deployment evidence.

The release-level HTTP regression added in PR #122 protects one Cambridge question identity
through selection, assignment, student attempt, answer, submission, grading, released
result and mastery evidence. This does not replace lower-level SQL or authorization tests;
it closes the cross-domain regression gap identified in the project review.

The App hardening scope is complete: PRs #130, #131, #132 and #134 moved offline answer
sync, attempt countdown/heartbeat, export polling and session/bootstrap lifecycle out of
`App.tsx` into focused hooks with regression coverage.

The Lesson Studio import-time side-effect scope is also complete: PR #126 moved
professional controls to a React-owned lifecycle, PR #133 did the same for workspace
controls, and PR #137 converted the remaining audited `lesson-exam-workspace-v3` and
`lesson-exam-insights` MutationObservers to side-effect-free imports with explicit,
reference-counted cleanup. New DOM lifecycle regression coverage proves import-without-
effects, cleanup and reinstall behavior.

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
Vercel runtime storage readiness. A fresh Vercel readiness request at **2026-09-07
10:58:06 UTC** returned HTTP 200 with `status=ok`, `database=ok`, but
`capabilities.durableStorage=false`. Issue #135 tracks the required server-only runtime
configuration and acceptance evidence.

## Security hardening state

Migration `0142_security_function_search_path.sql` is merged, applied and application-
ledgered in production. The three trigger functions have exact `search_path=public,
pg_temp` configuration. A fresh Supabase security-advisor pass at **2026-09-07 08:14:33
UTC** reported no WARN-level security finding; remaining RLS-without-policy notices are
INFO-level and are not being converted into permissive policies because many affected
relations are intentionally server/internal-only.

Reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## FK performance state

Migration `0143_fk_workload_indexes.sql` is merged, applied and application-ledgered in
production. All nine selected indexes were checked directly in `pg_index` and are
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

## Remaining release/admin gates

Application-code hardening is green on main SHA
`f3011e88bd3cd7fc59d11346815e306e2a2cd11f` / CI #2673. The remaining non-green items are
external release/administration gates and must not be represented as code defects already
fixed by documentation:

- **Vercel release deployment:** obtain a READY preview/production deployment for the
  verified release evidence SHA and smoke the serving runtime before checking Lesson Studio
  18/18.
- **Vercel durable storage — issue #135:** configure server-only runtime storage so
  `/api/v1/ready` reports `capabilities.durableStorage=true`, then prove one private
  source-backed asset render/export path.
- **GitHub governance — issue #124:** protect `main` with PR + required `CI / verify`, block
  force pushes/deletion and avoid routine bypass. The connected GitHub interface lacks the
  administration write capability required to enforce this setting.

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
