# Glossary Core coverage review — 10 November 2026

## Scope and method

- Target: Cambridge International AS & A Level Computer Science 9618, active database syllabus row labelled `2026-2028`.
- The review filtered to the 9618 syllabus row only; it did not mix 0478 or older syllabus records.
- The Cambridge 2026 syllabus lists the required content for 10.1 Data Types and Records, 10.3 Files, 11.2 Constructs and 12.2 Program Design. The 2026 and 2027–2029 Cambridge guides give the same relevant data-type, selection, loop and text-file constructs for the reviewed items.
- Core eligibility remains unchanged: approved + visible + individually supported evidence. No supplementary item was relabelled as an official textbook Key Term.
- The official Hodder 2019 Chapter 10–12 PDFs were not accessible in the current Project files. The Google Drive connector is disabled by the workspace administrator. Existing Hodder source references were preserved; the additional evidence recorded here is from Cambridge's official syllabus/pseudocode guide, not a claim that the missing Hodder pages were reopened.

## Baseline and decision

The 9618-only baseline contained 44 subtopics. Four sections were at or below four Core terms:

| Subtopic | Before | After | Decision |
|---|---:|---:|---|
| 10.1 Data Types and Records | 4 | 10 | Added the six explicitly listed pseudocode data types: BOOLEAN, CHAR, DATE, INTEGER, REAL, STRING |
| 10.3 Files | 1 | 4 | Promoted Text file, File mode and EOF(file); file commands/modes remain supporting syntax, not separate Core concepts |
| 11.2 Constructs | 0 | 6 | Promoted IF statement, CASE statement, Nested IF and the three syllabus loop types |
| 12.2 Program Design | 4 | 4 | No forced additions; the four official Key Terms already cover structure charts and state-transition concepts. Revisit only when the Hodder Chapter 12 source is available. |

The review promotes 15 existing records. It does not create duplicate rows, change `is_official_key_term`, change `status`, or delete data. The two manual-review entries promoted in 10.1/11.2 were checked against explicit Cambridge pseudocode-guide definitions and their scope in the syllabus.

## Definition policy

Definitions were tightened to express the concept directly:
- CHAR means one character, not only an alphanumeric character.
- STRING explicitly allows zero or more characters.
- REAL is defined by its ability to contain a fractional part.
- EOF is described by its TRUE/FALSE result for remaining lines.
- Pre-condition and post-condition loops distinguish when the Boolean test occurs and whether the body can run zero times.

## Provenance and limitations

Official sources used:
- Cambridge International AS & A Level Computer Science 9618 Syllabus for examination in 2026, pp. 28–29.
- Cambridge International AS & A Level Computer Science 9618 Pseudocode Guide for Teachers for examination in 2026, §2.1 p. 7, §§6–7 pp. 18–21 and §9.1 p. 25.
- Cambridge 9618 Syllabus and Pseudocode Guide for 2027–2029, corresponding sections/pages, available in the Project Library.

The database label `2026-2028` is not Cambridge's published naming convention: Cambridge labels the exam-year syllabus as 2026 and the next syllabus as 2027–2029. The relevant content checked here matches in both documents. Syllabus metadata normalization is a separate task and is not changed by this review.

## Reversibility

- CSV manifest: `glossary-core-coverage-review-20261110.csv`
- Forward SQL: `glossary-core-coverage-review-20261110-forward.sql`
- Rollback SQL: `glossary-core-coverage-review-20261110-rollback.sql`

All changes are UUID-scoped and can be reverted exactly. This review does not merge the PR or claim a production deployment.
