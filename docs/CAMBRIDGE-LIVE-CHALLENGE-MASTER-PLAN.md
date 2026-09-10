# Cambridge Live Challenge — Master Plan

Status: Approved for implementation
Approved by product owner: 2026-09-09
Repository: `sarvar9417/cambridge_online`

## 1. Product goal

Build a teacher-controlled, classroom-scale live formative assessment game that reuses CamPath's canonical Cambridge question corpus, source-fidelity rules, student dashboard, marking and analytics foundations.

The core experience is:

1. Teacher selects syllabus → chapter → section/topic.
2. Teacher builds a Live Challenge from eligible source-complete Cambridge past-paper questions.
3. The challenge is published to an assigned class and appears on students' dashboards.
4. Students join the session using the teacher-provided code.
5. Teacher controls the shared electronic-board experience and starts the session.
6. The same canonical question is delivered to the board and all joined students.
7. Students independently submit answers.
8. The round closes when all answers are submitted or the teacher explicitly ends the round.
9. Submitted answers become immutable and the approved mark scheme is revealed.
10. Students anonymously peer-mark another student's answer against explicit mark points.
11. Teacher can review/override peer marks.
12. Round results and class-level insight are shown.
13. Teacher advances to the next question.
14. Final results, learning-objective analysis and student history are persisted.

This feature is a **live assessment subsystem**, not a separate question bank and not a Kahoot-style multiple-choice clone.

## 2. Non-negotiable invariants

### 2.1 Canonical question identity

Live Challenge questions reference existing canonical Question Bank rows. Questions are not copied into a second editable corpus.

Every round must preserve the approved Cambridge occurrence, source reference, marks, required parent context, structured content and required visual assets.

If required context or source-fidelity evidence is missing, the question fails closed and is not eligible for Live Challenge.

### 2.2 Mark-scheme secrecy

The mark scheme must never be exposed to students before the round is locked.

Allowed sequence:

`QUESTION_ACTIVE → ANSWERS_LOCKED → PEER_MARKING`

Only after `ANSWERS_LOCKED` may a student-facing API/view return the approved mark scheme.

### 2.3 Server-authoritative state

Database session state is authoritative. Browser state, local storage and realtime messages are never the source of truth.

At all times:

`board.question_id = student.question_id = live_challenge.current_question_id`

A reconnect or refresh must restore the correct screen from server state.

### 2.4 Anonymous peer marking

A participant cannot mark their own answer. Peer identity is hidden from the marker by default.

Teacher identity and moderation controls are never hidden from the teacher.

### 2.5 Assessment integrity

Submitted answers are immutable after the round is locked. Teacher overrides are audited rather than silently replacing peer evidence.

### 2.6 Board-mode separation

The projected board contains learner-facing material and minimal classroom chrome only. It must not expose hashes, ingestion state, internal LO IDs, database identifiers or source-audit diagnostics.

## 3. Scope

### MVP

- Teacher challenge builder.
- Syllabus/chapter/section filtering.
- Auto and manual question selection.
- Eligibility filtering against source-complete approved questions.
- Class assignment.
- Unique six-character join code.
- Student dashboard card and join flow.
- Teacher waiting room.
- Board mode.
- Teacher-controlled start/end/next.
- Realtime session synchronisation with REST/state recovery.
- Text answer submission.
- Answer locking.
- Mark-scheme reveal after lock.
- Anonymous peer marking using mark-point selection and a score.
- Teacher score override with audit trail.
- Round leaderboard and score distribution.
- Final result and per-LO analytics persistence.
- Refresh/reconnect safety.
- E2E multi-client tests.

### Explicitly out of MVP

- Public games.
- Inter-school tournaments.
- Team/house competitions.
- Coin shops or marketplaces.
- Chat.
- AI-generated questions as a default source.
- AI as final marking authority.
- Global avatars economy.

The data model should not unnecessarily block later double marking, calibration rounds or teams.

