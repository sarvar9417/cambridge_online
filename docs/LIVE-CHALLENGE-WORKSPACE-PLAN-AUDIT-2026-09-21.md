# Live Challenge Workspace Plan Audit — 2026-09-21

Status: implementation resumed from the approved Workspace roadmap. This audit records the current feature branch state before reconciling it with the latest `main`.

Approved implementation order:

`Draft Create → Manual/Auto Selection → Reorder/Remove → Publish → CAS transition guards → Answer Lock → Pause/Resume → Marking/Moderation → Student/Board UX → Analytics → Multi-client E2E → Preview → Production`

## Current status by roadmap item

| Roadmap item | Status | Current evidence / next action |
| --- | --- | --- |
| Draft create | DONE | Builder service and builder UI create a draft without allocating a room code. |
| Manual / auto selection | DONE | Manual replacement and deterministic auto-selection are implemented. |
| Reorder / remove | DONE | Draft question list can be replaced/reordered/removed behind expected-version guards. |
| Publish | DONE | Publish revalidates eligibility, refreshes immutable snapshots and allocates the six-digit code. |
| CAS transition guards | DONE for converged staff controls | Builder/control/moderation mutations use expected version after locking. Generic versionless staff mutation fallbacks were retired. |
| Explicit Answer Lock | DONE | `question_open → answers_locked → marking`; Mark Scheme remains hidden during `answers_locked`. |
| Pause / Resume | DONE | Explicit paused state restores the prior phase and preserves timed-question remaining duration. |
| Marking / Moderation | DONE | Teacher/peer/self review flow, peer no-self guard, moderation reason and audit evidence are implemented. |
| Student UX | DONE foundation | Dedicated learner-safe student feed, answer/review/result/history flow and reconnect-aware runtime exist. |
| Board UX | DONE foundation | Dedicated learner-safe board projection and board route exist; internal IDs/teacher-private data are allowlisted out. |
| Analytics | DONE foundation | Finished-session learning evidence and teacher analytics service/routes exist; marks remain authoritative. |
| Multi-client DB E2E | DONE, zero-cost | Ephemeral PostgreSQL integration covers Teacher + Board + Student A + Student B and important failure paths. |
| Browser multi-client E2E | PENDING | Required final browser gate with four clients. |
| Preview runtime acceptance | PENDING | Must happen after repository/main convergence. |
| Production migration / merge / deploy | BLOCKED BY APPROVAL | Never performed from this branch without explicit user approval. |

## Newly discovered convergence blocker

Latest `main` is now ahead of the last branch sync and contains three additional product-integration commits. The latest main work materially affects Live Challenge:

- current main migration line reaches `0190_live_challenge_subtopic_evidence_fallback.sql`;
- main added `0172_unified_live_challenge_controls.sql` and `0173_live_challenge_database_hardening.sql`;
- main closed the 9618 product-consumption gate and now preserves required question dependencies in Live Challenge;
- main added stable-subtopic analytics fallback for source-faithful historical questions.

The feature branch also has migrations numbered 0172 and 0173. They are different migrations. Therefore the branch must **not** be merged as-is.

## Required reconciliation before further product work

1. Sync the three latest main commits into the feature branch without losing the converged builder/control/moderation/student/board architecture.
2. Renumber the branch-only lifecycle and override-reason migrations after current main (target: 0191/0192) and update all migration tests/smoke references.
3. Preserve main's latest corpus/product changes, especially required-question dependency bundles and 0190 stable-subtopic learning evidence fallback.
4. Keep the approved Live Challenge invariants that are stricter than the interim main implementation:
   - explicit `answers_locked` before Mark Scheme reveal;
   - mandatory CAS for staff lifecycle mutations;
   - no versionless staff fallback routes;
   - learner-safe board/student surfaces;
   - marks-first ranking with no speed contribution to mastery;
   - no parallel Live Challenge schema.
5. Re-run full CI and the zero-cost PostgreSQL multi-client integration after reconciliation.
6. Only after all repository gates are green, proceed to browser Preview E2E.

## Immediate next work

The next implementation slice is **main reconciliation + migration renumbering + dependency-preserving source fidelity**. Browser Preview remains later in the approved order, and production remains untouched.
