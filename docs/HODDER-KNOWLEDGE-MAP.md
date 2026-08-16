# Hodder 9618 knowledge map

This reference layer connects the Hodder Education coursebook to CamPath's version-aware Cambridge International AS & A Level Computer Science 9618 taxonomy.

## Authority

The source-of-truth order is:

1. Cambridge 9618 syllabus/specimen/official mark schemes.
2. The syllabus version attached to the source paper in CamPath.
3. CamPath component/subtopic/learning-objective coverage for that syllabus version.
4. Hodder Education as supporting knowledge/context only.

The Hodder book is useful for concept context and review, but its 2019 section boundaries are **not** used as the database assessment taxonomy. The repository stores structural metadata, headings and page references only; it does not copy textbook body text.

## Version-aware syllabus trees

The live database intentionally contains separate 9618 trees:

- `2021-2023`: 20 topics, 44 subtopics, 215 historical internal LO rows
- `2024-2025`: 20 topics, 44 subtopics, 219 historical internal LO rows
- `2026-2028`: 20 topics, 44 subtopics, 215 numeric LO rows after the source-backed additive audit

A historical paper must stay attached to its historical syllabus tree. Never remap a 2021–2025 question to a 2026 UUID merely because the visible subtopic code is the same.

Component scope is consistent across the versions:

- Paper 1 -> topics 1–8
- Paper 2 -> topics 9–12
- Paper 3 -> topics 13–20
- Paper 4 -> topics 19–20, with LO-level exclusions represented by `component_learning_objectives`

## Extracted Hodder source structure

`backend/src/database/knowledge/hodder-9618-source-index.json` is the verified compact source index and records:

- 20 Hodder chapters
- 52 Hodder sections
- 167 numbered Hodder fine-grained units
- coverage of all 44 current Cambridge canonical subtopics
- printed-book page and 1-based PDF page references
- explicit unit/section scope status where older Hodder material moved or left the current syllabus

The extraction was checked against rendered textbook pages, not only plain-text extraction, because several headings wrap across lines in the PDF.

## 2026 structural crosswalk

Important moves/consolidations include:

- Hodder `2.1 Networking` + `2.2 The internet` -> canonical `2.1 Networks including the internet`
- Hodder `7.1`, `7.2`, `7.3` -> canonical `7.1 Ethics and Ownership`
- Hodder `16.2 Virtual machines (VMs)` -> canonical `15.1 Processors, Parallel Processing and Virtual Machines`
- Hodder `16.3 Translation software` -> canonical `16.2 Translation Software`
- Hodder `17.1`, `17.3`, `17.4` -> canonical `17.1 Encryption, Encryption Protocols and Digital Certificates`
- Hodder `18.1 Shortest path algorithms` + `18.2 AI/ML/DL` -> canonical `18.1 Artificial Intelligence (AI)`
- Hodder `10.2.3`/`10.2.4` search/sort material is conceptually assessed under canonical `19.1` in 2026
- Hodder `17.2 Quantum cryptography` is outside the 2026 canonical subject-content scope

## Learning-objective crosswalk

`backend/src/database/knowledge/hodder-9618-lo-crosswalk.json` maps the audited 2026 LO set to supporting Hodder unit/section codes:

- 203 existing numeric LO codes preserved unchanged
- 12 source-backed 2026 syllabus statements added additively
- 215 total 2026 LO codes mapped to Hodder references
- 44 canonical subtopics covered
- 167 Hodder fine units available

The crosswalk is deliberately one-way:

`canonical LO -> supporting Hodder references`

Questions are never persisted against Hodder IDs. Hodder IDs are evidence/context only.

## Additive 2026 LO overlay

`backend/src/database/syllabus/9618-2026-lo-additions.json` preserves 12 genuine `Candidates should be able to` statements that were missing from the base numeric catalog. Existing LO codes are never renumbered.

Affected subtopics are `3.2`, `6.1`, `11.1`, `11.2`, `11.3`, `12.3`, `13.3` and `20.1`.

Each overlay objective has explicit `componentNumbers`. The additive importer writes `component_learning_objectives` only when this field is present; it does not guess coverage for older/general catalog files.

Dry-run from the repository root:

```bash
npm run syllabus:lo-apply --workspace=backend -- --file=src/database/syllabus/9618-2026-lo-additions.json
```

Explicit write:

```bash
CONFIRM_SYLLABUS_LO_APPLY=YES npm run syllabus:lo-apply --workspace=backend -- --file=src/database/syllabus/9618-2026-lo-additions.json --write
```

