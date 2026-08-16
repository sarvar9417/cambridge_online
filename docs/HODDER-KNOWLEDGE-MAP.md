# Hodder 9618 knowledge map

This reference map connects the Hodder Education coursebook to CamPath's canonical Cambridge 9618 syllabus taxonomy.

## Authority and scope

- Canonical assessment taxonomy: Cambridge International AS & A Level Computer Science 9618 syllabus for 2026-2028.
- Supporting knowledge source: David Watson and Helen Williams, *Cambridge International AS & A Level Computer Science*, Hodder Education (2019), ISBN 9781510457591.
- The textbook is not treated as the canonical assessment taxonomy. It is used as supporting context for classification, content authoring and review.
- The repository stores structural metadata, headings and source page references only. It does not reproduce textbook body text.

## Why a crosswalk is required

The endorsed Hodder book follows the syllabus order, but its older section boundaries are not identical to the 2026 syllabus. Examples:

- Hodder `2.1 Networking` and `2.2 The internet` both map to canonical `2.1 Networks including the internet`.
- Hodder `7.1`, `7.2` and `7.3` map to canonical `7.1 Ethics and Ownership`.
- Hodder `16.2 Virtual machines (VMs)` maps to canonical `15.1 Processors, Parallel Processing and Virtual Machines`.
- Hodder `16.3 Translation software` maps to canonical `16.2 Translation Software`.
- Hodder `17.1` through `17.4` map to canonical `17.1 Encryption, Encryption Protocols and Digital Certificates`.
- Hodder `18.1` and `18.2` map to canonical `18.1 Artificial Intelligence`.

`backend/src/database/knowledge/hodder-9618-knowledge-map.json` records the complete crosswalk.

## Extracted structure

The map contains:

- 20 textbook chapters
- 52 textbook sections
- 167 numbered fine-grained textbook units
- mappings covering all 44 canonical 2026 syllabus subtopics

Each fine-grained unit stores only:

- its Hodder heading code and title
- printed textbook page
- 1-based PDF page
- its parent Hodder section
- the section's canonical Cambridge subtopic code

## Question-bank ingestion rule

Question classification must persist against the canonical database taxonomy, never against Hodder-only identifiers.

For every mark-bearing question leaf:

1. Extract the question and matching mark scheme.
2. Classify using question context + mark-scheme points + the canonical syllabus catalog.
3. Persist one or more `question_subtopics`, with one primary mapping where appropriate.
4. Persist `question_learning_objectives` when the evidence is sufficiently specific.
5. Keep classification confidence and route ambiguous mappings to review.
6. Use the Hodder map only as additional supporting context for classification/review.
7. Never derive marks from the textbook; the official mark scheme remains authoritative for marking.

This matches the current database model (`question_subtopics`, `question_learning_objectives`, `mark_schemes`, and `mark_scheme_points`) and the existing ingestion classifier.

## Source files

- Hodder Drive file ID: `17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-`
- Cambridge 2026 syllabus Drive file ID: `1JzFMyhPaSvfyvlII1yXF1Av2uDHGtx6p`
- Canonical repo taxonomy: `backend/src/database/syllabus/9618-structure.ts`
- Canonical LO catalog: `backend/src/database/syllabus/9618-catalog.json`

## Next implementation stage

Before mass past-paper ingestion, validate the canonical 2026 learning-objective catalog against the official syllabus. Then run one reference QP/MS pair through the existing ingestion pipeline and inspect its question -> subtopic -> LO mappings. After that pilot passes, widen the corpus incrementally.
