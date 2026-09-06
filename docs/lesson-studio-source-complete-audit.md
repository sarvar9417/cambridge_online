# Lesson Studio source-complete audit — Chapters 1, 13 and 7

## Scope

This audit covers the three teacher Lesson Studio routes currently exposed by the product:

- Cambridge International AS & A Level Computer Science 9618 — Chapter 1
- Cambridge International AS & A Level Computer Science 9618 — Chapter 13
- Cambridge IGCSE Computer Science 0478 — Chapter 7

The lesson book content remains governed by the existing exact supplied-PDF fidelity contract. This change does not replace the textbook reconstruction; it adds an exam-corpus layer and a board-first presentation layer on top of it.

## Supplied source coverage

The existing fidelity suite pins every page of the three supplied extracts and verifies that every page remains represented in presenter data:

| Lesson | Supplied extract | Page contract |
| --- | --- | ---: |
| 9618 Chapter 1 | Hodder Chapter 1 | 26 / 26 |
| 9618 Chapter 13 | Hodder Chapter 13 | 24 / 24 |
| 0478 Chapter 7 | Watson/Williams Chapter 7 | 41 / 41 |

The contracts also preserve source-specific examples, activities, figures, tables, pseudocode and diagnostic/review material. See `source-file-fidelity.test.ts` and the source atom registries.

## Past-paper coverage contract

Past-paper checkpoints continue to use explicit learning-objective mappings. No loose topic substitution is introduced.

- 9618: checkpoint window 2021–2025, exact historical LO mapping.
- 0478 Chapter 7: checkpoint window 2015–2026 (7.1 begins at 2023), explicit historical/current LO mappings per 7.1–7.9.
- The live database query remains `approved` question only and returns every matching leaf, grouped by year in Lesson Studio.
- Canonical question rendering fails closed if required structured source content or a required visual cannot be resolved.

## Database observations used by this change

Read-only production audit on the `cambridge_online` Supabase project found:

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

The new `CAMBRIDGE EXAM LENS` panels are concise teaching guidance derived from the connected topical notes plus observed QP/MS assessment patterns. They are deliberately labelled as enrichment and never replace the actual per-question mark scheme.

## Teacher workflow changes

1. Source-complete lessons retain the original presenter content.
2. Exam checkpoint slides add an exam-focus panel before the live question inventory.
3. The compact bottom scrubber replaces dozens of tiny slide dots while preserving Previous/Next and keyboard navigation.
4. The toolbar displays the supplied-PDF page audit for the active chapter.
5. Opening a past-paper item now resolves the exact Cambridge display reference directly. This avoids the previous 0478 workspace resolver path that could fall back to the 9618 checkpoint default.
6. The exam workspace renders canonical structured QP content, required parent context and source assets.
7. Mark schemes are hidden until the teacher chooses to reveal them; the existing teacher/projector controls progressively reveal mark points.
8. Mark-scheme status is explicit: reviewed vs source-review-pending.
9. Level descriptors, accept/reject notes, dependencies and benefit-of-doubt metadata are retained where the canonical scheme contains them.

## Non-goals / integrity constraints

- Do not promote `needs_review` mark schemes automatically.
- Do not flatten a question if canonical structured content exists but a required visual is unavailable.
- Do not broaden exact-LO checkpoints with unreviewed semantic guesses.
- Do not replace book content with exam notes; exam guidance is additive.
