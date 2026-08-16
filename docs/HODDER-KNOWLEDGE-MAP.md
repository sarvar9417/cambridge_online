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

`backend/src/database/knowledge/hodder-9618-lo-crosswalk.json` maps **every LO currently present in `9618-catalog.json`** to one or more Hodder unit codes from the verified source index:

- 203 current internal LO codes mapped
- 44 canonical subtopics covered
- 167 Hodder fine units available

The older `hodder-9618-knowledge-map.json` remains only as a compatibility artifact while the source index is introduced; new validation and LO mapping use the verified source index.

The crosswalk is deliberately one-way:

`canonical LO -> supporting Hodder references`

Questions are never persisted against Hodder IDs. Hodder IDs are evidence/context only.

## Catalog audit finding

The current internal `backend/src/database/syllabus/9618-catalog.json` is usable but is not yet a lossless transcription of every 2026 syllabus candidate statement. The audit recorded confirmed omissions without renumbering existing LO codes.

Examples include:

- `3.2`: defining the functions of NOT/AND/OR/NAND/NOR/XOR gates
- `6.1`: appreciation of the need for data/system security
- `11.1`: pseudocode declarations/assignment/input/output and built-in/library routines
- `11.2`: justifying loop-structure choice
- `11.3`: appropriate procedure/function use and parameters
- `12.3`: locating/identifying/correcting errors
- `13.3`: binary representation rounding errors
- `20.1`: meaning of a programming paradigm

These are stored under `catalogAudit` in the crosswalk. **Do not silently renumber existing LO codes**, because question mappings may depend on them. Any repair should be additive and reviewed before broad corpus classification.

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
- every current canonical LO is mapped exactly once
- no LO points at an unknown or out-of-scope Hodder source
- the important 2026 structural moves remain explicit

This prevents later catalog/map edits from silently breaking ingestion classification.

## Source references

- Hodder Drive file ID: `17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-`
- Cambridge 2026 syllabus Drive file ID: `1JzFMyhPaSvfyvlII1yXF1Av2uDHGtx6p`
- Canonical structure: `backend/src/database/syllabus/9618-structure.ts`
- Current internal LO catalog: `backend/src/database/syllabus/9618-catalog.json`

## Next gate

Before mass ingestion:

1. repair/approve the audited LO-catalog gaps additively
2. run one real 2025 QP/MS reference pair through extraction -> matching -> classification -> validation -> persist
3. manually inspect question -> subtopic -> LO results
4. only then widen the corpus incrementally
