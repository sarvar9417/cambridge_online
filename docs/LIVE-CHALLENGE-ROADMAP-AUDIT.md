# Cambridge Live Challenge — Workspace Roadmap Audit

Audit date: 2026-09-21
Branch: `feature/live-challenge-convergence-phase1`
Canonical base: current `main`

This is the execution checklist for the approved Workspace plan. It reconciles the Master Plan and Convergence Plan with the current branch.

## Ordered roadmap

| Work item | Status | Evidence / remaining gate |
| --- | --- | --- |
| Draft create | DONE | Canonical `live_exam_*` draft lifecycle and builder API. |
| Manual / Auto selection | DONE | Canonical eligible pool, manual replacement, deterministic auto selection, required Cambridge dependency closure. |
| Reorder / Remove | DONE | Ordered replacement remains the draft mutation primitive; dependency bundle is preserved. |
| Publish | DONE | Revalidates eligibility, refreshes immutable question/MS snapshots, allocates join code, records requested/dependency counts. |
| CAS transition guards | DONE | Draft and teacher lifecycle mutations use locked `expectedVersion` checks; versionless staff fallbacks are retired. |
| Answer Lock | DONE | Explicit `answers_locked` state; Mark Scheme reveal is a separate transition. |
| Pause / Resume | DONE | Persisted pause source state and timed-question preservation. |
| Marking / Moderation | DONE | Teacher/peer/self marking, DB no-self peer integrity, fail-closed unsafe peer mode, reasoned audited overrides and override policy. |
| Student / Board UX | DONE | Safe student feed, canonical runtime, dedicated board projection and board-safe marks-first standings. |
| Analytics | DONE | LO evidence/history, round summaries, strongest/weakest LO and supported missed-mark-point analysis. |
| Multi-client PostgreSQL E2E | RETEST | Free PostgreSQL 17 harness covers Teacher + Board + Student A/B and negative paths. Dependency-aware builder changes required the current contract/fixture alignment; this must return green. |
| Reconnect / missed realtime recovery | IN PROGRESS | Realtime is notification-only and snapshots are authoritative. A real cursor-gap → authoritative snapshot recovery assertion is being added to the PostgreSQL gate. |
| Browser multi-client E2E | MISSING | Teacher + Board + Student A + Student B browser flow still required. It must use a no-cost environment. |
| Preview | BLOCKED BY RELEASE GATE | Free Vercel Preview may be used, but no paid Supabase branch. Browser/runtime acceptance must not use production DB as a destructive test substitute. |
| Production | BLOCKED | Requires repository gates + browser acceptance + explicit product-owner approval. |

## Immediate execution order

1. Restore CI + Live Challenge DB smoke to green after the dependency-aware builder convergence.
2. Prove missed realtime event / reconnect recovery with the real PostgreSQL integration harness.
3. Re-run all free repository gates and fix any regression.
4. Prepare the no-cost browser E2E gate and recorded Teacher/Board/Student A/Student B flow.
5. Stop at the production boundary and request explicit release approval.

## Non-negotiable invariants

- One canonical `live_exam_*` runtime.
- PR #217 is donor/spec only; never wholesale merge.
- Canonical Cambridge question identity, required dependencies, source fidelity and immutable snapshots are preserved.
- No Mark Scheme before answer lock.
- No self-marking in peer mode.
- Database/server state remains authoritative after refresh/reconnect.
- Learner/board projections are safe by construction.
- Teacher overrides are policy-controlled and audited.
- Marks drive mastery; speed does not.
- No paid work.
- No production migration, merge or deployment without explicit approval.
