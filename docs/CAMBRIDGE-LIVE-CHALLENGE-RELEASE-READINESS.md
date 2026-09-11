# Cambridge Live Challenge — Release Readiness

Status: **Code-complete candidate; deployment not authorized**  
Last updated: **2026-09-11**  
Feature branch: `feature/cambridge-live-challenge-phase-1`  
PR: **#181**  
Current feature HEAD at time of this document: `c50bae0e4b0fb91f066272d5b5115a60f711d7f3`

This document is the release gate for Cambridge Live Challenge. It does not authorize a merge, database migration, preview promotion, or production deployment. Those remain explicit release actions.

## 1. Current evidence

### Feature-specific verification

The latest PR CI run on the current Live Challenge head completed:

- project-state check: PASS
- backend TypeScript: PASS
- frontend TypeScript: PASS
- backend Vitest: **139/139 files, 856/856 tests PASS**
- all Live Challenge service, security, timing, multi-client, multi-actor, analytics and release-contract tests: PASS
- frontend test phase reached unrelated Lesson Studio / Study Mode failures before inventory/build could run

The most recent full repository green run before the final security-hardening commits was GitHub Actions **CI #3997** on `9c736c9527fe62dc53d42d8e2db8995820422824`:

- backend: 139/139 files, 856/856 tests PASS
- frontend: 106/106 files, 526/526 tests PASS
- inventory contracts: 119/119 PASS
- backend production build: PASS
- frontend production build: PASS
- private-environment / credential guard: PASS

The post-#3997 commits are limited to Live Challenge release hardening: removing join-code duplication from audit events, adding fail-closed RLS/privilege boundaries to the Live Challenge foundation migration, and locking those invariants with tests.

### Current-main baseline

As of this document, `main` is independently red in CI. The current main HEAD is `76b43a9a6fed1f30f7710ea5397ec5f0a01fb737`; its CI run #4095 fails in unrelated Lesson Studio / chapter-content contracts. This means a red PR merge check must not automatically be attributed to Live Challenge.

**Release rule:** Cambridge Live Challenge must not be merged while the target `main` baseline is red. Restore a green `main`, synchronize the feature branch, and run the full repository verification again.

## 2. Database migration gate

Live Challenge is introduced by:

`backend/src/database/migrations/0166_live_challenge_foundation.sql`

Before applying it to any shared environment:

1. Read `schema_migrations` in the target database.
2. Confirm every migration that precedes `0166_live_challenge_foundation.sql` on the target release branch has been applied exactly once.
3. Confirm `0166_live_challenge_foundation.sql` has **not** already been partially or manually applied.
4. Take a database backup / point-in-time recovery checkpoint according to the environment's normal release procedure.
5. Apply migrations through the repository migration runner; do not paste fragments of 0166 manually.
6. Confirm `schema_migrations` records 0166 only after the complete migration succeeds.

Do not infer production migration state from Git history alone.

## 3. Database security gate

The Live Challenge foundation is intentionally server-only at the table layer.

All nine Live Challenge tables must have RLS enabled and direct grants removed from `PUBLIC`, `anon`, and `authenticated`:

- `live_challenges`
- `live_challenge_questions`
- `live_challenge_participants`
- `live_challenge_rounds`
- `live_challenge_answers`
- `live_challenge_peer_assignments`
- `live_challenge_peer_marks`
- `live_challenge_score_overrides`
- `live_challenge_events`

Also verify:

- the Live Challenge event sequence is not directly usable by `PUBLIC`, `anon`, or `authenticated`;
- trigger functions are not directly executable by those roles;
- the trusted backend database role can still perform the required reads/writes;
- no client-side code depends on direct PostgREST access to Live Challenge tables.

**Abort immediately** if an anonymous/authenticated client can directly read answers, mark-scheme snapshots, participant identities, score overrides, events, or join codes from the database API.

## 4. Secret-retention gate

Join codes are classroom access tokens and must have one canonical storage location: `live_challenges.join_code`.

Verify that:

- student feed responses do not include join codes;
- student state responses do not include join codes;
- `participant.joined` events do not persist the submitted join code;
- `challenge.published` events do not copy the generated join code into `payload_json`;
- teacher control / lobby responses may display the code because that is the intended classroom workflow.

## 5. Source-fidelity and eligibility gate

A Live Challenge question is eligible only when the canonical Question Bank still proves the required Cambridge source chain.

Before release, manually sample at least three eligible questions, including one with a visual asset, and verify:

- canonical question status is approved;
- QP source URL and SHA-256 are present;
- approved Mark Scheme source URL and SHA-256 are present;
- primary source occurrence pairs QP and MS correctly;
- structured `content_json` source identity matches the QP;
- all required structured assets resolve;
- no unresolved error-level validation finding exists;
- no required `answer_ref` dependency makes the item unsafe for standalone live use;
- the question maps to the target syllabus Learning Objective directly or through an approved `equivalent` / `subtopic_compatible` compatibility edge.

Publishing must re-run this eligibility check and refresh immutable source / Mark Scheme snapshots.

## 6. Preview smoke matrix

Use separate authenticated browser sessions for **Teacher**, **Board**, **Student A**, and **Student B**.

