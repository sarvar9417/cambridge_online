# Lesson Studio source-complete audit — Chapters 1, 13 and 7

## Scope

This audit covers the three teacher Lesson Studio routes currently exposed by the product:

- Cambridge International AS & A Level Computer Science 9618 — Chapter 1
- Cambridge International AS & A Level Computer Science 9618 — Chapter 13
- Cambridge IGCSE Computer Science 0478 — Chapter 7

The lesson book content remains governed by the exact supplied-PDF fidelity contract. The formal Book Completeness Audit strengthens that contract: page coverage alone is no longer sufficient to label a lesson `Source Complete`.

## Formal Book Completeness Audit

The three exact supplied PDF extracts were independently inventoried by semantic feature family. The audit baseline is committed in `frontend/src/teaching/book-completeness-baseline.ts`; `book-completeness-audit.ts` resolves each expected feature against source evidence and fails closed when any category is incomplete.

| Supplied lesson source | Pages | Formal key terms | Worked examples | Activities | Extension activities | Figures | Tables | Find out more | Links | Pseudocode/code pages | Chapter review / exam-style questions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 9618 Chapter 1 | 26 | 31 | 8 | 9 | 4 | 9 | 9 | 0 | 0 | 0 | 6 |
| 0478 Chapter 7 | 41 | 30 | 7 | 20 | 1 | 22 | 6 | 7 | 4 | 28 | 9 |
| 9618 Chapter 13 | 24 | 18 | 9 | 9 | 6 | 16 | 2 | 0 | 0 | 8 | 5 |

The runtime/CI audit checks all of the following categories separately:

- exact supplied-PDF page fingerprints and per-page source representation;
- chapter objectives and prior-knowledge diagnostics where present;
- every formal key term in the supplied extract;
- an explicit semantic-emphasis inventory for important textbook terminology and labelled concepts that would otherwise be easy to lose when typography is flattened;
- named worked examples;
- activities and extension activities;
- figures and tables;
- `Find out more` and `Link` material where present;
- pseudocode/code-bearing pages where present;
- chapter review / printed exam-style question inventory;
- live Cambridge past-paper checkpoint count.

`semantic_emphasis` is a semantic contract, not a promise to reproduce the book's typography in the student UI. Bold/emphasised textbook concepts are preserved as source evidence and are projected pedagogically; they are not dumped verbatim into a learner activity merely because the original page used bold type.

The teacher toolbar now reports the aggregate formal Book Completeness Audit result. `Source Complete` is only true when every category is complete. A missing key term, worked example, activity, extension, figure/table, sidebar/link, pseudocode evidence item, review item or required checkpoint blocks the complete state instead of being hidden by a `26/26 pages` style badge.

## Supplied source coverage

The exact file-fidelity suite still pins every page of the three supplied extracts by SHA-256 and verifies that every page remains represented in presenter/source data:

| Lesson | Supplied extract | Page contract |
| --- | --- | ---: |
| 9618 Chapter 1 | Hodder Chapter 1 | 26 / 26 |
| 9618 Chapter 13 | Hodder Chapter 13 | 24 / 24 |
| 0478 Chapter 7 | Watson/Williams Chapter 7 | 41 / 41 |

Page fidelity is therefore a necessary condition, but no longer the whole completeness claim.

## Past-paper coverage and enrichment contract

Past-paper checkpoints continue to use explicit learning-objective mappings. No loose topic substitution is introduced.

- 9618 Chapter 1 and Chapter 13: current 2026–2028 targets resolve approved source-backed questions through explicit compatibility, with the released Lesson Studio checkpoint window covering 2021–2026.
- 0478 Chapter 7: checkpoint window 2015–2026 (7.1 begins at 2023), with explicit historical/current LO mappings per 7.1–7.9.
- The live database query remains `approved` question only and returns matching leaves grouped by year in Lesson Studio.
- Canonical question rendering fails closed if required structured source content or a required visual cannot be resolved.

The Book Completeness Audit also keeps the expected current checkpoint count explicit: 17 for Chapter 1, 9 for Chapter 7 and 16 for Chapter 13.

`CAMBRIDGE EXAM LENS` remains a distinct enrichment layer. CI verifies that every declared enrichment key in the three chapter baselines is implemented in `lesson-exam-insights.ts`. Enrichment is derived from the connected topical notes and observed/reviewed QP/MS assessment patterns and is deliberately labelled as guidance rather than textbook content or a substitute mark scheme.

## Database observations retained from the source-complete release audit

The production corpus audit used by the Lesson Studio release found:

- Target 0478 Chapter 7 question set: 211 distinct approved questions with structured content present on all 211.
- Target 9618 Chapter 1/13 question set: 261 distinct approved questions with structured content present on all 261.
- 0478 Chapter 7 matched question/mark-scheme rows are approved in the audited LO sets.
- 9618 has both `approved` and `needs_review` mark schemes in Chapter 1/13 coverage. Review-pending schemes must not be presented as verified Cambridge marking guidance.

The staff question detail API therefore exposes mark-scheme trust metadata and level descriptors. Lesson Studio labels review-pending schemes explicitly and shows latest source-audit evidence when present. It does not promote or rewrite any scheme.

## Google Drive cross-check

The connected Drive contains:

- 0478 question papers and mark schemes, including 2026 variants;
- 9618 Paper 1/2/3/4 aggregate QP/MS collections;
- current/future syllabus and pseudocode guidance;
- topical keyword/exam-note documents for AS and A Level.

The `CAMBRIDGE EXAM LENS` panels are concise teaching guidance derived from the connected topical notes plus observed QP/MS assessment patterns. They remain additive and never replace the actual per-question mark scheme.

## Teacher workflow

1. Source-complete lessons retain the source evidence and exact supplied-file fingerprints.
2. Student-facing projection selects and rewrites presentation only; it does not delete source evidence.
3. Exam checkpoint slides add an exam-focus panel before the live question inventory.
4. The compact bottom scrubber replaces dozens of tiny slide dots while preserving Previous/Next and keyboard navigation.
5. The toolbar exposes the formal Book Completeness Audit result for the active chapter.
6. Opening a past-paper item resolves the exact Cambridge display reference directly.
7. The exam workspace renders canonical structured QP content, required parent context and source assets.
8. Mark schemes remain hidden until the teacher chooses to reveal them; status is explicit and review-pending schemes are not promoted.

## Integrity constraints

- Do not declare `Source Complete` from page count alone.
- Do not silently omit a formal key term or semantic-emphasis anchor from the source evidence layer.
- Do not promote `needs_review` mark schemes automatically.
- Do not flatten a question if canonical structured content exists but a required visual is unavailable.
- Do not broaden exact-LO checkpoints with unreviewed semantic guesses.
- Do not replace book content with exam notes; exam guidance is additive.
- Do not dump the complete source audit into learner-facing activities; source completeness and student presentation remain separate layers.
