# Daily teacher workflow — release contract

Updated: 2026-09-02

This document defines the product path that must stay reliable before broader
feature work is allowed to expand the platform.

## P0 — Teacher: Topic/Subtopic → Cambridge questions → PDF/DOCX

Supported production path:

1. Staff opens **Question Bank**.
2. The bank defaults to **approved** source-backed questions.
3. Paper, Topic, Subtopic, year, series, marks, AO, command word, keyword,
   diagram and dependency filters narrow the corpus.
4. Current 2026-2028 Topic/Subtopic filters match historical 2021-2025 source
   taxonomy by stable qualification/topic/subtopic identity. Historical UUIDs
   are preserved; questions are not rewritten to current taxonomy IDs.
5. Staff previews the portable question before selection. Preview includes the
   source reference, ancestor context, assets and recorded dependencies.
6. The server-side basket stores selected leaves as `graded` or `context_only`.
7. Selection review assigns fresh worksheet numbering while retaining original
   Cambridge references.
8. Dependency preflight must pass before publication/export:
   - `answer_ref` prerequisites must be `graded`;
   - required `text_ref` prerequisites must travel with the selection;
   - unresolved required dependencies block export.
9. Direct **PDF** and editable **DOCX** export use a frozen selection snapshot,
   so later basket changes cannot mutate an already-created document.
10. Required visuals/context fail closed. The renderer must never silently emit
    an incomplete question.

### P0 release invariants

A release is not teacher-ready if any of these fail:

- `npm run verify` is green.
- `backend/src/database/audits/9618-corpus-completion.sql` passes.
- all supplied source-backed mark-bearing leaves remain searchable according to
  their review state and retain a mark scheme.
- question dependency integrity has no missing required answer/practical edges,
  cross-paper edges, self edges or cycles.
- PDF/DOCX totals equal the authoritative selected total.
- source references survive fresh numbering.
- production database migration ledger matches the release branch.

## P1 — Student: current syllabus → safe historical remediation practice

Personalized practice is deliberately stricter than Question Bank search.
Question Bank can show a historical question because the teacher reviews its
full context. A student-generated practice task has no such human checkpoint.

A historical question is eligible for a current 2026-2028 subtopic only when:

1. one of its historical learning objectives has an explicit
   `learning_objective_compatibility` row to an LO in the selected current
   subtopic;
2. the relation is `equivalent`;
3. the current LO is assessed on the same Paper/component number as the source
   question;
4. the question and mark scheme are approved;
5. the question has no recorded question dependency;
6. neither the question nor any ancestor context node has a question asset that
   the legacy practice attempt would fail to carry;
7. at least five safe questions remain.

If fewer than five questions satisfy the contract, the platform returns
`practice_pool_empty`. It does **not** fall back to same-code historical
subtopics and it does not silently use removed historical content.

The initial compatibility seed is intentionally conservative: only normalized
identical official LO wording inside the same 9618 topic/subtopic is promoted
automatically. Broader equivalence requires a separate source-backed reviewed
migration. Historical quantum cryptography remains excluded from 2026-2028.

Coverage is reported by:

`backend/src/database/audits/9618-practice-compatibility.sql`

Incomplete coverage is a product backlog item, not a reason to weaken the
integrity gate.

## Release order

For corpus/taxonomy changes:

1. create a production backup/snapshot;
2. run the existing corpus audit before change;
3. merge only code whose CI is green;
4. apply forward-only migrations in order;
5. run corpus + feature-specific audits after migration;
6. smoke-test owner login and the P0 Question Bank workflow;
7. generate at least one Topic/Subtopic-filtered PDF and verify source refs,
   context, marks and dependency preflight;
8. only then treat the release as daily-teacher ready.

## Product priority

Until the P0 path stays stable under real daily use, new platform features must
not take priority over regressions in Question Bank filtering, portable context,
dependencies, selection persistence, export correctness, authentication or
database availability.
