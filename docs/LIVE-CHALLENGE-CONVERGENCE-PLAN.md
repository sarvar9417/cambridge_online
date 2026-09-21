# Cambridge Live Challenge — Convergence Plan

Status: implementation in progress
Base: current `main`
Legacy source branch: `integration/live-challenge-20260915` / PR #217
Canonical runtime target: one `live_exam_*` subsystem presented to users as **Cambridge Live Challenge**

## 1. Objective

Converge the strongest parts of the current `live_exam_*` implementation and the older verified Live Challenge implementation into one production-grade classroom assessment system.

The final product must support:

`Draft → Publish → Lobby → Question → Answer Lock → Mark Scheme → Peer/Teacher Marking → Round Results → Next Question → Finish → Analytics`

There must not be two parallel question banks, two production state machines, or two competing live-classroom APIs.

## 2. Canonical architectural decisions

1. Current `main` is the integration base.
2. Existing `live_exam_*` tables remain the canonical persistence model.
3. Existing `/api/v1/live-exams` security, source-fidelity, realtime cursor, marks-first leaderboard, override audit and learning-evidence behavior are retained unless explicitly superseded by a stronger compatible contract.
4. PR #217 is mined selectively for capabilities; it is not merged wholesale.
5. The old `live_challenge_*` migration is not introduced as a second production schema.
6. Product/UI naming converges on **Cambridge Live Challenge**.
7. Realtime remains a notification layer; authoritative recovery always comes from persisted server state.
8. Cambridge marks remain the academic scoring authority. Speed never contributes to mastery.
9. Mark Scheme secrecy and no-self-marking remain hard invariants.
10. Preview/runtime E2E stays deferred until static, unit, integration and contract gates are green.

## 3. Capability convergence matrix

| Capability | Current `main` | PR #217 | Final action |
| --- | --- | --- | --- |
| Canonical question FK | Strong | Strong | Keep current main |
| Immutable question/Mark Scheme snapshot | Strong | Strong | Keep current main |
| Approved-question eligibility | Strong | Strong | Keep current main, extend builder |
| Draft challenge | Missing | Present | Port into `live_exam_*` |
| Publish step | Missing | Present | Port |
| Manual question selection | Missing | Present | Port |
| Auto selection | Present but create-time only | Present | Expose explicit builder action |
| Reorder/remove questions | Missing | Present | Port |
| Rich challenge settings | Partial | Present | Port compatible settings |
| Lobby / join code | Present | Present | Keep current main and harden |
| Class-scoped student auth | Strong | Strong | Keep current main |
| Late join controls | Missing | Present | Port |
| Question timing | Present | Present | Keep current main; port teacher/per-question policy |
| Answer autosave | Present | No equivalent needed | Keep current main |
| Explicit answer-lock state | Implicit in reveal | Present | Add explicit state/transition |
| Mark Scheme secrecy | Strong | Strong | Keep current main invariant |
| Anonymous peer marking | Present | Present | Keep current main DB integrity; port controls |
| DB no-self-marking | Strong | Strong | Keep current main |
| Safe peer-assignment failure | Strong | Strong | Keep current main |
| Teacher marking | Present | Present | Keep current main |
| Teacher override audit | Strong | Present | Keep current main trigger; require reason in API/UI |
| Pause/resume | Missing | Present | Port |
| Participant removal | Missing | Present | Port with state restrictions |
| Student leave | Missing | Present | Port with state restrictions |
| State-version CAS | Partial versioning, no client CAS | Present | Port expected-version guards |
| Board-safe server projection | UI-only projector from staff snapshot | Present | Port dedicated projection endpoint |
| Realtime event cursor | Strong | Present but older model | Keep current main |
| Forced authoritative refresh | Strong | Older model | Keep current main |
| Marks-first leaderboard | Strong | Present | Keep current main |
| Score distribution | Present via round summary | Present | Keep/normalize |
| LO analytics persistence | Strong current-syllabus mapping | Present | Keep current main |
| Student history | Partial final report | Present | Port dedicated history/feed |
| Multi-client E2E | Not final-gated | Contract planned | Build final acceptance harness |

## 4. Delivery phases

### Phase 1 — Convergence contract and safe foundations

