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

Note: this is a repository administration setting, not an application-code change. It must not be faked with documentation or a permissive workflow workaround.

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

Status: **in progress** in `backend/src/release-learning-loop.integration.test.ts`.

### P1 — Canonical state evidence cannot silently lag `main`

Goal: remove the current mismatch where `PROJECT-STATE.md` can describe a previously verified merge rather than the actual current head.

Steps:

1. extend `scripts/project-state.mjs` so repository-derived evidence can distinguish `verified_sha` from `current_head_sha`;
2. make `project:state:check` reject impossible claims such as a current-head CI claim for a different SHA;
3. keep live database/deployment facts manual and timestamped — never manufacture runtime evidence from Git history;
4. update the manifest schema/documentation accordingly.

Acceptance: the manifest may intentionally say "current head not runtime-verified", but it may not silently present an older SHA as the current verified head.

### P1 — Data Master Plan v2 alignment

Goal: remove the remaining 2021–2025/current-release ambiguity while preserving the historical document's source hierarchy and Question Bank First philosophy.

Steps:

1. retain the 2021–2025 corpus as historical/base inventory;
2. explicitly document the strict 2026 current-target release gate;
3. document historical-question -> current-LO compatibility edges;
4. point all current counts to executable audits/`PROJECT-STATE.md` rather than hard-coded historical totals;
5. keep source hierarchy, leaf-question, dependency and fail-closed rules unchanged.

Acceptance: a reader cannot confuse historical inventory coverage with the strict current-target release scope.

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

Acceptance: `App.tsx` loses orchestration detail while behavior and routes remain unchanged.

### P2 — Lesson Studio side-effect cleanup

Goal: reduce dependence on DOM installers and patch-style side-effect modules.

Steps:

1. inventory each `lesson-*` side-effect import and classify it as CSS-only, DOM behavior, or compatibility shim;
2. move one DOM behavior at a time into explicit React components/hooks;
3. preserve current source-complete rendering and student-facing acceptance contracts;
4. delete a shim only after its replacement has executable regression coverage.

Acceptance: fewer imperative DOM installers with no visual/source-fidelity regression.

## Definition of green

A risk becomes green only when the relevant evidence exists:

- repository policy for governance risks;
- executable test for behavior risks;
- production/runtime audit for live-data risks;
- canonical documentation plus checker for state/documentation risks;
- green `npm run verify` on the final PR SHA.

Vercel deployment/runtime remains a separate external release gate and is not counted as completed by any of the work above.
