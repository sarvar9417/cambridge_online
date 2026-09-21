# Cambridge Live Challenge — Release Acceptance Matrix

Status: repository convergence implemented; zero-cost PostgreSQL migration + multi-client service integration is green. Browser Preview/runtime acceptance remains mandatory before production cutover.

This file records what the repository can prove automatically and what must still be proven against an isolated Preview database/browser environment. A paid Supabase development branch is intentionally not required for repository verification: GitHub Actions runs the Live Challenge migration chain and multi-client service flow against an ephemeral PostgreSQL 17 instance at zero additional service cost. This does **not** replace the browser Preview gate in `LIVE-CHALLENGE-CONVERGENCE-PLAN.md`.

## Canonical flow coverage

| Flow | Repository gate |
| --- | --- |
| Teacher creates draft | builder route/service tests + convergence contract |
| Select/reorder/auto-select canonical questions | builder tests + source-fidelity guards + required-dependency closure |
| Draft runtime policy settings | CAS draft patch + shared settings policy tests; timing/order/auto-lock/override/name mode enforced |
| Publish | builder lifecycle migration/service tests |
| Student discovers assigned challenge | student-feed service/route tests |
| Student joins with class-scoped code | participation service/route tests |
| Teacher opens lobby / starts | CAS control route/service tests |
| Same canonical question snapshot | release/source-fidelity contracts |
| Student autosaves/submits | existing runtime route/service tests |
| Answer lock | control tests + DB state contract |
| Mark Scheme reveal only after lock | control + release-security contracts |
| Anonymous peer marking | service assignment + DB peer-integrity trigger tests |
| Unsafe peer round | fail-closed service/DB tests + explicit reasoned teacher fallback |
| Teacher override | reasoned CAS moderation + append-only audit migration tests |
| Round leaderboard/distribution | round-summary tests; marks-first contract |
| Pause/resume | CAS control tests including timer preservation |
| Student leave / teacher participant removal | participation service/route tests; lobby-only policy |
| Finish | control transition + learning-evidence trigger contract |
| LO mastery evidence | `0170` migration tests; target-syllabus mapping and idempotency |
| Student history | student-feed history tests |
| Teacher strongest/weakest LO analytics | Live Challenge analytics service tests |
| Commonly missed mark points | analytics tests; overridden answers excluded from point-frequency claims |
| Projector | dedicated learner-safe `/board` projection tests; no private staff snapshot in canonical UI route |

## Negative/safety coverage

Repository gates explicitly cover or retain existing coverage for:

- wrong/unavailable join code and active-enrollment requirement;
- duplicate join and immutable submitted answers;
- late join enabled/disabled;
- peer reviewer cannot equal answer owner;
- peer assignment impossible fails closed;
- stale teacher state version returns conflict;
- answer writes cannot cross the lock boundary;
- Mark Scheme cannot appear before lock;
- participant leave/remove restrictions;
- pause/resume persisted state;
- event cursor is notification-only and snapshots remain authoritative;
- teacher overrides require reason and version and remain append-only evidence; disabled override policy fails closed after the initial teacher mark;
- all-submitted auto-close stops at `answers_locked` and never reveals the Mark Scheme;
- learner dashboard discovery uses the dedicated safe student feed; the generic session list is staff-only;
- final learning evidence is idempotent and marks-first;
- board/feed responses do not expose room or assessment-private data outside their allowed state.

## Zero-cost database/runtime evidence

The dedicated `Live Challenge DB smoke` workflow now proves the following against a fresh PostgreSQL 17 service:

- migrations `0166/0167/0168/0169/0170/0172/0173/0190/0191/0192` apply together;
- the converged enum order and lifecycle columns are present;
- draft join codes are nullable;
- database peer-integrity rejects self-review;
- teacher moderation reasons are copied into append-only override evidence;
- finish persists LO evidence and marks-first mastery;
- a real service-level flow runs Teacher + shared Board + Student A + Student B through published → lobby → question → pause/resume → submit → answer lock → Mark Scheme reveal → anonymous peer review → teacher moderation → finish;
- the Board projection is checked before and after reveal: no Mark Scheme before reveal, no join code outside lobby, and no session/student/mark-point internal IDs;
- stale teacher CAS is rejected and event versions remain monotonic;
- runtime policy coverage includes manual vs automatic answer locking and disabled teacher overrides.

The shared board remains covered by the dedicated learner-safe projection tests and frontend route contract. This gives a strong free release gate without touching production data.

## Preview gate still required

Before production migration or merge, run against an isolated Preview environment with at least:

1. Teacher browser + shared board + Student A + Student B.
2. Draft → publish → open room → both students join → start.
3. Verify identical source question across all clients, including diagram/table assets.
4. Submit from both students, lock, confirm Mark Scheme was absent before lock and present only after reveal.
5. Complete anonymous peer marking and verify neither learner receives their own answer.
6. Teacher moderation with mandatory reason; verify leaderboard and score distribution update.
7. Next question, refresh/reconnect one learner, and verify exact persisted state recovery.
8. Exercise pause/resume and a stale second teacher tab.
9. Finish and verify LO evidence, student history, and teacher analytics.
10. Repeat a final-data read/retry and verify mastery/evidence is not double-counted.

## Production boundary

Production migration, PR merge/deploy, smoke verification, and closing PR #217 remain explicit post-Preview release actions. They must not happen merely because repository CI is green.
