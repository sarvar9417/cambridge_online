# CamPath Data Master Plan

Updated: 2026-08-14

## 1. Product principle

CamPath is built around one verified academic graph that connects the Hodder 9618 coursebook, the official Cambridge syllabus, structured past-paper questions, machine-readable mark schemes, student work, and learning content.

The first development priority is **Question Bank First**: the question/mark-scheme corpus must be complete, queryable, and auditable before major expansion of presentations, games, or AI autopilot grading.

## 2. Authoritative source hierarchy

The project uses the following sources for different purposes rather than treating one file as the only truth.

### 2.1 Hodder coursebook — learning structure

Primary source for the student-facing learning organisation:

- chapter
- topic
- subtopic
- explanations
- worked examples
- glossary candidates
- lesson content
- slides/notes/quiz/flashcard/game structure

Drive source:

- `AS & A/9618 Coursebook Book (Hodder Education).pdf`
- Google Docs copy of the same book
- derived chapter files under `AS & A/Chapters/`

Hodder answers: **What do we teach, and in what learning sequence?**

### 2.2 Cambridge syllabus — coverage and validation

The official syllabus is a validation layer and exam specification map.

It is used for:

- syllabus versioning
- AS/A2 and component scope
- learning-objective coverage
- detecting gaps between Hodder content and current Cambridge requirements
- validating generated educational content

Drive source:

- `AS & A/697372-2026-syllabus.pdf`

The syllabus answers: **Does the platform cover the current examination specification?**

### 2.3 Past papers — examination truth

Question papers define the actual exam-question corpus.

Primary dimensions:

- syllabus code
- year
- series
- paper/component
- variant
- question number/path
- marks
- command word
- AO
- answer kind
- assets
- parent context
- dependencies

Drive source:

- `PastPapers/`

The paper answers: **How does Cambridge actually ask this knowledge?**

### 2.4 Mark schemes — marking truth

Mark schemes are stored structurally, not as plain text only.

Each leaf question can have:

- scheme type
- max marks
- guidance
- groups (`any N from M`)
- mark points
- accepted alternatives
- rejected alternatives
- prerequisites
- levels-of-response descriptors

The mark scheme answers: **What exact evidence earns marks?**

## 3. Production corpus scope

### Phase A production corpus

The first complete production dataset is:

- Cambridge Computer Science **9618**
- examination years **2021–2025**
- May/June and Oct/Nov where present
- Papers 1–4
- all available variants
- QP + MS as mandatory pairing
- IN, SF and GT retained as supporting assets where present

### Legacy/reference corpus

`9608` material remains useful for:

- additional practice
- historical question patterns
- teacher reference

but it must be clearly marked as **legacy** and must not silently appear as current 9618 syllabus material.

## 4. Canonical knowledge graph

```text
Hodder Book
  -> Chapter
    -> Topic
      -> Subtopic
        -> Concept / learning unit
           |-> Cambridge syllabus objective(s)
           |-> Past-paper leaf question(s)
           |    -> mark scheme
           |    -> statistics
           |    -> student answers
           |-> Notes
           |-> Slides
           |-> Glossary
           |-> Flashcards
           |-> Quiz
           |-> Games
```

The database must allow one question to map to multiple subtopics. One mapping may be primary; the others are secondary.

## 5. Question model

The searchable and selectable unit is the **leaf question**, not necessarily the whole root question.

Example:

```text
Q4
 |- shared scenario / table / diagram
 |- (a) [2]
 |- (b) [3]
 `- (c)
     |- (i) [2]
     `- (ii) [4]
```

A teacher may select only `Q4(a)` and `Q4(c)(ii)`.

However, all required ancestor context must travel with the selected leaf.

Required behaviour:

1. Preserve root/parent context.
2. Preserve assets attached to relevant ancestors.
3. Do not award marks for context-only nodes.
4. Preserve the original source reference.
5. Renumber selected questions for the new worksheet/assignment.

## 6. Dependency resolution

Some leaf questions depend on another answer, for example:

- `Using your answer to part (a)...`
- `Complete the table from part (b)...`

These are not ordinary context dependencies.

Each dependency must be represented explicitly.

When a dependent leaf is selected, the UI must offer the teacher a safe choice:

- include the required previous part as a graded question
- exclude the dependent question
- include only non-answer context when that is sufficient

A dependent answer reference must never be silently dropped.

## 7. Question-bank metadata

Every approved leaf question should support the following dimensions where applicable:

- syllabus code/version
- level: AS/A2
- component/paper
- year
- series
- variant
- original source reference
- question path
- marks
- command word
- AO
- answer kind
- topic/subtopic links (many-to-many)
- optional learning-objective links
- inherited context chain
- assets
- dependency links
- mark scheme
- review status
- usage count
- class usage history
- empirical difficulty
- average score
- average completion time

Difficulty and performance fields must be derived from student data, not invented at import time.

## 8. Question selection and basket

Teacher workflow:

```text
Filter/search
 -> select leaf questions
 -> resolve dependencies
 -> review inherited context
 -> basket
 -> renumber
 -> create online assignment OR export PDF
```

Selection roles:

- `graded` — contributes marks
- `context_only` — printed/displayed but contributes zero marks

The basket must survive filter changes and page reloads.

## 9. Paper coverage matrix

A dedicated admin view is required to prove dataset completeness.

