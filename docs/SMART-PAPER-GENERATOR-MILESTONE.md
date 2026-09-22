# Cambridge 9618 Smart Paper Generator — Milestone

## Product goal

Turn the closed 2021–2026 Cambridge 9618 corpus into a teacher workflow that starts with Question Bank filters and ends with a source-faithful paper that can immediately become:

- PDF worksheet
- editable DOCX
- online assignment
- mock exam

The generator does **not** synthesize or rewrite Cambridge questions. It selects from the approved canonical corpus and hands the result to the existing selection/review/export pipeline.

## Teacher workflow

1. Open Question Bank.
2. Choose any supported 9618 filters: Paper, topic, subtopic, year, series, marks range, command word, diagram, AO, dependency mode, or text search.
3. Select **Auto paper**.
4. Enter the target total marks.
5. Optionally select a class and exclude questions already used with that class.
6. Optionally supply a deterministic seed.
7. Generate.
8. Review fresh numbering, source references, dependencies, context-only prerequisites and final marks.
9. Export PDF/DOCX or continue to online/mock assignment creation.

## Source-fidelity rules

A candidate leaf is admitted only when all of these are true:

- syllabus is Cambridge 9618
- source is a QP from 2021–2026
- canonical variant is 1–3
- scoring leaf is approved
- body is promoted to LaTeX
- structured v1 content exists
- an approved canonical mark scheme exists
- canonical mark-scheme max marks equal the question marks

No generator action modifies the canonical question, mark scheme, taxonomy, source paper, LaTeX, asset or provenance records.

## Question-family rule

The first-stage planner treats a matched root family as an atomic selection unit. If several matching scoring leaves belong to the same Cambridge root question, the planner does not silently choose only one of those matched siblings.

This protects paper coherence before explicit dependency expansion.

## Dependency rule

After first-stage selection, explicit question dependencies are expanded transitively.

- `answer_ref` prerequisite → **graded**
- `text_ref` prerequisite → **context_only**
- a prerequisite that is also selected directly is upgraded to **graded**
- prerequisites are placed before the dependent question
- cycles fail closed
- unavailable/unapproved/non-scoring prerequisite targets fail closed
- graded prerequisites without a valid canonical mark scheme fail closed

The final selection is then passed through the existing `buildSelectionReview()` preflight. Publication/export is rejected if that preflight is not clean.

## Reproducibility

The planner is deterministic for a given candidate pool + seed.

The review screen records:

- target marks
- final marks
- candidate pool size
- graded item count
- context-only item count
- seed
- any target/dependency warnings

A teacher can reuse a seed to reproduce the same first-stage selection under the same filters and corpus state.

## Existing product reuse

The generator deliberately creates a normal server-side `selection`.

That means the generated paper automatically inherits the existing hardened paths for:

- dependency review
- fresh numbering
- original source references
- portable question/context/assets
- PDF export
- DOCX export
- assignment creation
- mock creation

No parallel export or assignment implementation is introduced.

## Production corpus readiness

Read-only production audit on 2026-09-22:

| Metric | Result |
| --- | ---: |
| scoring leaves | 2773 |
| approved scoring leaves | 2773 |
| generator-ready leaves | 2773 |
| LaTeX blockers | 0 |
| structured-content blockers | 0 |
| canonical-MS blockers | 0 |
| dependency edges | 534 |
| dependency blockers | 0 |
| root families | 822 |
| missing primary subtopic | 0 |
| missing learning objective | 0 |

Audit:
`backend/src/database/audits/9618-smart-paper-generator-readiness.sql`

## Deliberate AO limitation

The production corpus currently has explicit AO labels on only a small minority of the 2773 scoring leaves. Therefore the generator does not pretend that AO balancing is complete corpus-wide.

AO remains a supported filter when the teacher explicitly chooses it. Automatic paper quality is instead based on:

- requested total marks
- coherent root families
- topic/subtopic diversity
- command-word diversity
- gentle recency preference
- source-backed dependency closure

A future AO backfill should be a separate source-backed corpus project before AO ratios become a default automatic balancing criterion.

## Definition of done

This milestone is releasable when:

- backend/frontend typecheck passes
- generator unit/service/route tests pass
- full `npm run verify` passes
- production readiness audit remains 2773/2773 and zero blockers
- Vercel preview is READY
- preview smoke succeeds
- PR is current with main and merges cleanly
- final main CI succeeds
- production Vercel deployment is READY
