# CamPath release hardening plan

Updated: 2026-09-07

This plan turns the risks found in the current project review into small, evidence-backed changes. It deliberately avoids a large rewrite. Each stage must leave `main` deployable and must pass `npm run verify` before merge.

## Priority order

### P0 — Repository governance

Goal: make the existing CI gate enforceable at the GitHub branch-policy level.

Required repository setting for `main`:

- require pull requests before merging;
- require the repository `CI / verify` status check;
- require the branch to be up to date before merge where supported;
- block force pushes and branch deletion;
- do not allow direct bypass for routine feature work.

Evidence condition: GitHub reports `main` as protected/ruleset-covered with required status checks enabled.

Status: **blocked on GitHub repository-administration capability**. Issue #124 tracks the exact repository setting and acceptance evidence. The connected repository interface can read rulesets/protection state but cannot create or update them. No documentation or workflow-only substitute is accepted as a fake fix.

### P0 — Canonical closed-loop regression

Goal: protect the product's central academic identity chain from cross-domain drift.

Contract under test:

```text
Question selection
  -> selection basket
  -> published assignment
  -> student attempt
  -> student answer
  -> submission
  -> teacher grading
  -> released result
  -> mastery evidence
```

The regression must prove that the same source question identity remains traceable through the whole HTTP handoff. Repository/service unit tests remain responsible for SQL and authorization details; this test protects the inter-domain contract.

Status: **complete**. PR #122 merged `backend/src/release-learning-loop.integration.test.ts`; merged main SHA `653e4aedef652c644353879bc6e66f1fc3e2b53f` passed CI #2553. The regression remains part of root `npm run verify`.

### P1 — Canonical state evidence cannot be mislabeled as current head

Goal: remove the ambiguity where `PROJECT-STATE.md` could describe a previously verified merge using field names such as `current_main` or `head_sha`, which sound like live-current GitHub state.

Implemented contract:

1. use explicit `last_verified_main` and `verified_sha` semantics;
2. make `project:state:check` reject disagreement between the evidence-base SHA and the recorded verified CI SHA;
3. reject ambiguous legacy keys (`current_main`, `head_sha`);
4. keep live database/deployment facts manual and timestamped — never manufacture runtime evidence from Git history;
5. state clearly that GitHub is authoritative for the live current branch head.

Status: **complete**. PR #123 merged the schema-v2 evidence semantics and fail-closed checker. Its merged main SHA `adb622b1d8eae8ff69e38826b95083801fb0e2a3` passed CI #2566.

Acceptance rule: an older verified SHA may remain recorded after a later merge, but it must be labeled as last verified evidence and can never be presented as the live current head.

### P1 — Data Master Plan v2 alignment

Goal: remove the remaining 2021–2025/current-release ambiguity while preserving the historical document's source hierarchy and Question Bank First philosophy.

Implemented contract:

1. retain the 2021–2025 corpus as historical/base inventory;
2. document the strict 2026 current-target release gate;
3. document historical-question -> current-LO compatibility edges;
4. point current counts to executable audits/`PROJECT-STATE.md` rather than hard-coded historical totals;
5. keep source hierarchy, leaf-question, dependency and fail-closed rules unchanged.

Status: **complete**. PR #125 aligned `docs/DATA-MASTER-PLAN.md`; merged main SHA `bc593689ea3c5a6d3dcdd342266b4b11f0fc27b5` passed CI #2573.

Acceptance: the plan now explicitly separates historical/source-backed inventory from the strict current-target release gate and preserves original source identity across reviewed compatibility mappings.

### P2 — `App.tsx` incremental modularization

Goal: reduce global-component coupling without changing routing, API contracts or UX.

First extraction candidates:

- session/bootstrap and auth-expiry state;
- student attempt timer + heartbeat;
- offline answer queue synchronization;
- staff export polling.

Rules:

- no router rewrite;
- no new state-management framework;
- one behavior extraction per PR;
- preserve existing tests and add focused hook/helper tests where useful.

Status: **in progress**. Offline answer synchronization is the first selected extraction because it has a narrow browser-event/API boundary and existing queue-level regression coverage. It is not counted complete until `App.tsx` is actually simplified and the final integration PR passes `npm run verify`.

Acceptance: `App.tsx` loses orchestration detail while behavior and routes remain unchanged.

### P2 — Lesson Studio side-effect cleanup

Goal: reduce dependence on DOM installers and patch-style side-effect modules.

Steps:

1. inventory each `lesson-*` side-effect import and classify it as CSS-only, DOM behavior, or compatibility shim;
2. move one DOM behavior at a time into explicit React-owned lifecycle;
3. preserve current source-complete rendering and student-facing acceptance contracts;
4. delete a shim only after its replacement has executable regression coverage.

Status: **in progress with first behavior complete**. PR #126 removed import-time auto-installation for `lesson-studio-professional-controls`, bound it to the React Lesson Studio lifecycle, added reference-counted cleanup for global observers/fullscreen listeners, and extended the existing regression for cleanup/remount behavior. Merged main SHA `45557d6be21d52786531db1b8dc5ae383d9f80ac` passed CI #2576. Other DOM enhancers remain intentionally unchanged until handled in separate evidence-backed PRs.

Acceptance: fewer imperative import-time installers with no visual/source-fidelity regression.

## Definition of green

A risk becomes green only when the relevant evidence exists:

- repository policy for governance risks;
- executable test for behavior risks;
- production/runtime audit for live-data risks;
- canonical documentation plus checker for state/documentation risks;
- green `npm run verify` on the final PR SHA.

Vercel deployment/runtime remains a separate external release gate and is not counted as completed by any of the work above.
