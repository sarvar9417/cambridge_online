# Post-corpus product readiness

Updated: 2026-08-28

The Cambridge 9618 source-backed corpus completion phase is finished. This document records the next product-facing gate so that corpus integrity and runtime product behavior are not confused.

## Completed corpus gate

Production has been re-checked with the repository blocking audit in `backend/src/database/audits/9618-corpus-completion.sql`.

Verified source-backed corpus state:

- 118 QP records and 118 matching MS records for the supplied 2021–2025 set
- 2,985 mark-bearing question leaves
- every supplied QP totals 75 marks
- every matching MS totals 75 marks
- 8,850 aggregate marks
- zero missing mark schemes
- zero bad primary-subtopic cardinality failures
- zero missing historical LO mappings under the blocking audit
- zero cross-version/out-of-component taxonomy failures
- low-confidence taxonomy mappings remain explicitly review-gated rather than force-promoted
- residual non-deterministic/manual rubrics are explicitly reason-classified
- final deterministic mark-scheme capacity/group/dependency checks pass

The corpus itself should not be mutated further unless new Cambridge source material or a source-backed inconsistency is found.

## Product-facing finding: practice is version-bound

`AssignmentsService.createPractice()` currently selects questions only through the exact `subtopic_id` supplied by the student's class taxonomy.

That is correct for persisted taxonomy integrity: historical questions must remain attached to the syllabus version of their source paper. However, it also means that a class on the 2026–2028 syllabus cannot directly draw historical 2021–2025 questions merely because the visible subtopic code is the same.

A live production audit on 2026-08-28 found:

| Syllabus version | Subtopics | Practice pools with >=5 eligible questions | Pools with 1–4 | Pools with 0 |
| --- | ---: | ---: | ---: | ---: |
| 2021–2023 | 44 | 5 | 7 | 32 |
| 2024–2025 | 44 | 39 | 3 | 2 |
| 2026–2028 | 44 | 0 | 0 | 44 |

Both active production classes currently use the 2026–2028 syllabus, so the existing weakest-subtopic `Mashq` action has no source-backed historical pool to select from.

## Why we must not fix this by remapping historical questions

The corpus audit deliberately enforces version-aware question taxonomy. Reassigning historical question rows to 2026 UUIDs would destroy that invariant and would make source papers appear to assess a later syllabus version.

Visible subtopic labels are also not sufficient proof of full content equivalence across versions. For example, historical `17.1` includes quantum cryptography while the 2026 canonical 17.1 content does not. A runtime compatibility layer therefore needs source-backed LO/content compatibility, not a blind `subtopic.code = subtopic.code` fallback.

## Next implementation gate

Build a **version-safe practice compatibility layer** that leaves persisted question taxonomy unchanged.

Required behavior:

1. The student's class syllabus remains the target syllabus.
2. The question remains attached to its historical source syllabus.
3. Historical questions are eligible only when their assessed LO/content is compatible with the target syllabus.
4. Removed content must be excluded (for example historical quantum cryptography for a 2026 target).
5. Compatibility must be auditable and source-backed; do not infer it solely from matching subtopic codes.
6. `createPractice()` should select from the compatibility layer and preserve the existing approved-question/approved-MS/manual-answer-kind safeguards.
7. Tests must prove both positive compatibility and explicit exclusions.
8. A production audit should report per-target-subtopic eligible pool size after the compatibility layer is introduced.

## Recommended data shape

Prefer an explicit, reviewable compatibility relation rather than changing `question_subtopics`:

```text
syllabus_lo_compatibility
- source_lo_id
- target_lo_id
- compatibility_kind   # equivalent | narrower_source | explicitly_excluded
- evidence             # concise source-backed rationale
- reviewed_at
- reviewed_by
```

Runtime practice selection can then require an allowed compatibility row between at least one historical LO assessed by the question and an LO in the student's target subtopic/component.

This design keeps historical assessment metadata truthful while making the completed corpus usable by current classes.

## Documentation debt noticed after corpus merge

`IMPLEMENTATION-STATUS.md` and the old "Current real-corpus snapshot" / "Next gate" sections in `docs/HODDER-KNOWLEDGE-MAP.md` still describe the pre-backfill state. They should be refreshed in the same product-readiness stream, but those stale paragraphs are documentation debt rather than corpus defects.