| Stage | Required result |
|---|---|
| Teacher Builder | Correct class, syllabus, topic/subtopic and eligible source-complete pool load |
| Draft | Teacher can create a draft; student cannot access builder APIs |
| Publish | Six-character uppercase code is generated; selected questions are revalidated |
| Student discovery | Only students actively enrolled in the assigned class see the challenge |
| Join authorization | Correct code + active enrollment joins; wrong class/code fails closed |
| Lobby | Teacher sees participant count/list; students see waiting state; no question leaks early |
| Start | One server-authoritative round is created; zero-participant start is rejected |
| Question projection | Teacher, Board and joined students resolve the same canonical question |
| Mark Scheme secrecy | Student response contains no Mark Scheme before `PEER_MARKING` |
| Board privacy | Board contains no answer text, participant identity, join code or Mark Scheme during answer phase |
| Assets | Private question assets resolve through short-lived signed URLs |
| Submit | Each student's first valid answer is persisted; rewrite to a different answer is rejected |
| Timing | Database-clock deadline rejects expired answers; pause/resume excludes paused duration correctly |
| Lock | Teacher lock / approved auto-close freezes answers and advances authoritative state |
| Peer marking | Deterministic assignment contains no self-marking; reviewed student identity is hidden |
| Mark Scheme phase | Official Mark Scheme appears only when marking is active |
| Peer submit | Mark is credited to the reviewed answer owner, not the marker |
| Moderation | Teacher override is append-only audited and does not silently mutate peer evidence |
| Round results | Board scoreboard and distribution use released authoritative scores only |
| Next question | Only `ROUND_RESULTS` advances; question identity changes consistently for every client |
| Finish | Terminal `FINISHED` state is persisted; further invalid transitions fail closed |
| Student result | Student sees only their result plus allowed learning insights |
| Teacher analytics | Class aggregate, strongest/weakest LOs and missed Mark Scheme points render without student identities |
| Reconnect | Refresh/reopen reconstructs correct state from REST/database, not stale client memory |
| Event recovery | Cursor polling can miss notifications without losing authoritative state |

## 7. Negative / abuse smoke tests

Release is blocked unless these fail closed:

- non-enrolled student attempts to join with a valid code;
- removed participant attempts to rejoin;
- student requests another challenge they never joined;
- student submits for an old/non-current round;
- student changes answer after first immutable submission;
- submission arrives after server/database deadline;
- student tries to access Mark Scheme before peer marking;
- peer marker attempts to mark their own answer;
- Board endpoint is inspected for hidden identity/answer/source-control fields;
- direct `anon` or `authenticated` database API attempts to read/write Live Challenge tables;
- stale `state_version` attempts a teacher transition;
- duplicate start / next action is retried;
- terminal challenge receives a normal runtime transition.

## 8. Performance / resilience checks

Before production promotion, run at least one realistic classroom rehearsal with the expected student count.

Verify:

- join burst does not exhaust the serverless database pool;
- state/event polling remains bounded and does not create an unbounded backlog;
- one slow/reconnecting student does not block other participants;
- signed-asset refresh works after URL expiry;
- duplicate HTTP retries remain idempotent where designed;
- teacher state remains usable after browser refresh during every runtime phase.

## 9. Release sequence

The safe promotion order is:

1. target `main` CI green;
2. synchronize `feature/cambridge-live-challenge-phase-1` with that exact green main HEAD;
3. full PR `npm run verify` green;
4. review PR diff and confirm only intended Live Challenge/release files remain;
5. create/refresh preview deployment from the exact verified feature SHA;
6. apply pending migrations to the preview/staging database through the normal migration runner;
7. execute the full smoke matrix and negative tests;
8. verify `/ready` and normal existing application flows after migration;
9. explicitly approve merge;
10. merge PR;
11. apply production migration through the normal release path;
12. deploy the exact merged commit;
13. repeat critical production smoke checks with a disposable/test class;
14. record deployed commit SHA, migration state and smoke evidence.

Do not migrate production first and “catch the application up later”.

## 10. Abort criteria

Abort the release immediately if any of the following occurs:

- target main or synchronized PR verification is red;
- migration is partially applied or schema state is ambiguous;
- backend loses access after RLS/REVOKE hardening;
- `anon` / `authenticated` gains direct Live Challenge table access;
- Mark Scheme appears before `PEER_MARKING`;
- a student crosses class/enrollment boundaries;
- Board leaks answer text, identity, join code or hidden source controls;
- current question differs between teacher, board and student for the same state version;
- locked answer changes;
- self-marking occurs;
- scoring is credited to marker instead of answer owner;
- reconnect cannot reconstruct the current phase from persistent state;
- analytics writes duplicate evidence/mastery on retry;
- a terminal challenge can re-enter the normal runtime state machine.

## 11. Rollback posture

Because 0166 creates a new feature-owned schema surface rather than mutating existing Question Bank content, the preferred application rollback is to disable/remove access to the Live Challenge UI/API while preserving newly created challenge data for diagnosis.

Do **not** drop Live Challenge tables in a production incident merely to roll back the application. Destructive schema rollback requires a separate reviewed decision because it deletes classroom answers, peer marks, moderation audit rows and event history.

If the application must be rolled back after 0166 is applied:

- redeploy the last known-good application commit only if it safely ignores the new tables;
- keep 0166 schema/data intact;
- block new Live Challenge creation/use at the application layer;
- diagnose and forward-fix with a new migration if schema correction is required.

## 12. Definition of release-ready

Cambridge Live Challenge is release-ready only when **all** of the following are true:

- target `main` is green;
- feature branch is synchronized to that exact main SHA;
- full repository verification is green on the synchronized PR merge ref;
- security/RLS checks pass in the target environment;
- preview smoke matrix passes end-to-end with Teacher + Board + two students;
- no open P0/P1 Live Challenge defect remains;
- migration state is known and backed up;
- exact deployment commit is recorded;
- merge/deployment is explicitly approved.

Until then the PR should remain Draft.