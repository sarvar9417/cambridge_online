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
    "latest_migration": "0162_missing_qp_source_ingest.sql",
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
      "target": "production Supabase; syllabus 9618; complete SHA-backed QP inventory",
      "strict_gate": "detector-v6 verified-source coverage + guarded original-source assets + SHA-pinned missing-QP/MS ingest + full source audit",
      "note": "All previously detected source-fidelity gaps in scored 2021-2026 leaves are closed: unresolved fidelity errors=0, unreferenced renderable scored-leaf assets=0 and fidelity-demoted needs_review=0. The final three genuine legacy structures were recovered from original QPs with source paper/SHA/page/bbox provenance. A fresh full source-audit bootstrap then exposed 21 historical SHA-backed QP/MS pairs with zero scored leaves; these are real source-registration-without-ingestion gaps, not duplicate rows. Migration 0162 and qp-source-missing-ingest-v1 provide a fail-closed all-paper parse-before-write path. Deployment remains out of scope until this historical source inventory is ingested and the full audit passes."
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
      "note": "This is the last recorded fully verified main release evidence; newer source-fidelity and corpus-completion candidates are tracked separately until merged and re-audited."
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
    "database": "production Supabase has source-fidelity reconciliation through migration 0161; migration 0162 is the guarded candidate for SHA-registered QP/MS pairs that currently have no scored question leaves",
    "storage": "private question-assets bucket is live; source-fidelity assets remain source-paper/SHA/page/bbox pinned and canonical scored-leaf references are audited",
    "worker": "corpus/source-audit workflows are active; missing-source ingest is plan-only by default and requires every selected QP/MS SHA plus 75-mark parse gate before writes",
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
    "backend/src/database/migrations/0161_source_fidelity_verified_coverage_reconciliation.sql",
    "backend/src/database/migrations/0162_missing_qp_source_ingest.sql",
    "backend/scripts/qp-source-structure-repair-v10.py",
    "backend/scripts/qp-source-missing-ingest-v1.py",
    "scripts/test_source_asset_order_sync_v3.py",
    "scripts/test_source_fidelity_multicue_sync_v4.py",
    "scripts/test_source_fidelity_verified_coverage_v6.py",
    "scripts/test_missing_qp_source_ingest.py",
    "scripts/test_9618_2026_source_pipeline.py"
  ]
}
```
<!-- PROJECT_STATE:JSON:END -->

## Current interpretation

The source-fidelity repair remains intentionally **fail closed**. The initial v10 guarded
production repair completed **242/242** rows across **64/64 SHA-verified QP sources** with
zero paper, integrity or apply failures. A later **32/32** guarded batch across **22/22
SHA-verified QPs** also completed with zero paper, integrity or apply failures. Detector-v6
then reconciled only same-question + same-rule + same-cue findings whose exact SHA-verified
asset remained renderable and referenced; new cues stayed open.

The last three genuine legacy source structures were repaired directly from the original
Cambridge QPs. Production now reports **0 unresolved source-fidelity errors**, **0 unreferenced
renderable scored-leaf source assets**, and **0 questions still demoted solely for source
fidelity** across the audited 2021-2026 scored-leaf scope. The original reported example
`9618/12/O/N/21 Q5(a)` is approved and has canonical text/asset/text/asset blocks.

The subsequent full source-audit bootstrap exposed a separate corpus-inventory problem: **21
historical SHA-backed QP rows have matching SHA-backed MS rows but zero scored leaves**. They
are not duplicate source rows. Migration `0162_missing_qp_source_ingest.sql` and
`qp-source-missing-ingest-v1.py` address only this narrow state. Every selected QP and MS must
be downloaded and SHA-verified, the mark scheme must derive an exact 75-mark leaf map, and the
proven QP parser must parse every leaf before any write is attempted. Inserted leaves and mark
schemes remain `needs_review`; source identity and occurrences are preserved. No deployment is
part of this branch.

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
only be repopulated from fresh production evidence after the complete source-audit sequence closes.
