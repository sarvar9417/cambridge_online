# CamPath release hardening plan

Updated: 2026-09-07

This plan turns the risks found in the current project review into small, evidence-backed changes. It deliberately avoids a large rewrite. Each application-code stage leaves `main` deployable and passes `npm run verify` before it is treated as complete.

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

Status: **externally blocked on GitHub repository-administration capability**. Issue #124 tracks the exact repository setting and acceptance evidence. The connected repository interface can read rulesets/protection state but cannot create or update them. No documentation or workflow-only substitute is accepted as a fake fix.

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

The regression proves that the same source question identity remains traceable through the whole HTTP handoff. Repository/service unit tests remain responsible for SQL and authorization details; this test protects the inter-domain contract.

Status: **complete**. PR #122 merged `backend/src/release-learning-loop.integration.test.ts`; the regression remains part of root `npm run verify` and is included in the final application hardening verification on main CI #2673.

### P1 — Canonical state evidence cannot be mislabeled as current head

Goal: remove the ambiguity where `PROJECT-STATE.md` could describe a previously verified merge using field names such as `current_main` or `head_sha`, which sound like live-current GitHub state.

Implemented contract:

1. use explicit `last_verified_main` and `verified_sha` semantics;
2. make `project:state:check` reject disagreement between the evidence-base SHA and the recorded verified CI SHA;
3. reject ambiguous legacy keys (`current_main`, `head_sha`);
4. keep live database/deployment facts manual and timestamped — never manufacture runtime evidence from Git history;
5. state clearly that GitHub is authoritative for the live current branch head.

Status: **complete**. PR #123 merged the schema-v2 evidence semantics and fail-closed checker. The checker remains green in final main CI #2673.

Acceptance rule: an older verified SHA may remain recorded after a later documentation-only merge, but it must be labeled as last verified evidence and can never be presented as the live current head.

### P1 — Data Master Plan v2 alignment

Goal: remove the remaining 2021–2025/current-release ambiguity while preserving the historical document's source hierarchy and Question Bank First philosophy.

Implemented contract:

1. retain the 2021–2025 corpus as historical/base inventory;
2. document the strict 2026 current-target release gate;
3. document historical-question -> current-LO compatibility edges;
4. point current counts to executable audits/`PROJECT-STATE.md` rather than hard-coded historical totals;
5. keep source hierarchy, leaf-question, dependency and fail-closed rules unchanged.

Status: **complete**. PR #125 aligned `docs/DATA-MASTER-PLAN.md`; the strict current-target versus historical/source-backed distinction remains part of the canonical project-state contract.

### P2 — `App.tsx` incremental modularization

Goal: reduce global-component coupling without changing routing, API contracts or UX.

Completed extractions:

- **PR #130** — offline answer synchronization moved into `useOfflineAnswerSync`;
- **PR #131** — student attempt countdown + heartbeat lifecycle moved into `useAttemptTiming`;
- **PR #132** — queued/running staff export polling moved into `useStaffExportPolling`;
- **PR #134** — startup refresh + auth-expiry subscription moved into `useSessionLifecycle`.

Rules preserved throughout:

- no router rewrite;
- no new state-management framework;
- behavior moved in small PRs;
- existing API/route/UX contracts retained;
- focused regression tests added for each extracted lifecycle.

Status: **complete for the scoped hardening plan**. The final application-hardening main SHA `f3011e88bd3cd7fc59d11346815e306e2a2cd11f` passed CI **#2673**. `App.tsx` still owns product-level orchestration by design, but the four browser/session lifecycles identified by the review no longer live as global component effects.

### P2 — Lesson Studio side-effect cleanup

Goal: reduce dependence on import-time DOM installers and bind global observers/listeners to a React owner.

Completed lifecycle conversions:

1. **PR #126** — professional navigation controls moved from import-time installation to React-owned install/cleanup;
2. **PR #133** — question-workspace audience/projector controls moved to an explicit reference-counted lifecycle;
3. **PR #137** — the remaining audited import-time `lesson-exam-workspace-v3` and `lesson-exam-insights` MutationObservers became side-effect-free imports with explicit reference-counted cleanup owned by `LessonStudio`.

Regression coverage now proves import-without-effects, install, cleanup, idempotent release and reinstall behavior while preserving source-complete rendering, exact question resolution, mark-scheme trust/reveal behavior and the formal Book Completeness Audit.

Status: **complete for the inventoried import-time installer risk**. PR #137 merged as main SHA `f3011e88bd3cd7fc59d11346815e306e2a2cd11f`; main CI **#2673** completed successfully.

### P1 — Vercel durable question-asset storage

Goal: ensure the production serverless runtime can access durable private source assets for runtime rendering/export rather than relying only on database/storage audits performed outside that runtime.

Status: **externally blocked on Vercel environment configuration** and tracked in issue #135. Fresh production readiness still returns `status=ok`, `database=ok`, but `capabilities.durableStorage=false`. The code and production storage inventory are source-safe/fail-closed; the missing Vercel runtime credential/configuration must not be hidden by making the private bucket public.

Acceptance evidence for issue #135:

- intended production deployment is READY;
- `GET /api/v1/ready` returns `capabilities.durableStorage=true`;
- a private source-backed asset can be rendered/exported through the application runtime;
- no storage secret is committed to Git or exposed to the browser.

## Definition of green

A risk becomes green only when the relevant evidence exists:

- repository policy for governance risks;
- executable test for behavior risks;
- production/runtime audit for live-data risks;
- canonical documentation plus checker for state/documentation risks;
- green `npm run verify` on the final code SHA.

As of the final code-hardening merge, **application-code risks in this plan are green**. Two infrastructure-admin gates remain deliberately non-green rather than being papered over: GitHub branch protection (#124) and Vercel durable runtime storage (#135). Vercel release-SHA deployment/smoke evidence is also recorded separately in `PROJECT-STATE.md` and the Lesson Studio acceptance checklist.
