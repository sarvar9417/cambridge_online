# Cambridge Live Challenge — No-Cost Browser E2E Gate

Status: prepared, not yet executed
Date: 2026-09-21

This gate is the final browser/runtime acceptance step before any production migration, merge or deployment.

It must remain **no-cost** and must never use production data as a destructive test environment.

## Required clients

Run four isolated browser contexts:

1. **Teacher**
2. **Shared Board / Projector**
3. **Student A**
4. **Student B**

Use independent browser contexts or profiles so cookies/session state cannot leak between roles.

## Required environment

Acceptable:

- local frontend + local backend + ephemeral PostgreSQL;
- a free Preview deployment connected to a non-production, no-cost isolated database.

Not acceptable:

- paid Supabase development branch;
- production database used for destructive acceptance testing;
- one browser session reused for multiple identities.

## Canonical end-to-end path

1. Teacher opens Live Challenges.
2. Create a Draft.
3. Select syllabus/topic/subtopic.
4. Verify eligible canonical question source refs.
5. Use manual or auto selection.
6. Reorder/remove where applicable.
7. Configure timing/order/late-join/auto-close/peer-marking/override/name-display policy.
8. Publish.
9. Verify a join code appears only after publish.
10. Open Lobby.
11. Open the Board in a separate browser context.
12. Student A discovers the challenge from the safe feed and joins with the code.
13. Student B discovers and joins.
14. Teacher starts.
15. Verify Teacher, Board, Student A and Student B resolve the same canonical question/source reference.
16. Verify students cannot see the Mark Scheme.
17. Submit Student A answer.
18. Submit Student B answer.
19. Lock answers, or let the configured all-submitted rule enter `answers_locked`.
20. Verify both students are immutable after lock.
21. Verify Board and students still cannot see the Mark Scheme until explicit reveal.
22. Reveal Mark Scheme.
23. Verify Student A/B receive anonymous peer work and neither receives their own answer.
24. Submit both peer marks.
25. Complete marking.
26. Verify round result/leaderboard is marks-first.
27. If override is enabled, teacher changes one score with a mandatory reason.
28. Verify the board leaderboard contains no learner database IDs.
29. Advance to the next question.
30. Refresh Student A.
31. Simulate a missed realtime interval by leaving Student B idle, then reconnect/refresh.
32. Verify both recover exact persisted state.
33. Open a stale second teacher tab and attempt an outdated transition.
34. Verify the stale action receives the state-version conflict and cannot overwrite current state.
35. Pause and Resume.
36. Finish.
37. Verify student history.
38. Verify teacher analytics / LO evidence.
39. Repeat final reads/retry-safe actions and verify no double-counting of mastery/evidence.

## Security assertions

The browser run must explicitly record:

- join code alone cannot authorise a student outside the assigned class;
- student payload/UI never contains teacher-only answer collections;
- Mark Scheme is absent before `answers_locked → marking`;
- peer marker never sees owner identity and never receives self;
- Board never displays internal session/student/answer/mark-point IDs;
- teacher override requires a reason when enabled;
- disabled teacher override is reflected in UI and rejected by backend;
- refresh/reconnect restores from server state, not stale local browser state.

## Source-fidelity assertions

For at least one question with structured context or a visual asset:

- source reference is visible and identical across relevant clients;
- required parent/dependency context is present;
- required asset renders successfully;
- no signed/storage diagnostic field is exposed in Board/student UI;
- the official Mark Scheme shown after reveal matches the frozen challenge snapshot.

## Evidence record

For every execution record:

- branch SHA;
- frontend build/deployment identifier;
- backend build/deployment identifier;
- database type and proof it is non-production;
- Teacher/Board/Student A/Student B browser timestamps;
- result of every step above;
- screenshots only where they help diagnose UI/state, without exposing secrets;
- CI and DB-smoke run IDs used as the repository precondition.

## Pass rule

Browser E2E passes only if every required client completes the canonical flow and every security/source-fidelity assertion passes.

A browser-only happy path is not enough. A database-only service test is not enough. Both repository gates and this browser gate are required.

## Release boundary

After this gate passes:

1. produce the final release report;
2. stop;
3. request explicit product-owner approval;
4. only then consider production migration, merge and deploy.
