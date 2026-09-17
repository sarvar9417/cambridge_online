# Cambridge Live Challenge — Convergence Plan

Status: Active implementation plan
Branch: `integration/live-challenge-convergence-20260917`
Canonical base: current `main`
Legacy feature source: PR #217 / `integration/live-challenge-20260915`

## Goal

Produce one production-grade Cambridge Live Challenge subsystem by keeping the current `live_exam_*` persistence, security, realtime, leaderboard and learning-evidence foundation, while selectively porting the stronger builder, lifecycle, board projection, moderation controls and student-history capabilities from PR #217.

The final product must expose one teacher workflow, one student workflow, one board projection and one authoritative database-backed state machine. No second editable question bank and no parallel `live_challenge_*` production persistence model will be introduced.

## Canonical architecture decisions

1. `live_exam_*` remains the persistence namespace and source of truth.
2. `/api/v1/live-exams` remains the canonical HTTP namespace during convergence; product copy will say **Cambridge Live Challenge**.
3. Existing canonical question IDs, immutable question snapshots and immutable Mark Scheme snapshots remain authoritative.
4. Current DB-level peer-integrity, teacher-override audit, LO evidence persistence and marks-first ranking remain mandatory.
5. Current event-cursor + authoritative snapshot recovery remains the realtime model.
6. PR #217 is a feature donor only. It is not merged wholesale because it diverged from current `main` and carries a conflicting migration lineage.
7. Preview/browser E2E remains the final gate after repository-level convergence and CI are complete.

## Convergence matrix

| Capability | Current `main` | PR #217 | Final decision |
| --- | --- | --- | --- |
| Canonical Cambridge question identity | Strong | Strong | Keep current main |
| Immutable question / Mark Scheme snapshots | Strong | Strong | Keep current main |
| Source-complete eligible pool | Partial auto-selection contract | Strong explicit builder pool | Port strict builder pool |
| Draft builder | Missing | Strong | Port to `live_exam_*` |
| Manual question selection | Missing | Strong | Port |
| Auto selection | Present, direct session creation | Strong draft-aware selection | Converge |
| Publish step | Missing | Strong | Port |
| Lobby | Present | Present | Keep current main and enrich |
| Pause / resume | Missing | Present | Port |
| Late join setting | Missing | Present | Port |
| Auto-close on all submitted | Missing | Present | Port |
| Answer locking | Coupled to reveal | Explicit | Split into explicit server state |
| Mark Scheme secrecy | Strong | Strong | Keep current main invariant |
| DB-level no-self-marking | Stronger | Strong | Keep current main DB guard |
| Teacher moderation | Present | Richer controls | Merge controls into current path |
| Override audit | Strong append-only DB evidence | Present | Keep current main |
| Board projection | UI projection from staff snapshot | Dedicated safe projection | Port dedicated safe endpoint |
| Realtime/reconnect | Strong cursor + forced snapshot recovery | Event polling/state | Keep current main |
| Round leaderboard | Strong marks-first | Present | Keep current main |
| Score distribution | Present via round summary | Present | Keep/merge UX |
| LO analytics persistence | Strong current-syllabus evidence | Present | Keep current main |
| Student history | Limited final report/session list | Strong explicit history | Port |
| State-version conflict control | Versioned events but limited command CAS | Explicit expected-state-version | Port CAS semantics |
| Multi-client E2E | Release contract only; browser gate deferred | Contract coverage | Build final E2E gate |

## Implementation sequence

### Phase A — Builder read model

- Add staff-only builder-options endpoint under `/live-exams`.
- Add strict source-complete eligible-question endpoint.
- Reuse current classes, syllabus taxonomy, canonical question bank and current-syllabus LO compatibility model.
- No runtime behavior change to existing sessions.

Acceptance:
- students cannot access builder data;
- staff see only classes they control;
- eligible questions are source-complete, approved, independently answerable and compatible with the selected class syllabus.

### Phase B — Draft and publish lifecycle

- Extend `live_exam_status` with `draft` and `published` through a new non-conflicting migration.
- Add nullable syllabus/topic/subtopic builder scope columns only if required by final query contracts.
- Add draft create/update, manual replace/reorder and auto-select commands.
- Generate room code only at publish time.
- Existing session rows remain valid and backward compatible.

Acceptance:
- draft cannot be joined or started;
- publish re-validates all selected questions;
- duplicate questions are rejected;
- room code is unique and assigned only to a publishable challenge.

### Phase C — Lifecycle hardening

- Add explicit answer-lock transition.
- Add `paused` lifecycle state and resume semantics.
- Add expected-state-version compare-and-set protection to teacher commands.
- Add late-join and auto-close settings.
- Keep DB session state authoritative.

Acceptance:
- stale teacher commands fail with conflict rather than overwriting newer state;
- answers cannot cross the lock boundary;
- Mark Scheme never appears before lock;
- reconnect restores the correct authoritative screen.

### Phase D — Dedicated board projection

- Add `/live-exams/:id/board`.
- Return only learner-safe state.
- Omit answer text, moderation controls, audit fields, internal LO IDs and teacher-only diagnostics.
- Switch projector UI to this endpoint.

### Phase E — Moderation, history and UX convergence

- Port explicit teacher-override enable/disable setting and reason capture.
- Keep append-only current DB audit as authority.
- Add student challenge history.
- Consolidate product naming to Cambridge Live Challenge.
- Remove or supersede duplicate donor UI paths after parity is reached.

### Phase F — Final release gates

Automated or recorded E2E must prove:

`Teacher draft → eligible pool → manual/auto select → publish → Board → Student A/B join → start → same canonical question → submit → lock → Mark Scheme reveal → no self-marking → peer/teacher marking → moderation → leaderboard → next → finish → LO evidence/mastery → student history`.

Additional required cases:
- wrong code;
- wrong class;
- duplicate submit;
- missing required visual;
- odd participant count;
- no safe peer assignment;
- reconnect after missed events;
- two teacher tabs / stale state version;
- teacher refresh;
- student refresh;
- cancelled session;
- production-safe cache controls.

## Migration rule

Do not reuse PR #217 migration number `0168_live_challenge_foundation.sql`. Current `main` already owns the `0168`–`0170` Live Exam lineage. All convergence migrations start after the current canonical migration head.

## Completion rule

The convergence is complete only when:

- one canonical subsystem remains;
- all security and source-fidelity invariants stay green;
- builder/lifecycle/board/history parity is reached;
- full repository verification passes;
- isolated Preview DB migration passes;
- Teacher + Board + two Student browser E2E passes;
- production migration/deploy is explicitly approved and smoke-tested.
