# Cambridge 9618 syllabus catalogs

These files provide the source-backed syllabus taxonomy used by real-paper ingestion. They are deliberately versioned by the examination year of the source paper.

## Version boundaries

- `9618-2021-2023.json` covers examination years 2021, 2022 and 2023.
- `9618-2024-2025.json` covers examination years 2024 and 2025.
- Do not fall back from an older paper to the currently active syllabus version. Source staging fails closed if exactly one syllabus version does not cover the paper year.

The version split follows Cambridge International's 9618 syllabus page, which states that the updated 2021-2023 syllabus is for June/November 2021, 2022 and 2023, and publishes 2024-2025 as the next syllabus period.

## Source hierarchy

1. **Cambridge International AS & A Level Computer Science 9618 Scheme of Work, Version 2, for examination from 2021** supplies the 20-unit structure and learning-objective wording used by the shared fragments.
2. **Official Cambridge 9618 syllabus for 2024-2025** supplies the examination-period boundary, canonical syllabus references/content structure, assessment scope and documented later-content updates.
3. Real Cambridge 2021 question-paper front pages were used to cross-check component duration and total marks.

The Scheme of Work itself says it is one possible teaching approach and that the syllabus should be checked for course content. For that reason these catalogs use the official syllabus for version/scope rules while retaining Scheme-of-Work learning-objective wording where the later syllabus did not change the content.

## Fragment model and later overrides

The shared taxonomy is stored once:

- `9618-sections-01-08.json`
- `9618-sections-09-12.json`
- `9618-sections-13-18.json`
- `9618-sections-19-20.json`

Version descriptors reference those fragments. `9618-2024-2025.json` overrides only the affected subtopic objective lists:

- **6.1 Data Security** — the official later syllabus explicitly includes biometrics among authentication/security measures and its changes page records the biometrics addition.
- **9.2 Algorithms** — the later syllabus explicitly clarifies producing a flowchart/written description from pseudocode.

`syllabus-catalog-loader.ts` assembles the shared fragments, applies version-specific overrides and validates the complete result before any DB write.

## Internal learning-objective IDs

Codes such as `19.1-lo-01` are **CamPath internal ordinal identifiers**. Cambridge provides syllabus reference codes such as `19.1`, but the Scheme of Work does not assign an individual official code to every learning-objective sentence. The internal IDs must never be presented as Cambridge-issued codes.

## Component coverage

`topics.component_id` remains a compatibility/primary-component pointer. Authoritative assessment coverage is many-to-many:

- `component_topics` maps a topic to every component that assesses it.
- `component_learning_objectives` narrows component scope where a topic is only partially assessed.

For 9618:

- Paper 1: sections 1-8
- Paper 2: sections 9-12
- Paper 3: sections 13-20
- Paper 4: sections 19-20, with the documented exclusions in 20.1 represented at LO level.

In `20.1`, the low-level programming LO and declarative programming LO are mapped only to component 3. Practical imperative/OOP objectives inherit `[3,4]` from the topic.

## Component metadata

The catalog stores A Level weighting in the current `weight_pct` field: 25% for each of the four components. At AS Level, Papers 1 and 2 are each 50% of the AS qualification; the current database schema has one weighting field, so the catalog keeps the A Level weighting used by the existing project model.

Durations / marks:

- Paper 1: 90 minutes / 75 marks
- Paper 2: 120 minutes / 75 marks
- Paper 3: 90 minutes / 75 marks
- Paper 4: 150 minutes / 75 marks

## Import safety

Catalog import is dry-run by default. A write requires `CONFIRM_SYLLABUS_CATALOG_IMPORT=YES` and `--write`. The importer rejects overlapping validity ranges and refuses to overwrite a populated exact syllabus version.
