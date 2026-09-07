# CamPath Data Master Plan

Updated: 2026-09-07

> **Current-state authority:** this document defines the durable data architecture,
> source hierarchy and Question Bank invariants. Live release counts, the current
> verified corpus target and runtime acceptance state are recorded in
> [`../PROJECT-STATE.md`](../PROJECT-STATE.md) and its executable audit files. When
> a historical scope or count in this plan differs from the canonical current-state
> manifest, `PROJECT-STATE.md` is authoritative for release status.

## 1. Product principle

CamPath is built around one verified academic graph that connects the Hodder 9618 coursebook, the official Cambridge syllabus, structured past-paper questions, machine-readable mark schemes, student work, and learning content.

The first development priority is **Question Bank First**: the question/mark-scheme corpus must be complete, queryable, and auditable before major expansion of presentations, games, or AI autopilot grading.

Question Bank First remains a permanent data-quality principle even after the initial corpus milestone: new source windows must enter through the same source-complete, auditable gates rather than bypassing them because the product already has lessons or student flows.

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

## 3. Corpus scope and release semantics

CamPath separates **historical/source-backed inventory** from the **strict current-target release gate**. These are related but are not interchangeable counts.

### 3.1 Historical/base 9618 corpus

The original Phase A production baseline was:

- Cambridge Computer Science **9618**
- examination years **2021–2025**
- May/June and Oct/Nov where present
- Papers 1–4
- all available variants
- QP + MS as mandatory pairing
- IN, SF and GT retained as supporting assets where present

This window remains valuable historical practice and source evidence. It is no longer the definition of the current release window by itself.

### 3.2 Strict current-target release

The current release model extends the source corpus into **2026** and validates the current target independently from the historical inventory.

For 9618, the strict current release gate is executable:

- `backend/src/database/audits/9618-current-release-state.sql`
- production assertion: `assert_source_verified_year_v1('9618', 2026)`

The gate checks the expected current paper/MS pairing, source-complete mark-bearing questions, policy blocks, source integrity and dependency integrity. Exact current counts and audit timestamps belong in `PROJECT-STATE.md`; this plan deliberately does not duplicate them as long-lived constants.

A release must never be called current merely because historical questions exist. The strict current-target audit must pass for the target syllabus/year.

### 3.3 Historical question -> current learning-objective compatibility

Historical Cambridge questions may remain useful after the syllabus learning-objective catalogue advances. They must not be silently relabeled as if they were written for the new syllabus version.

The permitted model is:

```text
historical source question
  -> preserved original source identity
  -> explicit reviewed compatibility edge
  -> current learning objective
  -> lesson / Question Bank use
```

Compatibility must be explicit and auditable. A broad topic similarity is not enough to substitute a question for an exact learning point.

Lesson checkpoints therefore use current learning objectives while preserving the question's original Cambridge syllabus/year/series/component/variant identity. If no approved exact/compatible question is available, the product fails closed rather than showing a loosely related substitute.

### 3.4 Legacy/reference corpus

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

A question's source identity and its current learning-objective compatibility are separate facts. Updating curriculum mapping must not rewrite the original source identity.

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
 -> create online assignment OR export PDF/DOCX