## 4. Teacher workflow

### 4.1 Create

Entry points:

- Teaching → Live Challenges → Create
- Optional future shortcut from Lessons / Lesson Studio

Builder sequence:

1. Select syllabus.
2. Select chapter.
3. Select section/topic.
4. Load eligible canonical past-paper question pool.
5. Choose `Auto` or `Manual` selection.
6. Configure question order, timing and participation settings.
7. Select class.
8. Save draft.
9. Publish.

### 4.2 Recommended settings model

- `question_order`: fixed | shuffled
- `timing_mode`: teacher | per_question
- `default_time_limit_seconds`: nullable
- `allow_late_join`: boolean
- `auto_close_when_all_submitted`: boolean
- `peer_marking_enabled`: boolean
- `teacher_override_enabled`: boolean
- `leaderboard_mode`: marks | marks_plus_small_speed_bonus
- `display_name_mode`: first_name | full_name | anonymous

Default leaderboard scoring is marks-first. Speed bonus, when enabled later, must be minor and must not dominate Cambridge marks.

### 4.3 Waiting room

Teacher sees:

- challenge title
- syllabus/chapter/section
- six-character join code
- participant count
- joined student list
- Start button

Student board projection shows the code and joined count, not private operational details.

## 5. Student workflow

### 5.1 Dashboard discovery

When a challenge is published to the student's class, the student dashboard shows an Upcoming/Live Challenge card.

The card contains challenge title, chapter/section, teacher, state and Join action.

### 5.2 Join

Join requires:

- authenticated student
- membership in assigned class
- published/joinable session
- correct join code

A valid code alone never authorises access to another class.

### 5.3 Round answering

During `QUESTION_ACTIVE`, the student sees the canonical Cambridge question and an answer editor.

The student does not see:

- mark scheme
- other students' answers
- other students' submitted text
- teacher-only provenance controls

After submission, the student sees a waiting state. If the round remains open, editability follows the challenge setting; MVP default is immutable-after-submit.

### 5.4 Peer marking

After the teacher/system locks the round, each eligible student receives an anonymous peer answer and the approved mark scheme.

The UI should prefer explicit mark-point checkboxes plus a score control over score-only marking.

Optional feedback text may be supported, but must not be required for MVP completion.

## 6. Session state machine

Canonical states:

- `DRAFT`
- `PUBLISHED`
- `LOBBY`
- `QUESTION_ACTIVE`
- `ANSWERS_LOCKED`
- `PEER_MARKING`
- `ROUND_RESULTS`
- `FINISHED`
- `PAUSED`
- `CANCELLED`

Primary transition loop:

`DRAFT → PUBLISHED → LOBBY → QUESTION_ACTIVE → ANSWERS_LOCKED → PEER_MARKING → ROUND_RESULTS → QUESTION_ACTIVE ... → FINISHED`

Rules:

- Only teacher/admin-authorised actors may drive teacher transitions.
- `QUESTION_ACTIVE → ANSWERS_LOCKED` occurs on teacher action or approved auto-close rule.
- `ANSWERS_LOCKED → PEER_MARKING` must prepare peer assignments before student marking is enabled.
- The next question can start only from `ROUND_RESULTS`.
- `FINISHED` is terminal except for administrative archive operations.

## 7. Persistence model

Proposed tables (final names may follow existing repository conventions):

### 7.1 `live_challenges`

- `id`
- `teacher_id`
- `class_id`
- `title`
- `syllabus_id`
- `chapter_id`
- `section_id` / topic selector metadata
- `join_code`
- `status`
- `settings_json`
- `current_question_position`
- `created_at`
- `published_at`
- `started_at`
- `finished_at`

### 7.2 `live_challenge_questions`

- `id`
- `challenge_id`
- `question_id` — canonical Question Bank FK
- `position`
- `max_marks_snapshot`
- `source_occurrence_snapshot`
- `approved_mark_scheme_version_snapshot`
- `time_limit_seconds`