The live 2026 tree was verified after application at **215 LOs** with all **12 overlay LOs** present and **13 explicit component coverage links** (`20.1.2` belongs to both Papers 3 and 4).

## Question-bank ingestion rule

For every mark-bearing question leaf:

1. Resolve the source paper's own syllabus version and component.
2. Extract the full question tree and matching official mark scheme.
3. Match QP leaf to MS entry.
4. Classify only against subtopics allowed by `component_topics` for that exact syllabus version.
5. Classify LOs only against `component_learning_objectives` for that component.
6. Use mark-scheme points as strong evidence.
7. Use Hodder headings/page references only as supporting concept context.
8. Persist one primary subtopic and any genuinely assessed secondary subtopics.
9. Persist an LO only when the question/MS evidence is specific enough; do not force a broad or misleading LO.
10. Official mark scheme remains authoritative for grading; Hodder never determines marks.

`CLASSIFY_V2` already follows the version/component-scoped catalogue rule.

## Source-backed taxonomy audit

Run:

```bash
npm run corpus:taxonomy-audit --workspace=backend
```

The audit blocks source-backed real corpus (`source_papers.source_url IS NOT NULL`) on:

- missing subtopic
- zero/multiple primary subtopics
- cross-syllabus-version subtopic link
- out-of-component subtopic
- cross-syllabus-version LO link
- out-of-component LO
- LO whose owning subtopic was not selected

The Phase-0 synthetic 2026 seed is intentionally excluded from this blocking corpus audit because it has no source URL and is still referenced by demo assignments/answers.

## Production taxonomy repair performed on 2026-08-16

The audit exposed historical data-integrity defects that predated the current V2 classifier:

- 30 cross-version subtopic UUID links were remapped to the same visible code in each source paper's own historical syllabus tree
- 2025 MJ Paper 11 Q4(a) was corrected from out-of-scope `18.1` to primary `6.1` with secondary `3.1`, plus `6.1-lo-03`
- three 2023 Paper 1 AI-recognition questions were corrected from A2 `18.1` to AS `7.1`; no LO was forced because the historical LO granularity did not directly describe recognition mechanics
- one 2023 Paper 1 digital-signature question was corrected from A2 `17.1` to AS `6.1`, with `6.1-lo-04`

After repair, the source-backed structural taxonomy audit returns **0 issues**.

## 2025 MJ Paper 11 pilot

The existing persisted reference pair was audited rather than blindly re-ingested:

- 40 question-tree nodes
- 28 mark-bearing leaves
- 28/28 matched mark schemes
- 75 total marks
- 28/28 leaves have a subtopic
- 28/28 have exactly one primary subtopic
- 27/28 have a defensible LO mapping
- 0 cross-version mappings
- 0 out-of-component mappings

The one LO-less leaf remains intentionally unforced because the historical catalog does not provide a sufficiently precise LO for that exact RAM/performance question.

## Current real-corpus snapshot

At the latest audit:

- 118 source-backed QP records exist for 2021–2025
- only 8 QPs currently have persisted mark-bearing question leaves
- 216 source-backed mark-bearing leaves are persisted
- 216/216 have subtopic mappings
- 98/216 currently have LO mappings (45.4%)
- structural taxonomy audit: 0 issues

This means the next bottleneck is no longer taxonomy integrity. It is controlled ingestion of the remaining source papers plus more precise LO classification where evidence supports it.

## Automated tests

- `backend/src/database/knowledge/hodder-9618-knowledge.test.ts` protects the 20/52/167/44 source inventory, LO crosswalk and structural moves.
- `backend/src/jobs/question-taxonomy-audit.test.ts` protects the source-backed taxonomy audit contract.

## Source references

- Hodder Drive file ID: `17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-`
- Cambridge 2026 syllabus Drive file ID: `1JzFMyhPaSvfyvlII1yXF1Av2uDHGtx6p`
- Cambridge 2024–2025 syllabus Drive file ID: `1dFGZ2_wOYyQhcvpdVa0IN2x9bV3WQ1ZG`
- Canonical 2026 structure: `backend/src/database/syllabus/9618-structure.ts`
- Base 2026 LO catalog: `backend/src/database/syllabus/9618-catalog.json`
- Audited additive LO overlay: `backend/src/database/syllabus/9618-2026-lo-additions.json`

## Next gate

1. Keep `corpus:taxonomy-audit` green.
2. Expand ingestion incrementally from already-staged 2021–2025 QP/MS pairs.
3. After each small batch, inspect extraction, QP↔MS matching, primary/secondary subtopics and LO precision.
4. Raise LO coverage only where the QP/MS evidence supports a specific objective.
5. Widen to the full corpus only after repeated clean batches.
