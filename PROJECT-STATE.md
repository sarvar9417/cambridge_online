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
    "latest_migration": "0158_source_fidelity_full_cue_reconciliation.sql",
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
      "strict_gate": "detector-v5 full-cue reconciliation + v10 zero-block preflight + guarded apply + canonical asset sync + post-repair detector rerun",
      "note": "The previous release audit predates the newly discovered canonical table/visual fidelity backlog and must not be treated as current until this repair sequence completes."
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
    "database": "production Supabase has source-fidelity rule-scoping, canonical owner-boundary guards and detector-v4 reconciliation through migrations 0155-0157; full-canonical-cue reconciliation migration 0158 is the current candidate pending CI and explicit application",
    "storage": "private question-assets bucket is live; all new fidelity assets remain SHA/source-pinned and are written only through guarded service-role repair flows",
    "worker": "corpus/source-audit workflows and exact uploaded-source accountability are active; v10 is the current repair candidate",
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
    "backend/scripts/qp-source-structure-repair-v10.py",
    "scripts/test_9618_2026_source_pipeline.py"
  ]
}
```
<!-- PROJECT_STATE:JSON:END -->

## Current interpretation

The source-fidelity repair is intentionally **fail closed**. A v9 production preflight
verified all selected QP sources by SHA but exposed two remaining classes of risk:
plural relational-schema prose was being misclassified as a printed table, and a small set
of legitimate source structures still needed stricter owner/geometry recovery.

Migration `0157_source_fidelity_detector_v4_reconciliation.sql` introduced the narrow
plural-schema reconciliation and explicit patterns for real source tables/matching layouts.
The first production v4 sweep then proved that some historical `details.cue` excerpts end
before the discriminating `following tables` phrase. Migration
`0158_source_fidelity_full_cue_reconciliation.sql` therefore performs the same decision from
the exact `content_json` block identified by `cueOrdinal`, then re-evaluates true tables and
matching layouts so a stale parent false-positive cannot mask a real child structure.
`qp-source-structure-repair-v10.py` keeps all SHA/source/rule/review guards while preventing
numeric data rows from aliasing Cambridge question labels and recovering source segments only
from explicit structure cues.

No broad production corpus write should occur until candidate CI passes, migration 0158 is
applied, the 2021-2026 detector sweep is rerun, and v10 reports zero provenance/parser
failures and zero blocked source structures. After guarded apply, repaired assets must be
synchronised into canonical `content_json`, the detector rerun must return zero unresolved
fidelity errors, and representative questions such as `9618/12/O/N/21 Q5(a)` must be
visually checked against the original Cambridge QP.

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