Snapshots are assessment evidence only; they do not become a parallel editable question corpus.

### 7.3 `live_challenge_participants`

- `id`
- `challenge_id`
- `student_id`
- `joined_at`
- `last_seen_at`
- `status`

Unique constraint: `(challenge_id, student_id)`.

### 7.4 `live_challenge_rounds`

- `id`
- `challenge_id`
- `challenge_question_id`
- `round_number`
- `status`
- `started_at`
- `locked_at`
- `marking_started_at`
- `results_released_at`

### 7.5 `live_challenge_answers`

- `id`
- `round_id`
- `student_id`
- `answer_text`
- `submitted_at`
- `locked_at`
- optional `submission_duration_ms`

Unique constraint: `(round_id, student_id)`.

### 7.6 `live_challenge_peer_assignments`

- `id`
- `round_id`
- `marker_student_id`
- `answer_id`
- `status`
- `assigned_at`

Constraints must make self-marking impossible at the database/service boundary.

### 7.7 `live_challenge_peer_marks`

- `id`
- `peer_assignment_id`
- `awarded_marks`
- `mark_points_json`
- `feedback_text`
- `submitted_at`

### 7.8 `live_challenge_score_overrides`

- `id`
- `round_id`
- `answer_id`
- `teacher_id`
- `previous_score`
- `new_score`
- `reason`
- `created_at`

### 7.9 `live_challenge_events`

Audit/event history:

- `challenge_id`
- `actor_id`
- `event_type`
- `payload_json`
- `created_at`

This is for audit/recovery evidence; realtime delivery is not sourced from this table alone unless explicitly designed that way.

## 8. API contract

Exact routes should follow existing backend conventions. Required capabilities:

### Teacher

- create challenge
- update draft settings
- list eligible questions for chapter/section
- add/reorder/remove questions
- publish challenge
- open lobby
- start challenge/round
- end current question
- start peer marking
- finish marking
- release round results
- advance to next question
- pause/resume/cancel
- review responses and marks
- override final score
- finish challenge

### Student

- list dashboard-visible challenges
- join by challenge + code
- get current authorised session state
- get current question when active
- submit answer idempotently
- get own submission state
- get peer-mark assignment only after marking starts
- submit peer mark idempotently
- get own round/final result

### Board

- get board-safe state projection

The board endpoint must intentionally omit student-private and teacher-diagnostic fields.

## 9. Realtime contract

Realtime is a notification/synchronisation layer over persistent authoritative state.

Representative events:

- `challenge.published`
- `participant.joined`
- `challenge.started`
- `question.started`
- `answer.submitted`
- `question.locked`
- `marking.started`
- `peer_mark.assigned`
- `peer_mark.submitted`
- `round.results_released`
- `question.advanced`
- `challenge.paused`
- `challenge.finished`

Every client must be able to recover by calling the current-state endpoint after refresh, reconnect or a missed event.

## 10. Peer assignment algorithm

MVP requirements:

1. Build the set of submitted eligible answers.
2. Build the set of eligible marker participants.
3. Produce a derangement where no marker receives their own answer.
4. Persist all assignments transactionally.
5. Handle odd counts and disconnected students without violating self-marking prohibition.
6. If a safe assignment cannot be produced, fail closed and require teacher intervention rather than exposing self-marking.

Future-compatible extension:

- two independent peer marks per answer
- disagreement threshold
- teacher moderation queue

## 11. Scoring

Default effective score:

`teacher_override ?? approved_peer_score ?? 0`

Primary points are the Cambridge marks awarded.

If a later speed bonus is enabled, it must be small enough that an academically weaker answer cannot outrank a materially stronger answer solely due to speed.

## 12. Analytics integration

Live Challenge must feed the existing analytics foundation rather than create an unrelated parallel analytics product.

