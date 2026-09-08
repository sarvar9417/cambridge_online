# CamPath canonical project state

Updated: 2026-09-08

This file is the **single current-state manifest** for `sarvar9417/cambridge_online`.
Executable code, migrations and fresh runtime evidence take precedence over older snapshots.

## Truth policy

1. **`PROJECT-STATE.md`** — current release state and unresolved runtime evidence.
2. Executable code, migrations, tests and current CI evidence.
3. Domain plans and acceptance documents.
4. Historical snapshots such as `IMPLEMENTATION-STATUS.md`.

The recorded `release.evidence_base_sha` is the last explicitly verified merged-main commit,
not a claim that it is the live branch head.

## Machine-readable state

<!-- PROJECT_STATE:JSON:START -->
```json
{
  "schema_version": 2,
  "state_date": "2026-09-08",
  "release": {
    "branch": "main",
    "evidence_base_sha": "58c43183940b7e2b1d8352b672c3393aaf542648",
    "maturity": "late_product_integration_and_production_hardening",
    "latest_migration": "0160_source_fidelity_multicue_asset_sync.sql",
    "corpus_window": {
      "9618_lesson_checkpoints": "2021-2026 through current 2026-2028 targets and explicit compatibility edges",
      "0478_chapter_7_checkpoints": "2015-2026 through curated current-target compatibility",
      "note": "Historical/source-backed inventory is broader than the strict current-target release gate."
    },
    "corpus_version": "canonical question/source occurrences + SHA-pinned source fidelity + guarded structured assets",
    "expected_papers": null,
    "complete_papers": null,
    "policy_blocked": null,
    "source_complete_questions": null,
    "runtime_audit": {
      "status": "pending_reverification",
      "audited_at": null,
      "target": "production Supabase; syllabus 9618; 2021-2026 source-fidelity backlog",
      "strict_gate": "detector-v5 full-cue reconciliation + v10 guarded repair + exact multi-cue source asset binding + post-repair detector rerun",
      "note": "The initial v10 production repair completed 242/242 rows across 64 SHA-verified QPs with zero apply failures. Migration 0159 then moved 149 existing verified source assets to their first canonical cue. Five remaining detector-v2 structures were recovered from original QPs with source paper/SHA/page/bbox provenance. A fresh v10 plan now reports 32/32 remaining canonical multi-cue repairs across 22 SHA-verified QPs with blocked=0, paperFailures=0 and integrityFailures=0. Migration 0160 is the fail-closed exact assetId + cueOrdinal synchronisation candidate; deployment remains out of scope until runtime reverification closes."
    }
  },
  "product": {
    "question_bank": "implemented; source-grounded question identity and guarded source-fidelity rules are active",
    "lesson_studio": "implemented; source-backed lesson workflow is active and import-time global DOM enhancers use explicit React lifecycle cleanup",
    "assignments": "implemented",
    "submissions": "implemented",
    "marking": "implemented with guarded mark-scheme visibility and source review",
    "reports": "implemented foundation including PDF/DOCX export flows with frozen selection snapshots",
    "student_flow": "implemented foundation; targeted practice fails closed when the approved pool is insufficient",
    "analytics": "implemented foundation",
    "ai": "assistive layer only; Cambridge source/database/human approval remain authoritative"
  },
  "acceptance": {
    "verify": {
      "command": "npm run verify",
      "last_verified_main": "merged PR #136 main SHA 58c43183940b7e2b1d8352b672c3393aaf542648 passed CI run 2721"
    },
    "ci": {
      "latest_verified_merged_pr": 136,
      "verified_sha": "58c43183940b7e2b1d8352b672c3393aaf542648",
      "run_number": 2721,
      "conclusion": "success",
      "note": "This is the last recorded fully verified main release evidence; newer source-fidelity hardening candidates are tracked separately until merged and re-audited."
    },
    "lesson_studio": {
      "checked": 17,
      "total": 18,
      "pending": 1,
      "pending_items": [
        "Vercel preview / production deployment — verify after provider rate-limit window and durable-storage configuration."
      ]
    }
  },
  "infrastructure": {
    "database": "production Supabase already has source-fidelity rule-scoping, owner-boundary guards, detector v4/v5 reconciliation and source asset ordering through migration 0159; migration 0160 is the current candidate for exact multi-cue assetId/cueOrdinal binding before final runtime verification",
    "storage": "private question-assets bucket is live; source-fidelity assets remain SHA/source-pinned and canonical synchronisation reuses verified assets where possible without duplicate storage objects",
    "worker": "corpus/source-audit workflows and exact uploaded-source accountability are active; fresh remaining v10 plan covers 32 canonical multi-cue repairs across 22 SHA-verified QPs with zero blocked, paper or integrity failures",
    "deployment": "application deployment remains a separate external gate; corpus repair does not assume a Vercel release is current"
  },
  "evidence_files": [
    "00-README.md",
    "docs/DATA-MASTER-PLAN.md",
    "docs/lesson-studio-v3-acceptance.md",
    "backend/src/database/migrations/0152_source_fidelity_detector_v3.sql",
    "backend/src/database/migrations/0155_source_asset_rule_scoped_resolution.sql",
    "backend/src/database/migrations/0156_source_fidelity_owner_boundary_guard.sql",
    "backend/src/database/migrations/0157_source_fidelity_detector_v4_reconciliation.sql",
    "backend/src/database/migrations/0158_source_fidelity_full_cue_reconciliation.sql",
    "backend/src/database/migrations/0159_source_asset_order_sync_v3.sql",
    "backend/src/database/migrations/0160_source_fidelity_multicue_asset_sync.sql",
    "backend/scripts/qp-source-structure-repair-v10.py",
    "scripts/test_source_asset_order_sync_v3.py",
    "scripts/test_source_fidelity_multicue_sync_v4.py",
    "scripts/test_9618_2026_source_pipeline.py"
  ]
}
```
<!-- PROJECT_STATE:JSON:END -->

