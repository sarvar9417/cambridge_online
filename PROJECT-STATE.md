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

## Machine-readable state

<!-- PROJECT_STATE:JSON:START -->
```json
{
  "schema_version": 1,
  "state_date": "2026-09-07",
  "release": {
    "branch": "main",
    "evidence_base_sha": "a166c70a08573d83fadf653184c36a352f2d833e",
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
      "audited_at": "2026-09-07T06:49:31Z",
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
    "lesson_studio": "implemented; three supplied-book lessons are source-complete and released on current 2026 targets",
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
      "current_main": "merged PR #117 main SHA a166c70a08573d83fadf653184c36a352f2d833e passed CI run 2520"
    },
    "ci": {
      "latest_verified_merged_pr": 117,
      "head_sha": "a166c70a08573d83fadf653184c36a352f2d833e",
      "run_number": 2520,
      "conclusion": "success",
      "note": "PR #117 workload-backed FK hardening is merged and green on main; production migration 0143 was applied after the merge."
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
    "database": "production Supabase is applied through migration 0143; mutable-search-path WARN findings are cleared and nine workload-prioritized FK indexes are valid/ready",
    "storage": "private question-assets bucket is live; production export audit verifies all 457 source-backed 9618 assets are renderable, while Vercel production readiness still reports durableStorage=false because runtime storage credentials are not configured there",
    "worker": "corpus and source-audit workflows exist and current source verification has been exercised against production",
    "deployment": "main CI #2520 is green. Vercel preview build capacity is working again, but the serving production deployment is still an older main SHA and reports database=ok, durableStorage=false"
  },
  "evidence_files": [
    "00-README.md",
    "IMPLEMENTATION-STATUS.md",
    "docs/DATA-MASTER-PLAN.md",
    "docs/lesson-studio-v3-acceptance.md",
    "backend/package.json",
    "backend/src/database/migrations/0142_security_function_search_path.sql",
    "backend/src/database/migrations/0143_fk_workload_indexes.sql",
    "backend/src/database/audits/9618-current-release-state.sql",
    "backend/src/database/audits/9618-question-export-readiness.sql"
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
questions. Historical mark-scheme review has continued through deterministic source
matcher v5 and guarded exact-source point-repair passes without relaxing source identity,
rubric prose or promotion gates.

## Acceptance state

`docs/lesson-studio-v3-acceptance.md` contains **17/18 checked items**. Merged PR #117
main SHA `a166c70a08573d83fadf653184c36a352f2d833e` passed full CI run **#2520**.
The only remaining Lesson Studio item is a Vercel runtime verification on a current
release SHA.

Vercel preview build capacity is working again, but no deployment for the current merged
main SHA has been observed yet. The serving production deployment is still older, so
18/18 is not claimed. Production `/api/v1/ready` is healthy for the database but reports
durable storage as unavailable.

## Corpus state rule

A production audit at **2026-09-07 06:49:31 UTC**, after migration 0140 was applied,
verified the strict current 9618 target: **12 QP papers, 12 MS papers, 317 mark-bearing
source-complete questions, zero blocked questions and zero dependency-integrity failures**.
These values describe the strict 2026 release scope, not every historical 2021-2025 row.

The executable audit is `backend/src/database/audits/9618-current-release-state.sql`.
Future count changes should be recorded with the audit timestamp, exact production target
and gate used so historical inventory cannot be mistaken for current release evidence.

## Storage and export state

Production export readiness has been executed from the merged audit contract: all **3302**
source-backed 9618 mark-bearing leaves are staff-searchable, all **457/457** source-backed
assets are renderable through inline content or verified private storage, all **3302** mark
schemes are exportable, and both required export migrations are ledgered.

This does **not** mean Vercel runtime storage is ready: production `/api/v1/ready` currently
reports `durableStorage=false`. The data/provider path is healthy, while the serverless
runtime credential remains an operational blocker.

## Security hardening state

Migration `0142_security_function_search_path.sql` is merged and applied to production.
The three trigger functions have exact `search_path=public, pg_temp` configuration, and a
fresh Supabase security-advisor check reports no WARN-level `function_search_path_mutable`
finding. Remaining RLS-without-policy notices are INFO-level and are not being converted
into permissive policies because many of these relations are intentionally
server/internal-only.

## FK performance state

Migration `0143_fk_workload_indexes.sql` is merged and applied to production. All nine
selected indexes were checked directly in `pg_index` and are `indisvalid=true` and
`indisready=true`. A fresh performance-advisor pass no longer reports the corresponding
nine `unindexed_foreign_keys` findings.

The remaining foreign-key findings are INFO-level and deliberately deferred: the selected
set was based on relation size, production table statistics and `pg_stat_statements`
workload rather than mechanically indexing every relationship. Newly-created indexes may
appear as `unused_index` immediately after creation until post-migration traffic exercises
them; that is not evidence that the workload-backed selection was wrong.

## Required next release gates

A release candidate should not be declared until all of the following are true:

- `npm run project:state:check` passes on the final SHA.
- `npm run verify` passes on the final SHA.
- Lesson Studio acceptance reaches 18/18, or any intentionally waived item is documented.
- Vercel preview or production smoke verification succeeds on the release SHA with the
  required database environment available.
- Vercel runtime durable storage is enabled for the environment that performs source-asset
  rendering/export, or the affected feature is explicitly blocked from release.

## Maintaining this manifest

Repository-derived values are checked by:

```bash
npm run project:state:check
```

To refresh repository-derived fields after migrations or acceptance checklist changes:

```bash
npm run project:state:refresh
```

The refresh command deliberately does not invent live database/deployment metrics. Live
values must remain evidence-backed fields from a fresh runtime audit.