- Record this convergence plan.
- Add repository-level convergence contract tests.
- Establish final naming and API ownership: one `live_exam_*` runtime.
- Add a board-safe server projection contract without changing the classroom state machine.
- Add expected-version guard primitives for future teacher transitions.

Acceptance:
- no duplicate production schema introduced;
- existing release-security contract remains green;
- board projection cannot expose answer text, mark scheme before reveal, teacher moderation data or internal audit metadata;
- current routes remain backward compatible.

### Phase 2 — Builder convergence

- Add `draft` and `published` lifecycle states with additive migration(s).
- Add builder options scoped by class syllabus.
- Add eligible-question pool endpoint.
- Add manual selection, auto selection, reorder and remove.
- Add save-draft and publish actions.
- Preserve canonical question and approved Mark Scheme snapshots at publish/start boundary.

Acceptance:
- teacher can build without opening a room;
- published challenge is immutable in assessment-critical fields unless explicitly returned to draft through an allowed future policy;
- no source-incomplete question can publish.

### Phase 3 — State-machine convergence

Target state model:

`draft → published → lobby → question_open → answers_locked → marking → review → question_open ... → finished`

Side states:

`paused`, `cancelled`

- Separate answer locking from Mark Scheme reveal.
- Add pause/resume.
- Add expected-state-version compare-and-set guards to teacher transitions.
- Add late-join policy.
- Add participant removal/leave restrictions.

Acceptance:
- stale teacher tabs cannot overwrite newer state;
- no answer write crosses the lock boundary;
- Mark Scheme cannot appear before lock;
- reconnect restores the exact persisted state.

### Phase 4 — Marking and moderation convergence

- Keep DB-enforced no-self-marking.
- Port challenge-level peer-marking and teacher-override switches.
- Require an override reason in moderation UI/API while retaining append-only trigger audit.
- Keep teacher fallback only where it does not violate peer-mode integrity.
- Preserve mark-point computation and max-mark validation.

Acceptance:
- peer mode never silently degrades to self marking;
- unresolved rounds fail closed or require teacher moderation;
- every teacher override is auditable.

### Phase 5 — Board, leaderboard and student experience

- Move projector to dedicated board-safe endpoint.
- Unify all visible naming as Cambridge Live Challenge.
- Add student live/upcoming feed.
- Add student history.
- Preserve marks-first round/cumulative leaderboard.
- Preserve score distribution.

Acceptance:
- board payload is learner-safe by construction;
- student cannot discover unjoined class sessions except through the approved published/feed contract;
- room code does not bypass enrollment authorization.

### Phase 6 — Analytics and final evidence

- Keep current `live_exam_learning_evidence` as canonical academic evidence.
- Preserve current-syllabus resolution through direct LO mapping or reviewed compatibility edges.
- Add teacher strongest/weakest LO summaries and commonly missed mark-point summaries where evidence supports them.
- Keep speed and rank outside mastery.

Acceptance:
- finished session fails closed if academic evidence cannot be mapped or graded completely;
- retries cannot double-count mastery.

### Phase 7 — Release hardening

Automated/recorded E2E must prove:

`Teacher create draft → select canonical questions → publish → board opens → Student A/B discover/join → start → same question on all clients → submit → lock → Mark Scheme reveal → anonymous peer mark → teacher moderation → leaderboard → next question → finish → LO evidence → student history`

Also test:

- wrong code;
- wrong class;
- duplicate join/submit;
- late join on/off;
- no safe peer assignment;
- missing question asset;
- teacher double action;
- two teacher tabs with stale versions;
- student/teacher refresh;
- missed realtime event;
- network reconnect;
- cancel/pause/resume;
- finished analytics idempotency.

Only after all repository gates are green:

1. isolated Preview database migration;
2. multi-browser Preview E2E;
3. explicit release approval;
4. production migration;
5. merge/deploy;
6. production smoke verification;
7. close PR #217 as superseded.

## 5. Non-negotiable release invariants

- One canonical Cambridge question identity.
- No parallel editable question bank.
- No Mark Scheme before answer lock.
- No self-marking in peer mode.
- Server/database state is authoritative.
- Board projection is learner-safe.
- Teacher overrides are audited.
- Marks, not speed, drive academic evidence.
- Final evidence maps to the class target syllabus.
- Refresh/reconnect cannot corrupt state.
- No production migration before Preview/runtime acceptance.
