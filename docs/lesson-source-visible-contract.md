# Lesson Studio source-visible contract

## Purpose

Lesson Studio is a classroom presentation and complete teaching source. The supplied textbook extract is the primary knowledge contract; past papers and mark schemes enrich that teaching sequence but never replace it.

## Required visibility invariant

A source item is **not** counted as taught merely because it exists in a registry, source trace, fingerprint manifest, transcript, hidden drawer, collapsed `<details>`, audit file, or test fixture.

For Chapters 1, 7 and 13, every curated source atom from the supplied PDFs must be reachable on the normal presentation canvas as visible teaching material. This includes:

- chapter objectives and prior knowledge;
- concepts and explanations;
- formal key terms and definitions;
- tables and figure facts;
- worked examples and exact worked values;
- activities and extension activities;
- end-of-chapter / exam-style source questions;
- source-specific caveats and cross-links.

The presenter may still keep provenance/fingerprint metadata in a secondary source trace, but that trace does not satisfy the teaching-visibility requirement.

## Presentation rule

Source atoms are grouped by their mapped teaching slide and presented as a clear `TEXTBOOK SOURCE` section. Concept/detail atoms use explanatory bullet treatment; worked examples use worked-example treatment; activities/review items use task treatment; tables/figures are labelled as source data/visual evidence. Source page and source reference remain visible.

## Exam integration

Historical Cambridge past-paper questions remain attached to the exact subtopic/learning objective and appear after the concept sequence they assess. Their mark schemes are teacher-reveal material. Source textbook content must remain complete even when no exact historical question exists.

## Completion gate

A chapter can be described as source-complete only when tests prove that every registered source atom is present in the main teaching model and the normal renderer exposes that model without requiring the source drawer/transcript.