```

Selection roles:

- `graded` — contributes marks
- `context_only` — printed/displayed but contributes zero marks

The basket must survive filter changes and page reloads.

A selection is a handoff boundary: the same source question identity, required context, asset requirements and dependency decisions must survive into online assignment, mock, PDF and DOCX output.

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

Historical coverage and strict current-target coverage must be reported separately. A broad historical inventory count must not make a missing current QP/MS pair appear complete.

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

A new examination year or series must enter through this same gate. Existing production coverage is not permission to bypass source verification for future material.

## 11. Assignment and PDF/DOCX invariants

When selected leaves are used in a new assignment or document:

- required inherited context is included automatically
- irrelevant siblings are excluded
- original source reference remains available
- fresh worksheet numbering is generated
- `context_only` contributes zero marks
- final total is calculated by the server
- unresolved required visual assets block incomplete student/document output

Exports must support the product's required document forms, including:

- Question Paper
- Mark Scheme
- Combined
- Topic Pack / worksheet where supported
- Answer Sheet where supported
- Feedback Report where supported

Current implemented export capabilities and readiness belong in `PROJECT-STATE.md` and executable export audits, not in historical milestone assumptions.

## 12. Versioning and historical integrity

Published assignments must not change retroactively if the canonical question or mark scheme is edited later.

Before/at publish, the system must preserve the effective version/snapshot used for grading.

Historical student results must remain reproducible.

Curriculum compatibility mappings may evolve, but they must not rewrite the immutable original question source reference stored in a published assignment snapshot.

## 13. Branch strategy

### Canonical product branch

`main` remains the canonical product branch because it contains the integrated application: Question Bank, Lesson Studio, assignments, student attempts, grading, analytics, export/content foundations and production-hardening work.

Repository governance for `main` is a separate release concern: CI being present is not equivalent to branch protection. Current governance status must be verified from GitHub repository settings/rulesets rather than inferred from this plan.

### Historical feature-source branches

Older feature/source branches such as `monorepo-main` must not be merged wholesale merely to reproduce an old architecture.

Useful work is selectively reconciled into the canonical product model only after checking whether it is already present, superseded or incompatible with current source/release contracts.

Historically valuable areas included:

1. official syllabus/catalog data
2. topic/subtopic data
3. real paper transcript fixtures
4. question contract tests
5. ingestion validation
6. parts/families Question Bank views
7. portable context-chain logic
8. question dependencies
9. persistent selection basket
10. `graded` / `context_only` roles
11. selection review and renumbering
12. source paper inventory/download tooling

No production schema rewrite should be performed merely to imitate a historical branch architecture.

## 14. Existing evidence and canonical release evidence

Repository status reports, migrations and production audits contain real implementation/data evidence that must be preserved and audited rather than discarded.

Known evidence includes:

- source papers
- structured questions
- structured mark schemes and mark points
- source assets
- student submissions
- working integrated `main` flows
- historical/current learning-objective compatibility
- executable source/current-release audits
- executable selection-to-mastery regression coverage

For **current** release conclusions use this precedence:

1. `PROJECT-STATE.md` for recorded release/runtime state;
2. executable audits, migrations, tests and current CI evidence;
3. this plan for durable architecture/invariants;
4. historical implementation/milestone snapshots.

Duplicate or conflicting source records must be reconciled before destructive migration or deletion.

## 15. Execution model after the initial Phase A baseline

The original inventory/reconciliation steps remain useful for every new source window, but the project is now beyond its initial 2021–2025 ingestion milestone.

### Step 0 — Safety baseline

- keep `main` releasable
- verify database backup/recovery posture before destructive reconciliation
- no destructive migration without explicit evidence
- no bulk delete merely to make counts agree

### Step 1 — Source inventory

For each new examination window build/refresh a machine-readable source inventory:

- Hodder/course material where relevant
- current syllabus/version
- expected QP/MS/supporting-file pairs
- legacy/reference material separately
- missing-pair report

### Step 2 — Database inventory

Report separately for historical inventory and strict current target:

- source papers by year/series/component/variant/kind
- question roots and leaves per paper
- total marks per paper
- mark-scheme coverage
- topic/subtopic/LO coverage
- validation/review status
- required assets/dependencies

### Step 3 — Reconciliation report

For each expected source paper classify database state as:

- COMPLETE
- PARTIAL
- MISSING
- DUPLICATE
- CONFLICT

### Step 4 — Regression reference

Maintain at least one source-complete reference path that proves:

- exact question tree
- context inheritance
- assets
- taxonomy/LO mapping
- mark scheme
- dependencies
- selection
- renumbering
- assignment
- document export

The broader product also has a release-level HTTP regression for the academic handoff from question selection through released result/mastery; both levels are required because they protect different failure classes.

### Step 5 — Batch ingestion / future release windows

Only after the relevant reference/audit gates pass should a new paper window scale into production.

Future years are staged/reviewed with the same fail-closed policy; they are not automatically trusted because earlier years are complete.

### Step 6 — Current-target coverage gate

A release scope is complete only when the executable current-target audit proves the expected paper/MS pairs and question-level source/dependency integrity for that target.

Historical inventory breadth must be reported separately from this gate.

## 16. Definition of Done — Question Bank data foundation

The durable Question Bank foundation is healthy when a teacher can:

1. choose any **supported** 9618 year/series/paper/variant within the approved source inventory;
2. filter questions by Hodder-linked topic/subtopic, current-compatible learning objectives and exam metadata;
3. select arbitrary independent leaf parts;
4. receive required parent context/assets automatically;
5. receive dependency warnings where answer dependencies exist;
6. export a correctly renumbered source-faithful document for supported formats;
7. create an online assignment from the same selection;
8. open the correct machine-readable mark scheme for every graded leaf under the applicable visibility rules;
9. see that the **strict current-target** coverage/validation audit contains no unresolved blocking gaps;
10. preserve original historical source identity even when a reviewed compatibility edge maps the question to a current learning objective.

Current completion evidence is not encoded as a permanent number in this plan. It must come from `PROJECT-STATE.md`, `backend/src/database/audits/9618-current-release-state.sql`, export/source audits and current CI.

Once this foundation is green for a release window, learning-content and AI-assisted workflows may build on it, but they must not weaken the source-complete or fail-closed gates.
