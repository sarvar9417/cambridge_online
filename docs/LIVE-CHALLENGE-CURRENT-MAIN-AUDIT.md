# Cambridge Live Challenge — Current-main convergence audit

Status: implementation started  
Audit date: 2026-09-21  
Integration base: `main@a248e445986a40259f12fee5edbcafc491b2b4b8`  
Working branch: `feature/live-challenge-convergence-current-main`

## Why the implementation moved to a clean current-main branch

The earlier convergence branch/PR #258 was created against an older main and is now materially behind the repository. Current main has since added 9618 product-consumption changes and migrations through `0190_live_challenge_subtopic_evidence_fallback.sql`.

The old branch also used migration numbers `0172/0173` for different Live Challenge changes, while current main now owns those numbers for unified controls/database hardening. Merging the old branch wholesale would therefore violate the approved rule that current main is the integration base and would create an unsafe migration-history collision.

The older branch remains a donor for already-reviewed builder/board/CAS ideas. New production candidates are rebuilt on current main.

## Capability audit against the approved convergence plan

| Capability | Current main | Action |
| --- | --- | --- |
| Canonical question FK | DONE | Preserve |
| Immutable question/Mark Scheme snapshots | DONE | Preserve |
| Current 9618 product-consumption/source rules | DONE | Preserve; builder must reuse them |
| Draft challenge | MISSING | Add to `live_exam_*` |
| Publish step | MISSING | Add |
| Manual question selection | PARTIAL | Create-time IDs exist; expose builder action |
| Auto selection | PARTIAL | Create-time only; expose builder action |
| Reorder/remove | MISSING | Add |
| Rich settings | PARTIAL | Preserve current settings; add builder-edit contract |
| Lobby/join code | DONE | Preserve, but code must be absent for draft |
| Enrollment-scoped join | DONE | Preserve |
| Late join | DONE | Preserve |
| Question timing | DONE | Preserve |
| Answer autosave | DONE | Preserve |
| Explicit answer-lock state | MISSING | Add `answers_locked`; stop auto-close from revealing MS |
| Mark Scheme secrecy before reveal | DONE | Preserve |
| Anonymous peer marking | PARTIAL/REGRESSION | One-learner self fallback violates approved no-self invariant |
| DB no-self-marking | PARTIAL/REGRESSION | Restore strict no-self rule |
| Teacher marking | DONE | Preserve |
| Teacher override audit | DONE | Preserve; keep reason/CAS hardening |
| Pause/resume | DONE | Keep current main's orthogonal `paused_at` model |
| Participant removal | DONE | Keep lobby restriction |
| Student leave | PARTIAL | Add explicit state restrictions |
| State-version CAS | PARTIAL | Make teacher mutations require expected version |
| Board-safe server projection | MISSING | Add dedicated endpoint/projection |
| Realtime cursor/recovery | DONE | Preserve |
| Marks-first leaderboard | DONE | Preserve; speed must not drive mastery |
| Student history/feed | PARTIAL | Port dedicated safe feed/history |
| LO analytics evidence | DONE | Preserve current target-syllabus fallback |
| Final multi-client E2E | MISSING | Build final free DB/service gate, then browser Preview gate |

## Execution order from this point

1. **Builder lifecycle foundation** — add `draft`, `published`, `answers_locked`; nullable draft join code; publish timestamp.
2. **Builder convergence** — current-main eligibility + dependency expansion, manual/auto selection, reorder/remove, draft settings, publish.
3. **State-machine convergence** — explicit answer lock, required CAS, join/open/start transitions, leave restrictions.
4. **Marking integrity** — restore strict no-self peer marking, fail closed when no safe assignment exists, moderation/override policy.
5. **Board/student experience** — board-safe projection, safe student feed/history, naming consistency.
6. **Analytics/evidence** — retain current evidence, strongest/weakest LO and supported mark-point summaries.
7. **Release hardening** — wrong code/class, retries, stale tabs, reconnect, pause/resume, assets, final-data idempotency.
8. **Preview gate** — multi-browser Teacher + Board + Student A + Student B.
9. **Production only after explicit approval** — migration, merge/deploy, smoke verification.

## Release boundary

No production migration, production deploy, or merge is authorised by this audit. Paid Supabase development branches are not required; repository verification should continue with free CI/ephemeral PostgreSQL wherever possible.
