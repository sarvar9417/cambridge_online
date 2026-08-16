# 9618 2026 Learning Objective → Hodder mapping

## Status

This mapping is **candidate-only** and must not be used as the production source of truth yet.

The canonical taxonomy remains the Cambridge International AS & A Level Computer Science 9618 syllabus for examination in 2026 (Version 2). Hodder Education (Watson/Williams, ISBN 9781510457591) is supporting teaching context only.

## First pass

The 2026 syllabus subject-content tables were parsed at the left-column `Candidates should be able to` level.

- canonical subtopics: 44
- extracted syllabus learning objectives: 190
- Hodder structural map: 20 chapters / 52 sections / 167 fine-grained units
- first-pass retrieval bands: 42 high / 76 medium / 72 low

`backend/src/database/knowledge/9618-2026-lo-hodder-map.json` stores this first-pass crosswalk.

Legend for each mapping value:

- `p`: primary Hodder unit candidate
- `s`: optional secondary Hodder unit candidates
- `b`: retrieval band (`h`, `m`, `l`)
- `r`: lexical retrieval score; this is **not** a grading/classification confidence

## Important cross-version remaps

The endorsed 2019 textbook and the 2026 syllabus do not always use the same section boundaries. The verified section-level crosswalk therefore includes, among others:

- Hodder `2.1` + `2.2` → Cambridge 2026 `2.1`
- Hodder `7.1` + `7.2` + `7.3` → Cambridge 2026 `7.1`
- Hodder `15.1` + `16.2 Virtual machines` → Cambridge 2026 `15.1`
- Hodder `16.3 Translation software` → Cambridge 2026 `16.2`
- Hodder `17.1`–`17.4` → Cambridge 2026 `17.1`
- Hodder `18.1` + `18.2` → Cambridge 2026 `18.1`

## Safety rule

No question should be persisted to a learning objective solely because of this retrieval file. The ingestion classifier must still receive the official Cambridge LO text, question context, and mark scheme. Low-confidence or conflicting LO mappings must route to review.

## Next review pass

1. Manually review all low-band mappings.
2. Correct medium-band mappings where a Hodder unit boundary is broader/narrower than the 2026 LO.
3. Promote only reviewed mappings to a production-safe reference set.
4. Run one QP/MS reference pair through classification and compare the AI result with the reviewed reference set before widening corpus ingestion.