## Current interpretation

The source-fidelity repair remains intentionally **fail closed**. Detector v4/v5 removed the
plural relational-schema false-positive class without hiding genuine printed structures. The
initial v10 guarded production repair completed **242/242** rows across **64/64 SHA-verified
QP sources** with **0 paper failures**, **0 integrity failures** and **0 apply failures**.

Migration `0159_source_asset_order_sync_v3.sql` then corrected the first canonical ordering
gap by moving **149** existing verified source asset blocks after their introducing source cue.
The remaining detector-v2 backlog was reduced to five real printed structures and those five
were recovered from their original Cambridge QPs with source paper ID, SHA-256, page and crop
geometry preserved. The legacy detector-v2 source-fidelity backlog is therefore closed.

The current remaining work is narrower: detector-v5 identifies **32 canonical multi-cue
findings** where a question contains more than one genuine source table/visual cue. A fresh
v10 plan covers **32/32** rows across **22/22 SHA-verified QPs** with `blocked=0`,
`paperFailures=0` and `integrityFailures=0`. Migration
`0160_source_fidelity_multicue_asset_sync.sql` binds each resolved finding to the exact
verified repair `assetId` and the exact detector `cueOrdinal`, rechecks source paper/SHA
provenance, and fails closed if the asset is missing, unrenderable, or not adjacent after the
move. No deployment is part of this repair branch.

## Remaining external release/admin gates

- **Vercel deployment:** verify the serving release separately from corpus correctness.
- **Durable runtime storage:** `/api/v1/ready` must report durable storage before final release acceptance.
- **GitHub governance:** main-branch protection remains an administrative gate.

## Maintaining this manifest

```bash
npm run project:state:check
npm run project:state:refresh
```

Runtime counts remain null while `release.runtime_audit.status` is not `verified`; they must
only be repopulated from fresh production evidence after the source-fidelity sequence closes.
