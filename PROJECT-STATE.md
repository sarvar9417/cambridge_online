# CamPath canonical project state

Updated: 2026-09-07

This file is the **single current-state manifest** for `sarvar9417/cambridge_online`.
Requirements, historical audits, milestone notes, PR descriptions and implementation
snapshots remain useful evidence, but they must not be treated as the current release
state when they disagree with this file.

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
    "evidence_base_sha": "b3dbc76af9532d6c7a7f4f842bc3c06ab817f315",
    "maturity": "late_product_integration_and_production_hardening",
    "latest_migration": "0139_9618_ms_source_point_repair_contract.sql",
    "corpus_window": {
      "9618_lesson_checkpoints": "2021-2026 through current 2026-2028 targets and explicit compatibility edges",
      "0478_chapter_7_checkpoints": "2015-2026 through curated current-target compatibility",
      "note": "Historical source-backed inventory is broader than the strict current-target release gate."
    },
    "corpus_version": "2026 current-target compatibility + source matcher v5 + exact-source MS point repair contract",
    "expected_papers": 12,
    "complete_papers": 12,
    "policy_blocked": 0,
    "source_complete_questions": 317,
    "runtime_audit": {
      "status": "verified",
      "audited_at": "2026-09-07T06:30:41Z",
      "target": "production Supabase; syllabus 9618; year 2026; official variants 1..3",
      "strict_gate": "assert_source_verified_year_v1('9618', 2026)",
      "mark_scheme_papers": 12,
      "broken_qp_ms_sources": 0,
      "dependency_cycles": 0,
      "cross_paper_dependencies": 0,
      "unresolved_errors": 0
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
      "current_main": "failing before tests because PROJECT-STATE was stale after migration 0139; candidate fix pending CI"
    },
    "ci": {
      "latest_verified_merged_pr": 111,
      "head_sha": "de9fac525412306c294a8dae78fc277fb6376a66",
      "run_number": 2437,
      "conclusion": "success",
      "note": "Direct main commits after PR #111 triggered CI failures at the project-state gate after migration 0139; this hardening candidate refreshes that state and must pass a fresh run before merge."
    },
    "lesson_studio": {
      "checked": 16,
      "total": 18,
      "pending": 2,
      "pending_items": [
        "CI npm run verify — must be green before merge.",
        "Vercel preview / production deployment — verify after CI."
      ]
    }
  },
  "infrastructure": {
    "database": "production Supabase has the 0139 source-point repair contract applied; the 2026 strict source-verified release gate passes 12/12 QP and 12/12 MS",
    "storage": "private question-assets bucket is live; 410/410 referenced storage-backed 9618 assets were found, but Vercel production readiness still reports durableStorage=false because runtime storage credentials are not configured there",
    "worker": "corpus and source-audit workflows exist and current source verification has been exercised against production",
    "deployment": "hardening preview build is READY, but its /api/v1/ready smoke check returns 503 database=missing because Preview environment database variables are not configured; current production readiness returns database=ok but durableStorage=false"
  },
  "evidence_files": [
    "00-README.md",
    "IMPLEMENTATION-STATUS.md",
    "docs/DATA-MASTER-PLAN.md",
    "docs/lesson-studio-v3-acceptance.md",
    "backend/package.json",
    "backend/src/database/migrations/0139_9618_ms_source_point_repair_contract.sql",
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
questions. Historical mark-scheme review continues through deterministic source matcher
v5 and the exact-source point-repair contract without relaxing source identity, rubric
prose or promotion gates.

## Acceptance state

`docs/lesson-studio-v3-acceptance.md` currently contains **16/18 checked items**.
The two remaining acceptance items are operational: a green `npm run verify` and a
Vercel preview/production verification.

The latest explicitly verified merged-PR CI evidence remains **PR #111 / CI run #2437:
success**. Current `main` subsequently moved through direct commits and migration 0139;
CI then failed immediately at the canonical project-state drift check. This candidate
refreshes that stale manifest and adds release-audit regression coverage, but it must pass
a fresh candidate CI run before the CI acceptance item can be checked.

## Corpus state rule

A fresh production audit on 2026-09-07 verified the strict current 9618 target:
**12 QP papers, 12 MS papers, 317 mark-bearing source-complete questions, zero blocked
questions, zero broken QP/MS source pairs and zero dependency integrity failures**.
These values describe the strict 2026 release scope, not every historical 2021-2025 row.

The executable audit is `backend/src/database/audits/9618-current-release-state.sql`.
Future count changes should be recorded with the audit timestamp, exact production target
and gate used so historical inventory cannot be mistaken for current release evidence.

## Storage and export state

Production data contains a private `question-assets` bucket. A live cross-check found all
**410/410** referenced storage-backed 9618 assets. Export readiness now treats an inline
asset or a valid materializable `supabase://` private object as renderable and still fails
closed on missing/invalid assets, blank stems, taxonomy gaps, broken dependencies, empty
mark schemes or wrong paper totals.

This does **not** mean Vercel runtime storage is ready: production `/api/v1/ready` currently
reports `durableStorage=false`. The data/provider path is healthy, while the serverless
runtime credential remains an operational blocker.

## Required next release gates

A release candidate should not be declared until all of the following are true:

- `npm run project:state:check` passes.
- `npm run verify` passes on the release SHA.
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
