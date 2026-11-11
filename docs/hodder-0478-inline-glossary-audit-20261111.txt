# Hodder 0478 inline vocabulary audit — 2026-11-11

## Scope and source

- Original user-supplied **Cambridge IGCSE and O Level Computer Science, Second Edition**, David Watson and Helen Williams, Hodder Education (2021), ISBN **9781398318281**.
- Source PDF: **403 pages**; printed page numbers are 12 less than their PDF page number for the chapter content.
- The complete machine-readable source text was traversed in five-line-window batches, covering all **20,218 extracted text lines**. The closing **Index** was also sampled and cross-referenced against the active glossary.
- The Index yielded **583 raw entries / 497 distinct normalised labels** in an initial parse; these figures include repeated references, secondary headings, cross-references and aliases, **not 497 necessarily missing vocabulary concepts**.
- Selection rule: only meaningful computer-science concepts suitable as stand-alone term/definition game items; distinguish **printed Key Terms** from supplementary concepts and explicitly mark **Extension** discussion that is beyond the core syllabus.

## Live Supabase result

| Measure | Result |
| --- | ---: |
| Cambridge 0478, 2026–2028 glossary records | 571 |
| Official Hodder Key Terms (not reclassified) | 354 |
| Supplementary terms | 217 |
| **New source-anchored inline concepts added in this audit** | **58** |
| Of these 58, ordinary chapter-body concepts | 39 |
| Of these 58, labelled textbook **Extension** concepts | 19 |
| Approved glossary records | 571 |
| Unapproved records | 0 |
| Empty definitions | 0 |
| Records without Hodder section links | 0 |

These are records **in the live database at audit time**, not all asserted to be verbatim Hodder definitions. The new English definitions are concise editorial explanations grounded in the cited discussion, not copies of publisher prose.

## Distribution of the 58 new entries

| Hodder chapter | Newly added |
| --- | ---: |
| 1 — Data representation | 8 |
| 2 — Data transmission | 4 |
| 3 — Hardware | 13 |
| 4 — Software | 4 |
| 5 — The internet and its uses | 5 |
| 6 — Automated and emerging technologies | 5 |
| 7 — Algorithm design and problem-solving | 5 |
| 8 — Programming | 6 |
| 9 — Databases | 3 |
| 10 — Boolean logic | 5 |
| **Total** | **58** |

## Data policy

- Each new term contains `term`, `definition_en`, `source_ref`, `subtopic_id`, `status='approved'`, `is_official_key_term=false` and `definition_evidence_status`, and is explicitly linked to a Hodder section.
- Core-body concepts: `definition_evidence_status='supplementary_targeted_verified'`, eligible for the **Core** game bank.
- Textbook Extension material: `definition_evidence_status='supplementary_source_screened'`, therefore **excluded from Core but included in Extended** via the current `selectQualityGameTerms` quality filter.
- Source references include **printed page, PDF page, chapter and section**. Extension terms remain separate; they are not part of the claimed 354 official Key Terms.
- Existing Cambridge 9618 records and 0478 official keyword records were not replaced. The `0478` syllabus activation flag was not changed.

## Reproducibility

- `docs/hodder-0478-inline-glossary-20261111.csv` — 58-item editorial source ledger, including page references, chapter, section, definition and Extension flag.
- `backend/src/database/migrations/0216_0478_hodder_inline_glossary.sql` — idempotent insert and Hodder-section-link migration. SQL was validated with a PostgreSQL `EXPLAIN` against the current database.
- The database already contains these records. Running the migration again will not insert duplicate labels in the same chapter.
- The older 389-item Hodder 0478 manifest represents the **initial reviewed seed**, not the total live glossary after later chapter-body additions.

## Boundaries of the audit

This work **does not claim** that every possible teaching concept in all 403 pages has been exhaustively indexed: the Index has subentries and cross-references, figures and diagrams may contain additional labels, and deciding which example phrases are worthwhile vocabulary is pedagogically subjective. The PDF text scan and source-ledger review were performed, but full page-by-page visual/manual transcription of each graphic was not. Further index-to-glossary classification and optional figure-label audit should be a separately tracked QA task; do not relabel the entire 403-page book as 100% manually audited on the strength of this text-first pass.
