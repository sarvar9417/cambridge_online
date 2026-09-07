# Uploaded Source Everything Contract

## Goal

Every teaching-relevant item in a teacher-supplied source file must have an explicit destination in the lesson system. Page coverage alone is not enough.

The contract distinguishes:

- `lesson` - chapter/unit content that must be represented in a real lesson route
- `shared_support` - course-wide teaching guidance reused across lessons
- `navigation` - contents/section dividers that are accounted for but are not teaching content
- `reference` - cover/title/index material that remains source metadata/reference
- `excluded` - only clearly non-instructional publishing/marketing material, always with an explicit reason

A source file can report `complete` only when every PDF page is classified exactly once and every `lesson` or `shared_support` range has a real delivery destination.

## Exact current uploads

| Source | Exact PDF pages | Required delivery pages | Current delivered pages | Status |
| --- | ---: | ---: | ---: | --- |
| 9618 Chapter 1 - Information representation and multimedia | 26 | 26 | 26 | complete |
| 9618 Chapter 13 - Data representation | 24 | 24 | 24 | complete |
| 0478/0984/2210 full coursebook | 404 | 390 | 47 | blocked |
| **Total** | **454** | **440** | **97** | **blocked until the full 0478 book is lesson-backed** |

The exact full-book binary supplied on 2026-09-07 contains 404 PDF pages. Pages 403-404 are publisher back-matter/marketing and are explicitly classified rather than silently ignored.

## Full 0478 book accountability

Teaching/support coverage that is already delivered:

- PDF pp.7-12 - shared course guide (aims, assessment, book features, exam/pseudocode guidance and command words)
- PDF pp.270-310 / printed pp.258-298 - Chapter 7, Algorithm design and problem solving

Teaching ranges that remain blocked and must be built before the file can be `Source Complete`:

- Chapter 1 - PDF pp.14-56 / printed pp.2-44
- Chapter 2 - PDF pp.57-86 / printed pp.45-74
- Chapter 3 - PDF pp.87-158 / printed pp.75-146
- Chapter 4 - PDF pp.159-191 / printed pp.147-179
- Chapter 5 - PDF pp.192-228 / printed pp.180-216
- Chapter 6 - PDF pp.229-268 / printed pp.217-256
- Chapter 8 - PDF pp.311-350 / printed pp.299-338
- Chapter 9 - PDF pp.351-367 / printed pp.339-355
- Chapter 10 - PDF pp.368-398 / printed pp.356-386

This is intentionally fail-closed: Chapter 7 can remain individually source-complete while the full uploaded coursebook remains visibly incomplete.

## Required teaching feature families

For IGCSE/O Level source chapters, the inventory must preserve the book's teaching structure, including learning outline, chapter introduction, activities, worked examples, Find out more, Advice, Links, Extension, Summary, Key terms, exam-style questions, pseudocode/programming-language examples, figures, tables and core chapter content.

For the supplied 9618 extracts, the inventory also requires chapter objectives, What you should already know, Key terms, worked examples, Activities, Extension Activities, figures, tables, calculations/pseudocode where present, chapter review and Cambridge past-paper enrichment.

## Student presentation rule

`SOURCE COMPLETE` does not mean dumping the source onto the student screen. Exact/source evidence remains separate from learner presentation. The delivery sequence is:

`source evidence -> pedagogical selection -> clear lesson step -> student activity/evidence`

The source audit is teacher/system-facing and fails closed when material is missing; the learner surface remains concise and understandable.