Persistable evidence includes:

- student score per question
- maximum mark
- canonical question / occurrence
- mapped learning objective(s)
- chapter/section
- challenge/session
- response time where allowed
- peer-marking completion
- teacher override flag

Teacher summaries should support:

- class average by question
- mark distribution
- strongest/weakest mapped learning objectives
- commonly missed mark points where structured scheme data supports this

Student summaries should support:

- own total
- own per-question score
- strengths/review areas

## 13. Security and authorisation

Required checks:

- challenge teacher owns/is authorised for selected class
- student belongs to class
- join code is valid for the specific challenge
- challenge status allows joining
- current question belongs to challenge
- answer student matches authenticated student
- submission only during allowed state
- mark scheme withheld before lock
- marker cannot access identity beyond allowed anonymous projection
- marker cannot mark own answer
- teacher override restricted to authorised teacher/admin
- internal source audit fields omitted from student/board payloads
- all state-changing endpoints use transaction/compare-and-set semantics where race conditions are possible

## 14. Edge cases

Must be explicitly tested:

- wrong code
- student from wrong class
- duplicate join
- duplicate answer submit
- teacher refresh
- student refresh
- realtime disconnect/reconnect
- teacher ends question with missing submissions
- all submitted auto-close
- late join enabled/disabled
- student joins after earlier rounds
- odd number of participants
- participant disconnects before peer marking
- no safe peer assignment possible
- teacher override after peer mark
- teacher cancellation
- required question visual unavailable
- insufficient eligible question pool

## 15. Implementation phases

### Phase 1 — Foundation

- canonical plan (this document)
- schema/migration
- shared status/types
- state-machine validation
- authorisation/service contract
- peer-assignment primitive
- unit/contract tests

**Phase 1 acceptance**

- invalid state transitions rejected
- duplicate participant/answer prevented
- canonical question FK preserved
- self-marking structurally prevented
- mark scheme not exposed in active-question student projection

### Phase 2 — Teacher builder

- Live Challenges navigation
- Create flow
- chapter/section filtering
- eligible question pool
- auto/manual selection
- settings
- publish

### Phase 3 — Student dashboard + lobby

- dashboard card
- code join
- teacher waiting room
- board waiting screen

### Phase 4 — Live question engine

- start/next controls
- board-safe state
- student question state
- realtime notifications
- reconnect recovery

### Phase 5 — Answers

- answer editor
- idempotent submit
- counts
- lock
- end-question controls

### Phase 6 — Mark scheme + peer marking

- post-lock scheme exposure
- anonymous peer assignment
- mark-point UI
- submit mark
- teacher review/override

### Phase 7 — Results + analytics

- round leaderboard
- mark distribution
- final results
- LO analytics
- student history

### Phase 8 — Production hardening

- multi-browser E2E
- race-condition tests
- security tests
- reconnect tests
- Board mode smoke test
- provider/runtime verification

## 16. E2E definition of done

A release candidate is not complete until an automated or explicitly recorded E2E proves:

`Teacher create → Publish → Student sees → Join → Start → Same canonical question on board/student → Submit → Lock → Mark scheme reveal → Anonymous peer mark → Score → Next question → Finish → Analytics`

At minimum the E2E harness should simulate:

- Teacher browser
- Board browser
- Student A
- Student B

## 17. Product completion rule

The feature is not considered complete because individual screens exist.

Completion requires all of the following:

- canonical Cambridge source fidelity preserved
- secure teacher/student authorisation
- server-authoritative session state
- reconnect-safe runtime behavior
- mark-scheme secrecy
- no self-marking
- persisted assessment evidence
- teacher moderation path
- analytics integration
- passing unit/integration/E2E gates
- production runtime verification

## 18. Implementation record

All implementation changes for Cambridge Live Challenge must be checked against this plan. If the product requirement changes, update this plan first or in the same reviewed change so code and product intent do not silently diverge.
