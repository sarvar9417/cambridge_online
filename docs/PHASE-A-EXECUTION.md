# Phase A — Question Bank First Execution Plan

Updated: 2026-08-14

This is the actionable companion to `DATA-MASTER-PLAN.md`.

## Goal

Build and prove a complete, auditable Cambridge 9618 question/mark-scheme corpus for the first supported range before expanding secondary product features.

Initial production target:

- 9618
- 2021–2025
- May/June and Oct/Nov where available
- Papers 1–4
- all available variants
- QP/MS mandatory; IN/SF/GT linked where applicable

## Workstream A — Source inventory

### A1. Drive inventory parser

Produce normalized records:

```ts
interface SourceInventoryRow {
  syllabus: '9618' | '9608';
  year: number;
  series: 'MJ' | 'ON' | 'FM';
  component: 1 | 2 | 3 | 4;
  variant: number;
  kind: 'QP' | 'MS' | 'IN' | 'SF' | 'GT';
  driveFileId: string;
  fileName: string;
  sourceFolder: string;
}
```

Acceptance:

- duplicate filenames do not silently overwrite one another
- merged convenience PDFs are marked separately from canonical variant files
- 9608 and 9618 are never mixed
- unsupported/unparseable names are reported for review

### A2. Expected-paper matrix

Group inventory by:

`syllabus + year + series + component + variant`

For each group report QP/MS/supporting-file coverage.

## Workstream B — Database inventory

Create a read-only report that summarizes the live bank by source paper:

- source metadata
- root count
- leaf count
- total leaf marks
- number of mark schemes
- mark-scheme coverage percentage
- topic/subtopic coverage percentage
- unresolved validation findings
- review status

No data mutation in this step.

## Workstream C — Drive ↔ database reconciliation

For each canonical Drive QP/MS pair classify the corresponding database record:

- `COMPLETE`
- `PARTIAL`
- `MISSING`
- `DUPLICATE`
- `CONFLICT`

Conflict examples:

- same paper metadata but different source hash
- mark total mismatch
- same source reference mapped to two leaves
- QP exists but incorrect MS attached

## Workstream D — Reference-paper regression standard

Use one 9618 paper that has both QP and MS and enough variety to exercise:

- nested question parts
- shared parent context
- table/code/diagram assets
- multiple topic mappings
- `any_n_from_m`
- dependencies between subparts

Acceptance suite must prove:

1. source metadata exact
2. question hierarchy exact
3. total marks exact
4. every leaf has correct mark scheme
5. context chain portable
6. assets preserved
7. topic/subtopic mapping reviewed
8. dependencies represented
9. arbitrary safe leaves selectable
10. selection renumbers correctly
11. `context_only` = zero marks
12. online assignment and PDF use the same effective question set

## Workstream E — Question Bank UI consolidation

Port/reconcile from `monorepo-main` into the canonical `main` architecture without wholesale architecture migration:

- Parts view
- Families view
- filters
- context-chain preview
- dependencies
- persistent basket
- `graded` / `context_only`
- review/renumber screen

Required filters for Phase A:

- component
- Hodder-linked topic/subtopic
- year range
- series
- variant
- marks range
- command word
- AO
- answer kind / diagram
- full-text search
- dependency status

## Workstream F — Ingestion hardening

Sequence:

`DISCOVER -> PAIR -> PREPARE -> SEGMENT -> EXTRACT_QP -> EXTRACT_MS -> MATCH -> ASSETS -> CLASSIFY -> DEPENDS -> VALIDATE -> CROSSCHECK -> REVIEW -> APPROVE`

Mandatory fail-closed conditions:

- wrong paper total
- leaf without MS
- missing ancestor
- missing required asset
- no topic/subtopic mapping
- uncertain or invalid scheme structure
- broken dependency

## Workstream G — Coverage dashboard

Owner-facing matrix showing all targeted papers and their state.

A paper can display `COMPLETE` only when:

- canonical QP present
- canonical MS present
- all expected leaves extracted
- total marks match
- 100% leaf MS coverage
- 100% leaf topic/subtopic coverage
- context/assets/dependencies valid
- no unresolved blocking findings
- human review complete

## Priority order

1. Source inventory
2. Database inventory
3. Reconciliation report
4. Reference paper regression suite
5. Consolidated Question Bank UI
6. Ingestion fixes exposed by the reference paper
7. Batch ingestion 2021–2025
8. Coverage dashboard to 100%
9. Assignment/PDF polish
10. AI grading expansion and learning-content expansion

## Non-goals during Phase A

Do not prioritize:

- large-scale slide generation
- new games
- new decorative dashboards
- AI grading autopilot
- architecture rewrite for its own sake

Existing working functionality stays operational; Phase A strengthens the academic data foundation underneath it.
