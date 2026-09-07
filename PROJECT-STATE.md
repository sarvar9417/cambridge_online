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

Live counts below are recorded only when backed by a fresh production query or release
workflow. Historical counts are kept separate from the stricter current-target gate.

## Machine-readable state

<!-- PROJECT_STATE:JSON:START -->
```json
{
  "schema_version": 1,
  "state_date": "2026-09-07",
  "release": {
    "branch": "main",
    "evidence_base_sha": "542b4e7ffb80a5028aca3592f909c7bc03aeafa5",
    "maturity": "late_product_integration_and_production_hardening",
    "latest_migration": "0139_9618_ms_source_point_repair_contract.sql",
    "current_target": {
      "syllabus": "9618",
      "year": 2026,
      "series": "MJ",
      "variants": [1, 2, 3],
      "components": [1, 2, 3, 4]
    },
    "corpus_window": {
      "9618_lesson_checkpoints": "2021-2026 through current 2026-2028 targets and explicit compatibility edges",
      "0478_chapter_7_checkpoints": "2015-2026 through curated current-target compatibility",
      "note": "Historical source-backed coverage is reported separately from the strict 2026 release gate."
    },
    "corpus_version": "2026 source-verified current target + historical source-safe compatibility",
    "expected_papers": 12,
    "complete_papers": 12,
    "policy_blocked": 0,
    "source_complete_questions": 317,
    "broken_qp_ms_sources": 0,
    "historical_source_backed": {
      "window": "2021-2026",
      "qp_papers": 130,
      "ms_papers": 130,
      "mark_bearing_questions": 3302,
      "note": "These historical totals are source-backed inventory, not a claim that every 2021-2025 row passes the stricter 2026 assert_source_verified_year_v1 gate."
    },
    "runtime_audit": {
      "status": "verified",
      "audited_at": "2026-09-07T06:30:41Z",
      "database_project": "mphmganorvhsnwvhcxyj",
      "gate": "assert_source_verified_year_v1('9618', 2026)",
      "gate_result": {
        "verified": true,
        "qpPapers": 12,
        "msPapers": 12,
        "badPapers": 0,
        "unresolvedErrors": 0,
        "crossPaperDependencies": 0,
        "selfDependencies": 0,
        "dependencyCycles": 0,
        "missingAnswerDependencies": 0,
        "missingPracticalDependencies": 0
      },
      "workflow_evidence": {
        "name": "Full 9618 2026 corpus backfill",
        "run_id": 34081108204,
        "run_number": 7,
        "conclusion": "success",
        "artifact_id": 10003759096,
        "artifact_sha256": "57d89319070e02de44dcaab583fa5014dc4e6b0bfa645d1767e311d0649a0ce2"
      }
    }
  },
  "product": {
    "question_bank": "implemented; source-fidelity and fail-closed rules are active",
    "lesson_studio": "implemented; supplied-book lessons use exact source checkpoints and current compatibility mappings",
    "assignments": "implemented",
    "submissions": "implemented",
    "marking": "implemented with guarded mark-scheme visibility and source review",
    "reports": "implemented; PDF/DOCX export materializes private source crops at export time",
    "student_flow": "implemented; practice is generated only from approved real questions and fails closed when fewer than five eligible questions exist",
    "analytics": "implemented foundation",
    "ai": "assistive layer only; Cambridge source/database/human approval remain authoritative"
  },
  "acceptance": {
    "verify": {
      "command": "npm run verify",
      "current_main": "run_2463_failed_before_release-state_refresh"
    },
    "ci": {
      "latest_verified_merged_pr": 112,
      "head_sha": "81e988a0989018e1cfce4faf5fca2892e334e6e0",
      "run_number": 2453,
      "conclusion": "success",
      "note": "PR #112 head and merge commit used the same Git tree. Later main 542b4e7 run #2463 failed at npm run verify and is being repaired by the current release-hardening branch."
    },
    "lesson_studio": {
      "checked": 16,
      "total": 18,
      "pending": 2,
      "pending_items": [
        "CI npm run verify — must be green before merge.",
        "Vercel preview / production deployment — verify after CI."
      ]
    },
    "learning_loop": {
      "status": "covered_by_executable_domain_contracts",
      "evidence": [
        "backend/src/student-learning-loop.integration.test.ts",
        "backend/src/domain-services.test.ts",
        "backend/src/results-service.test.ts",
        "backend/src/questions-repository.test.ts",
        "backend/src/auth.integration.test.ts"
      ],
      "note": "Release CI must still pass the full suite on the candidate SHA."
    }
  },
  "infrastructure": {
    "database": "production Supabase is healthy; managed migration 20260907061753 (9618_ms_source_point_repair_contract) matches repository migration 0139",
    "storage": "private question-assets bucket contains 741 objects; all 410 storage-backed 9618 export assets checked in the live audit resolve to durable objects; Vercel runtime storage credentials are still missing",
    "worker": "2026 corpus backfill workflow run 34081108204 completed successfully with evidence artifact",
    "deployment": "Vercel production deployment for main 542b4e7 is READY; /api/v1/ready reports database=ok but durableStorage=false"
  },
  "risk_register": {
    "current_corpus_truth": "green",
    "full_learning_loop_contract": "green_pending_candidate_ci",
    "lesson_studio_acceptance": "yellow_pending_candidate_ci_and_deployment",
    "asset_data_and_export_gate": "green",
    "asset_runtime_credentials": "red_missing_vercel_secret",
    "documentation_currency": "green",
    "student_fake_fallback": "green_no_fixed_question_fallback",
    "frontend_architecture": "controlled_custom_router_modular_pages_no_release_blocker"
  },
  "evidence_files": [
    "00-README.md",
    "IMPLEMENTATION-STATUS.md",
    "docs/DATA-MASTER-PLAN.md",
    "docs/lesson-studio-v3-acceptance.md",
    "backend/package.json",
    "backend/src/database/migrations/0139_9618_ms_source_point_repair_contract.sql",
    "backend/src/database/audits/9618-current-release-state.sql",
    "backend/src/database/audits/9618-question-export-readiness.sql",
    "backend/src/lib/export-assets.ts",
    "backend/src/lib/export-assets.test.ts",
    "backend/src/services/practice-service.ts",
    "backend/src/student-learning-loop.integration.test.ts"
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
  -> Lesson Studio / practice
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

Student remediation no longer relies on fixed fallback questions. `PracticeService`
selects five approved source questions through explicit LO compatibility, requires an
approved mark scheme, rejects dependency-bearing/unrenderable items and fails closed if
five eligible real questions are not available.

## Corpus release evidence

The strict current release target is **9618 / 2026 / May-June / variants 1-3 / components
1-4**. A fresh production audit at **2026-09-07T06:30:41Z** returned:

- 12 source-backed QPs and 12 paired MS papers;
- 317 mark-bearing source-complete questions;
- 0 policy-blocked current-target questions;
- 0 broken QP/MS source pairs;
- `assert_source_verified_year_v1('9618', 2026) -> verified=true` with zero dependency
  and unresolved-source failures.

The broader 2021-2026 inventory contains 130 source-backed QPs, 130 MS papers and 3,302
mark-bearing questions. That historical inventory is **not** silently promoted to the
stricter 2026 release contract; older review state remains independently auditable.

The canonical executable query is now:

```text
backend/src/database/audits/9618-current-release-state.sql
```

## Export and durable-asset state

The previous export audit incorrectly classified every private `storage_path` crop with
blank `content_md` as non-renderable. Current export code deliberately materializes such
private PNG crops at export time (`export-assets.ts`) into self-contained SVG for both PDF
and DOCX. The release-hardening audit now matches that runtime contract and also verifies
that referenced Supabase objects exist when the Storage schema is available.

Live production evidence found **410/410** storage-backed 9618 export assets in the
private `question-assets` bucket, and the revised export-readiness gate passes.

One operational blocker remains: the current Vercel runtime reports
`durableStorage=false`, so the serverless export/question asset signer does not yet have
the required private storage credential. This must be configured before the runtime asset
risk can be marked green.

## Acceptance state

`docs/lesson-studio-v3-acceptance.md` remains **16/18** until the candidate branch passes
`npm run verify` and its Vercel deployment is verified. PR #112 / CI #2453 is the latest
fully green merged-tree evidence; later main run #2463 failed at the verify step after
new migration work changed repository-derived state.

## Required next release gates

A release candidate should not be declared until all of the following are true:

- `npm run project:state:check` passes.
- `npm run verify` passes on the release candidate SHA.
- Lesson Studio acceptance reaches 18/18, or an intentionally external blocker is recorded.
- `backend/src/database/audits/9618-current-release-state.sql` passes in production.
- `backend/src/database/audits/9618-question-export-readiness.sql` passes in production.
- Production database migration state matches the repository migration head.
- Vercel preview/production smoke verification is recorded for the release SHA.
- `/api/v1/ready` reports `durableStorage=true` before storage-backed exports are declared production-ready.

## Maintaining this manifest

Repository-derived values are checked by:

```bash
npm run project:state:check
```

To refresh the repository-derived fields after migrations or acceptance checklist changes:

```bash
npm run project:state:refresh
```

The refresh command deliberately does **not** invent runtime counts. Runtime values are
manual evidence fields and may be non-null only when `release.runtime_audit.status` is
`verified`.
