# Hodder 9618 knowledge map

This reference layer connects the Hodder Education coursebook to CamPath's canonical Cambridge International AS & A Level Computer Science 9618 taxonomy.

## Authority

The source-of-truth order is:

1. Cambridge 9618 syllabus/specimen/official mark schemes.
2. CamPath canonical syllabus/subtopic records.
3. Hodder Education as a supporting knowledge source.

The Hodder book is useful for concept context and review, but its 2019 section boundaries are **not** used as the database assessment taxonomy. The repository stores structural metadata, headings and page references only; it does not copy textbook body text.

## Extracted source structure

`backend/src/database/knowledge/hodder-9618-source-index.json` is the verified compact source index and records:

- 20 Hodder chapters
- 52 Hodder sections
- 167 numbered Hodder fine-grained units
- coverage of all 44 current Cambridge 2026 canonical subtopics
- printed-book page and 1-based PDF page references
- explicit unit/section scope status where older Hodder material is moved or outside 2026 scope

The extraction was checked against the rendered textbook pages, not only plain-text extraction, because several headings wrap across lines in the PDF.

## 2026 structural crosswalk

Important moves/consolidations include:

- Hodder `2.1 Networking` + `2.2 The internet` -> canonical `2.1 Networks including the internet`.
- Hodder `7.1`, `7.2`, `7.3` -> canonical `7.1 Ethics and Ownership`.
- Hodder `16.2 Virtual machines (VMs)` -> canonical `15.1 Processors, Parallel Processing and Virtual Machines`.
- Hodder `16.3 Translation software` -> canonical `16.2 Translation Software`.
- Hodder `17.1`, `17.3`, `17.4` -> canonical `17.1 Encryption, Encryption Protocols and Digital Certificates`.
- Hodder `18.1 Shortest path algorithms` + `18.2 AI/ML/DL` -> canonical `18.1 Artificial Intelligence (AI)`.
- Hodder `10.2.3`/`10.2.4` search/sort material is conceptually assessed under canonical `19.1` in 2026.
- Hodder `17.2 Quantum cryptography` is marked outside the 2026 canonical subject-content scope.

## Learning-objective crosswalk

`backend/src/database/knowledge/hodder-9618-lo-crosswalk.json` maps the current internal syllabus LOs plus the audited additive 2026 overlay to supporting Hodder unit/section codes:

- 203 existing internal LO codes preserved unchanged
- 12 audited 2026 syllabus statements added in `backend/src/database/syllabus/9618-2026-lo-additions.json`
- 215 total LO codes mapped to Hodder references
- 44 canonical subtopics covered
- 167 Hodder fine units available

The older `hodder-9618-knowledge-map.json` remains only as a compatibility artifact while the verified source index is introduced; new validation and LO mapping use `hodder-9618-source-index.json`.

The crosswalk is deliberately one-way:

`canonical LO -> supporting Hodder references`

Questions are never persisted against Hodder IDs. Hodder IDs are evidence/context only.

## Additive 2026 LO overlay

The audit found 12 syllabus statements that were not explicitly preserved in the current internal catalog. They are kept in a separate overlay so existing LO codes are never silently renumbered.

Affected subtopics include `3.2`, `6.1`, `11.1`, `11.2`, `11.3`, `12.3`, `13.3` and `20.1`.

Examples include gate functions, pseudocode declarations/input/output, library routines, loop-choice justification, procedure/function usage and parameters, error identification/correction, floating-point rounding errors and the meaning of a programming paradigm.

The existing additive/idempotent LO importer can apply the overlay. Dry-run first:

```bash
npm run syllabus:lo-apply --workspace=backend -- --file=backend/src/database/syllabus/9618-2026-lo-additions.json
```

Write only after the dry-run matches every subtopic:

```bash
CONFIRM_SYLLABUS_LO_APPLY=YES npm run syllabus:lo-apply --workspace=backend -- --file=backend/src/database/syllabus/9618-2026-lo-additions.json --write
```

## Question-bank ingestion rule

For every mark-bearing question leaf:

1. Extract the full question tree and matching official mark scheme.
2. Match QP leaf to MS entry.
3. Classify against canonical Cambridge subtopics first.
4. Use mark-scheme points as strong evidence for classification.
5. Use Hodder unit headings/page references only as additional concept context.
6. Persist `question_subtopics`; one may be primary and others secondary.
7. Persist `question_learning_objectives` only when the evidence is sufficiently specific.
8. Keep confidence and route ambiguity to review.
9. Official mark scheme remains authoritative for grading; Hodder never determines marks.

## Automated integrity check

`backend/src/database/knowledge/hodder-9618-knowledge.test.ts` verifies that:

- the 20/52/167/44 source inventory stays intact
- every base + additive 2026 LO is mapped exactly once
- no LO points at an unknown or out-of-scope Hodder source
- the important 2026 structural moves remain explicit

This prevents later catalog/map edits from silently breaking ingestion classification.

## Source references

- Hodder Drive file ID: `17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-`
- Cambridge 2026 syllabus Drive file ID: `1JzFMyhPaSvfyvlII1yXF1Av2uDHGtx6p`
- Canonical structure: `backend/src/database/syllabus/9618-structure.ts`
- Current internal LO catalog: `backend/src/database/syllabus/9618-catalog.json`
- Audited additive LO overlay: `backend/src/database/syllabus/9618-2026-lo-additions.json`

## Next gate

Before mass ingestion:

1. dry-run and then apply/approve the additive LO overlay
2. run one real 2025 QP/MS reference pair through extraction -> matching -> classification -> validation -> persist
3. manually inspect question -> subtopic -> LO results
4. only then widen the corpus incrementally