Example:

```text
Year / Series    P1          P2          P3          P4
2023 M/J         ✓           ✓           ✓           ✓
2023 O/N         ✓           ✓           ✓           ✓
2024 M/J         ✓           ✓           ✓           ✓
```

Each paper/variant expands to a validation record:

- QP present
- MS present
- IN present if required
- SF present if required
- all question roots extracted
- all mark-bearing leaves extracted
- leaf mark total equals the original paper total
- every leaf has an MS entry
- every leaf has at least one topic/subtopic mapping
- context chain valid
- assets present
- dependencies reviewed
- human review complete

Only then can a paper be marked **COMPLETE**.

## 10. Ingestion pipeline

Target pipeline:

```text
DISCOVER
 -> PAIR QP/MS/supporting files
 -> PREPARE PDF
 -> SEGMENT
 -> EXTRACT QUESTION TREE
 -> EXTRACT MARK SCHEME
 -> MATCH QP <-> MS
 -> EXTRACT ASSETS
 -> CLASSIFY TOPICS/SUBTOPICS
 -> DETECT DEPENDENCIES
 -> VALIDATE
 -> CROSS-CHECK
 -> HUMAN REVIEW
 -> APPROVE
```

### Validation must fail closed

At minimum:

- paper mark total mismatch -> review
- leaf without MS -> review
- missing parent -> review
- missing diagram/table asset -> review
- missing topic/subtopic mapping -> review
- uncertain scheme type -> review/manual-only
- broken dependency -> review

## 11. Assignment and PDF invariants

When selected leaves are used in a new assignment or PDF:

- required inherited context is included automatically
- irrelevant siblings are excluded
- original source reference remains available
- fresh worksheet numbering is generated
- `context_only` contributes zero marks
- final total is calculated by the server

Exports must support:

- Question Paper
- Mark Scheme
- Combined
- Topic Pack
- Answer Sheet
- Feedback Report

## 12. Versioning and historical integrity

Published assignments must not change retroactively if the canonical question or mark scheme is edited later.

Before/at publish, the system must preserve the effective version/snapshot used for grading.

Historical student results must remain reproducible.

## 13. Branch strategy

### Canonical product branch

`main` remains the canonical product branch for now because it already contains the broader working application: assignments, student attempts, grading, analytics, export foundations, content foundations and production deployment.

### `monorepo-main`

Do **not** merge it wholesale into `main`.

It is a reference/feature-source branch whose valuable question-bank and ingestion work should be selectively ported into `main`.

Priority items to port/reconcile:

1. official 9618 syllabus seed
2. current topic/subtopic data
3. real paper transcript fixtures
4. question contract tests
5. improved ingestion validation
6. parts/families question-bank views
7. portable context-chain logic
8. question dependencies
9. persistent selection basket
10. `graded` / `context_only` roles
11. selection review and renumbering
12. Drive paper inventory/download tooling

No production schema rewrite should be performed merely to imitate the monorepo architecture.

## 14. Existing evidence to reconcile

Current repository status reports already contain real data and implementation work that must be preserved and audited rather than discarded.

Known evidence includes:

- existing source papers
- structured questions
- structured mark schemes
- mark points
- student submissions
- working `main` production flows
- newer question-bank/ingestion work on `monorepo-main`

The reconciliation phase must identify duplicates and schema differences before any migration or deletion.

## 15. Initial execution plan

### Step 0 — Safety baseline

- keep `main` deployable
- take/verify database backup before schema/data reconciliation
- no destructive migration
- no bulk delete

### Step 1 — Drive inventory

Build a machine-readable inventory for the supplied Drive source:

- Hodder/course material inventory
- syllabus inventory
- 9618 2021–2025 QP/MS/IN/SF/GT inventory
- legacy 9608 inventory
- missing-pair report

### Step 2 — Database inventory

Report:

- source papers by year/series/component/variant/kind
- question roots and leaves per paper
- total marks per paper
- mark-scheme coverage
- topic/subtopic coverage
- validation/review status

### Step 3 — Reconciliation report

For each expected Drive paper classify database state as:

- COMPLETE
- PARTIAL
- MISSING
- DUPLICATE
- CONFLICT

### Step 4 — Reference paper

Choose one complete 9618 paper and make it the regression standard for:

- exact question tree
- context inheritance
- assets
- topic mapping
- mark scheme
- dependencies
- selection
- renumbering
- assignment
- PDF

### Step 5 — Batch ingestion

Only after the reference paper passes all acceptance checks, scale to the remaining 2021–2025 corpus.

### Step 6 — Coverage target

Do not call Phase A Question Bank complete until the coverage dashboard proves the selected 9618 corpus is complete and reviewed.

## 16. Definition of Done — Question Bank First

Phase A is complete when a teacher can:

1. choose any supported 9618 year/series/paper/variant;
2. filter questions by Hodder-linked topic/subtopic and exam metadata;
3. select arbitrary independent leaf parts;
4. receive required parent context/assets automatically;
5. receive dependency warnings where answer dependencies exist;
6. export a correctly renumbered PDF;
7. create an online assignment from the same selection;
8. open the correct machine-readable mark scheme for every graded leaf;
9. see that coverage/validation reports contain no unresolved blocking gaps.

Only after this milestone should learning-content expansion and AI grading automation become the primary development focus.
