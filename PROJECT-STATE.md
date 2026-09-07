# CamPath canonical project state

Updated: 2026-09-07

This file is the **single current-state manifest** for `sarvar9417/cambridge_online`.
Requirements, historical audits and implementation snapshots remain useful evidence, but
must not be treated as current release state when they disagree with this file.

## Truth policy

Use this order when deciding what is current:

1. **`PROJECT-STATE.md`** — current product/release status and unresolved runtime evidence.
2. Executable code, migrations, tests and current CI evidence.
3. Domain plans and acceptance documents.
4. Historical snapshots such as `IMPLEMENTATION-STATUS.md` and older audit reports.

Live production values below are recorded only when freshly verified. The recorded
`release.evidence_base_sha` is the last explicitly verified merged-main commit, not a
claim that it is GitHub's live branch head.

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
    "latest_migration": "0152_distinctness_ledger_reconcile.sql",
    "corpus_window": {
      "9618_lesson_checkpoints": "2021-2026 through current 2026-2028 targets and explicit compatibility edges",
      "0478_chapter_7_checkpoints": "2015-2026 through curated current-target compatibility",
      "note": "Historical/source-backed inventory is broader than the strict current-target release gate."
    },
    "corpus_version": "canonical question/source occurrences + source-verified exact-equivalence cleanup + source-verified distinctness decisions + current-target compatibility",
    "expected_papers": 12,
    "complete_papers": 12,
    "policy_blocked": 0,
    "source_complete_questions": 317,
    "runtime_audit": {
      "status": "verified",
      "audited_at": "2026-09-07T11:07:58Z",
      "target": "production Supabase; syllabus 9618; canonical physical questions plus all official source occurrences",
      "strict_gate": "occurrence-aware structural/export/canonical-equivalence postconditions plus strict 2026 source gate",
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
    "question_bank": "implemented; canonical question identity, official source-occurrence provenance, source-fidelity and fail-closed duplicate rules are active",
    "lesson_studio": "implemented; three supplied-book lessons are source-complete and released on current 2026 targets; all inventoried import-time global DOM enhancers use explicit React-owned lifecycle cleanup",
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
      "note": "Current application hardening includes the closed-loop release regression, explicit state semantics, current-target source accountability, focused App hooks and React-owned Lesson Studio DOM lifecycles. The canonical corpus PR must pass CI and merge before last-verified-main evidence advances."
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
    "database": "production Supabase is realized and application-ledgered through repository migration 0152; canonical source-occurrence identity, guarded source-verified merges, semantic canonicalization, canonical structured backfill, verified distinctness decisions and replay-safe ledger reconciliation are live",
    "storage": "private question-assets bucket is live; post-canonicalization production audit verifies 2773/2773 canonical mark-bearing 9618 leaves are staff-searchable, 398/398 canonical assets are renderable with zero missing storage objects, while 3302 official Cambridge leaf occurrences remain represented; Vercel readiness still reports durableStorage=false and is tracked by issue #135",
    "worker": "corpus/source-audit workflows and exact uploaded-source accountability exist; future ingestion preserves canonical question identity and fails closed on unverified equivalence",
    "deployment": "last explicitly verified merged application evidence is PR #137 SHA f3011e88bd3cd7fc59d11346815e306e2a2cd11f with CI #2673 success. A Vercel release attempt was provider-rate-limited before build; latest READY production remains older and durableStorage=false, so deployment acceptance remains a separate external gate"
  },
  "evidence_files": [
    "00-README.md",
    "IMPLEMENTATION-STATUS.md",
    "docs/DATA-MASTER-PLAN.md",
    "docs/lesson-studio-v3-acceptance.md",
    "docs/RELEASE-HARDENING-PLAN.md",
    "backend/package.json",
    "backend/src/release-learning-loop.integration.test.ts",
    "backend/src/database/migrations/0144_question_occurrence_identity.sql",
    "backend/src/database/migrations/0145_verified_source_canonical_merge.sql",
    "backend/src/database/migrations/0146_fix_verified_source_merge_syllabus_resolution.sql",
    "backend/src/database/migrations/0147_canonicalize_verified_9618_equivalent_variants.sql",
    "backend/src/database/migrations/0148_canonicalize_2024_mj_p3_semantic_equivalence.sql",
    "backend/src/database/migrations/0149_canonical_structured_backfill_bootstrap.sql",
    "backend/src/database/migrations/0150_canonical_occurrence_ledger_reconcile.sql",
    "backend/src/database/migrations/0151_source_variant_distinctness_reviews.sql",
    "backend/src/database/migrations/0152_distinctness_ledger_reconcile.sql",
    "backend/src/database/audits/question-source-occurrence-equivalence.sql",
    "backend/src/database/audits/9618-corpus-completion.sql",
    "backend/src/database/audits/9618-question-export-readiness.sql",
    "backend/src/database/question-source-identity-cleanup-migration.test.ts",
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

### Product and corpus state

CamPath remains a source-grounded Cambridge Computer Science teaching platform. Cambridge
source provenance, production database rules and guarded approval remain authoritative;
AI is assistive only.

Question identity is now canonical rather than paper-row identity. When Cambridge reuses
exact assessed content across variants, one physical question tree is retained and every
real paper appearance remains represented by `question_source_occurrences`. A physical
merge is allowed only after source verification. Same-shape pairs verified as materially
different remain separate and their decision is persisted in
`source_paper_distinctness_reviews`.

Fresh production postconditions verify:

- **2773** canonical physical mark-bearing 9618 questions.
- **3302** official Cambridge mark-bearing leaf occurrences preserved.
- **130** official QP sources remain structurally complete at **75 marks** with matching
  **75-mark** MS totals and **0 structural failures**.
- **0** source-verified exact aliases still own a duplicate physical question tree.
- **4** remaining same-shape pairs are source-verified distinct; **0 unresolved**
  same-shape candidates remain.
- **398/398** canonical assets are renderable and **0** referenced private storage objects
  are missing.
- **2773/2773** canonical mark schemes are present/exportable.

The strict current 2026 release scope remains **12 QP papers, 12 MS papers and 317
mark-bearing source-complete questions**, with zero blocked source/dependency failures.

### Application hardening state

The App lifecycle extraction work and Lesson Studio import-time side-effect cleanup remain
intact from the current main line. The release-level selection-to-mastery regression and
source-accountability contracts remain part of `npm run verify`; the canonical occurrence
regression now checks the new one-tree/many-occurrences model rather than the superseded
physical-cross-variant-row model.

### Migration ledger state

The application migration ledger is reconciled through
`0152_distinctness_ledger_reconcile.sql`. Migrations 0144-0149 introduce canonical
source-occurrence identity, guarded exact-source merge mechanics, verified physical
cleanup, 2024 M/J Paper 3 semantic canonicalization and canonical structured backfill.
Migration 0150 baselines those filenames only after durable postconditions pass. Migration
0151 persists four source-verified distinct same-shape decisions; 0152 verifies those
postconditions and closes replay risk. Production has corresponding application-ledger
entries through 0152.

## Remaining external release/admin gates

These are separate from the canonical corpus cleanup and are not represented as database
or application-code defects:

- **Vercel deployment:** the verified release deployment attempt was rejected by the
  provider's build-rate limit before build. Retry after the provider window opens and
  smoke the serving release before checking Lesson Studio 18/18.
- **Vercel durable storage — issue #135:** configure server-only runtime storage until
  `/api/v1/ready` reports `capabilities.durableStorage=true`, then verify a private
  source-backed render/export path.
- **GitHub governance — issue #124:** protect `main` with PR + required `CI / verify` and
  block force pushes/deletion when repository administration capability is available.

## Maintaining this manifest

Repository-derived fields are checked with:

```bash
npm run project:state:check
```

and refreshed with:

```bash
npm run project:state:refresh
```

The checker requires `release.evidence_base_sha` and `acceptance.ci.verified_sha` to match,
requires the recorded CI conclusion to be successful, and requires the human-readable
`last_verified_main` value to name the exact SHA and CI run. Runtime/deployment evidence
must remain explicit and evidence-backed rather than inferred from repository state.
