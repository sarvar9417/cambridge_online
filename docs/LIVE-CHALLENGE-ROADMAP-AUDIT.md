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
| Multi-client PostgreSQL E2E | DONE | Free PostgreSQL 17 harness covers Teacher + Board + Student A/B, dependency closure and negative paths. DB smoke #62/#63 are green on the audited head. |
| Reconnect / missed realtime recovery | DONE | PostgreSQL integration now proves cursor-gap detection, metadata-only realtime events and exact authoritative snapshot recovery while Mark Scheme secrecy is preserved. |
| Browser multi-client E2E | MISSING | Teacher + Board + Student A + Student B browser flow still required. It must use a no-cost environment. |
| Preview | BLOCKED BY RELEASE GATE | Free Vercel Preview may be used, but no paid Supabase branch. Browser/runtime acceptance must not use production DB as a destructive test substitute. |
| Production | BLOCKED | Requires repository gates + browser acceptance + explicit product-owner approval. |

## Immediate execution order

1. Keep CI + Live Challenge DB smoke green while adding the remaining release gate.
2. Prepare the no-cost browser E2E gate and recorded Teacher/Board/Student A/Student B flow.
3. Exercise refresh/reconnect, stale second teacher tab, board safety and source assets in that browser gate.
4. Re-run all repository gates after browser-harness changes.
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
