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
    "latest_migration": "0159_source_asset_order_sync_v3.sql",
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
      "strict_gate": "detector-v5 full-cue reconciliation + v10 guarded repair + canonical cue-adjacent source asset ordering + post-repair detector rerun",
      "note": "v10 completed 242/242 guarded production repairs across 64 SHA-verified QPs with zero apply failures. The subsequent detector rerun exposed an ordering-only gap for already-referenced repair assets; migration 0159 is the fail-closed correction candidate. Eight legacy detector-v2 source structures remain separately fail-closed until original-source recovery is completed."
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
    "database": "production Supabase has source-fidelity rule-scoping, canonical owner-boundary guards, detector-v4 reconciliation and full-canonical-cue detector v5 through migrations 0155-0158; migration 0159 is the current candidate for deterministic cue-adjacent ordering of already-referenced verified repair assets",
    "storage": "private question-assets bucket is live; v10 wrote only SHA/source-pinned repair assets through guarded service-role flows, and the ordering correction moves existing canonical blocks without duplicating storage objects",
    "worker": "corpus/source-audit workflows and exact uploaded-source accountability are active; v10 production apply completed 64/64 papers and 242/242 rows with zero paper, integrity or apply failures",
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
    "backend/scripts/qp-source-structure-repair-v10.py",
    "scripts/test_source_asset_order_sync_v3.py",
    "scripts/test_9618_2026_source_pipeline.py"
  ]
}
```
<!-- PROJECT_STATE:JSON:END -->

## Current interpretation

The source-fidelity repair remains intentionally **fail closed**. Detector v4/v5 removed the
plural relational-schema false-positive class without hiding genuine printed structures.
The v10 preflight then verified all 64 selected QPs by SHA and reported zero blocked,
provenance or parser failures. Its guarded production apply completed **242/242** repair rows
with **0** paper failures, **0** integrity failures and **0** apply failures.

The first canonical asset sync referenced every recovered storage asset, but the subsequent
detector-v5 rerun exposed a narrower ordering defect: v10 had already appended many verified
asset blocks to `content_json`, while `sync_repaired_source_assets_v2` only repositioned
assets that were not yet referenced. As a result, 149 canonical-adjacency findings had a
verified source asset later in the block list rather than immediately after the source cue.
Fresh production evidence shows every one of those 149 questions has a unique best verified
asset candidate and no ambiguity. Migration `0159_source_asset_order_sync_v3.sql` therefore
moves the existing source-backed asset block without duplication, rechecks source paper/SHA
provenance through `set_question_structured_content_v1`, and resolves a finding only after the
exact adjacency predicate passes.

Eight legacy detector-v2 structures remain separately fail-closed because v10 classified them
as text-boundary repairs even though the source wording still references a printed table or
structure chart. They are not covered up by the ordering migration; they require original-QP
source recovery before the runtime audit can return to `verified`.

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
