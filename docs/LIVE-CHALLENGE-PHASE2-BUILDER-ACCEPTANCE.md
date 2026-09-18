# Cambridge Live Challenge — Phase 2 Builder Acceptance

Status: backend slice implemented on Draft PR #258

This document narrows the Phase 2 acceptance surface before the state-machine work begins.
It does not authorize a production migration or deployment.

## Implemented backend flow

`Teacher class → syllabus/topic/subtopic → Create Draft → Eligible Questions → Manual/Auto Select → Reorder/Remove → Publish`

### Draft creation

- only owner/teacher-controlled classes are accepted;
- taxonomy must belong to the class target syllabus;
- draft persists in `live_exam_sessions` with `status='draft'`;
- draft has no room code;
- creation writes a versioned `draft.created` event.

### Question selection

- only approved, independent, marks-bearing questions with an approved Mark Scheme are eligible;
- selected questions must map directly or through reviewed compatibility to the class target syllabus;
- ordered replacement is the single manual mutation primitive;
- omission removes a question and array order defines classroom order;
- duplicate questions and selections above 20 fail closed;
- auto selection is deterministic for the draft id;
- every mutation locks the draft and requires the authoritative `expectedVersion`.

### Assessment snapshots

- `live_exam_questions` remains the only selected-question persistence table;
- the canonical PortableQuestion and approved Mark Scheme are snapshotted;
- signed display URLs are not persisted into immutable snapshots;
- publish revalidates eligibility and refreshes both question and Mark Scheme snapshots before changing state.

### Publish

- publishing an empty draft fails closed;
- publish is a locked expected-version transition;
- a six-digit numeric room code is allocated with collision retry;
- state becomes `published` and `published_at` is recorded;
- publish writes a versioned `challenge.published` event.

## Explicitly not completed in this slice

The following belong to the next state-machine slice and remain intentionally unclaimed:

- `published → lobby` / open-room transition;
- CAS wiring for the legacy start/reveal/marking/next/cancel teacher controls;
- explicit `answers_locked` transition separated from Mark Scheme reveal;
- pause/resume;
- late-join policy enforcement;
- participant removal/leave restrictions;
- frontend builder convergence;
- Preview database migration and browser E2E;
- production migration/merge/deploy.

## Gate to Phase 3

Phase 2 backend is ready to hand off to Phase 3 only when repository `npm run verify` is green on the current PR head. Phase 3 must preserve all existing Live Exam release-security contracts while moving teacher state transitions onto locked `expectedVersion` checks.
