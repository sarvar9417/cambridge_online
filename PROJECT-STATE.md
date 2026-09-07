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

A repository-only review must **not invent live production counts**. Fields that require
a database, deployment or provider check remain `null` / `runtime_audit_required` until
that evidence is collected.

## Machine-readable state

<!-- PROJECT_STATE:JSON:START -->
```json
{
  "schema_version": 1,
  "state_date": "2026-09-07",
  "release": {
    "branch": "main",
    "evidence_base_sha": "ae2979e2022fdece09cf6fe639bc95cd71e5bce9",
    "maturity": "late_product_integration_and_production_hardening",
    "latest_migration": "0141_9618_ms_source_matcher_v6.sql",
    "corpus_window": {
      "9618_lesson_checkpoints": "2021-2026 through current 2026-2028 targets and explicit compatibility edges",
      "0478_chapter_7_checkpoints": "2015-2026 through curated current-target compatibility",
      "note": "Do not infer a complete production corpus count from the checkpoint windows."
    },
    "corpus_version": "2026 current-target compatibility + source matcher v6 + guarded MS point repair v2",
    "expected_papers": null,
    "complete_papers": null,
    "policy_blocked": null,
    "source_complete_questions": null,
    "runtime_audit": {
      "status": "runtime_audit_required",
      "required_for": [
        "expected_papers",
        "complete_papers",
        "policy_blocked",
        "source_complete_questions",
        "broken_qp_ms_sources"
      ]
    }
  },
  "product": {
    "question_bank": "implemented; source-fidelity and fail-closed rules are active",
    "lesson_studio": "implemented; three supplied-book lessons are source-complete and released on current 2026 targets",
    "assignments": "implemented",
    "submissions": "implemented",
    "marking": "implemented with guarded mark-scheme visibility and source review",
    "reports": "implemented foundation including export/PDF flows",
    "student_flow": "implemented foundation",
    "analytics": "implemented foundation",
    "ai": "assistive layer only; Cambridge source/database/human approval remain authoritative"
  },
  "acceptance": {
    "verify": {
      "command": "npm run verify",
      "current_main": "not_rerun_after_evidence_base_sha"
    },
    "ci": {
      "latest_verified_merged_pr": 114,
      "head_sha": "24db165465639b7dc16dcba6cf469bb3c2985f71",
      "run_number": 2485,
      "conclusion": "success",
      "note": "PR #114 passed the full CI suite before merge; matcher-v6 requires its own green PR evidence before release."
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
    "database": "repository schema reaches migration 0141; production migration state requires runtime verification",
    "storage": "source/asset tooling exists; current durable-provider production state requires runtime verification",
    "worker": "corpus jobs and audit workflows exist; current production worker/provider state requires runtime verification",
    "deployment": "Vercel/Supabase were historically verified; current-main deployment requires fresh verification"
  },
  "evidence_files": [
    "00-README.md",
    "IMPLEMENTATION-STATUS.md",
    "docs/DATA-MASTER-PLAN.md",
    "docs/lesson-studio-v3-acceptance.md",
    "backend/package.json",
    "backend/src/database/migrations/0141_9618_ms_source_matcher_v6.sql"
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
matcher v6 and guarded exact-source point-repair passes without relaxing source identity,
rubric prose or promotion gates.

## Acceptance state

`docs/lesson-studio-v3-acceptance.md` currently contains **16/18 checked items**.
The two remaining acceptance items are operational: a green `npm run verify` and a
Vercel preview/production verification.

The latest explicitly verified merged PR evidence in this manifest is **PR #114**. The
matcher-v6 branch must independently pass its own full CI suite before merge; this file
does not pre-claim that result.

## Corpus state rule

The corpus fields `expected_papers`, `complete_papers`, `policy_blocked` and
`source_complete_questions` are intentionally **not copied from older audit documents**.
They must come from a fresh live production audit after the 2026 additions and current
source-review migrations. Until then, `null` means **unknown pending runtime evidence**,
not zero.

When the live audit is run, update those fields with the audit timestamp, command/run ID
and exact production target so future readers can distinguish a verified count from a
historical snapshot.

## Required next release gates

A release candidate should not be declared until all of the following are true:

- `npm run project:state:check` passes.
- `npm run verify` passes on the release SHA.
- Lesson Studio acceptance reaches 18/18, or any intentionally waived item is documented.
- A fresh current-target production corpus audit fills the four `null` corpus metrics.
- Production database migration state matches the repository migration head.
- Vercel production/preview smoke verification is recorded for the release SHA.
- Source assets used by Question Bank, Lesson Studio and exports are verified against the
  configured durable storage/provider path.

## Maintaining this manifest

Repository-derived values are checked by:

```bash
npm run project:state:check
```

To refresh the repository-derived fields after migrations or acceptance checklist changes:

```bash
npm run project:state:refresh
```

The refresh command deliberately **does not invent live database/deployment metrics**.
Those values remain manual, evidence-backed release fields.
