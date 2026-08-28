# 9618 source-backed Topic Review provenance

This review is a systematic source-backed taxonomy review. It is **not** recorded as human review.

Authoritative syllabus sources supplied in the project owner's Google Drive folder:

| Syllabus period | Drive file | Drive ID | SHA-256 |
| --- | --- | --- | --- |
| 2021–2023 | `9618_Syllabus.pdf` | `15_D_UaglzxqqK2NGAHboy_K-T3HbTUW5` | `978df926e9d4f6d1756105d321c1af5dd4bb9672207e5b268206e10133dfa2e5` |
| 2024–2025 | `9618 Computer Science-2024-2025-syllabus.pdf` | `1dFGZ2_wOYyQhcvpdVa0IN2x9bV3WQ1ZG` | `2f7deb2d66ca68bf30f517ce20681f0dd7af96f2c44aa775df9da21c0188d817` |
| 2026 | `697372-2026-syllabus.pdf` | `1JzFMyhPaSvfyvlII1yXF1Av2uDHGtx6p` | `bf1b77a2b765d10eb4b005ecae0412add35cf6113ba3218a517893abfc9f2470` |

Corroborating (non-authoritative) Drive sources:

- `Topical_Keywords_AS` — `1rz_son9f5rRA42bLYUItZDOVDVC3ayjjX2F-8-fyptc`
- `Topical_Keywords_A_Level` — `19_jmOfzf87_GcJp7dt5xJJTKxWb-V1ckCjZUKNTS-mo`
- `Topical_Keywords_A_Level_2` — `1OeziUfM6lJVvpRL8CVyeMMnX57_gDVYX4uR_GNFhg0g`
- `9618_Scheme_of_Work_(for_examination_from_2021).pdf` — `15EE067B_kL-qBrR94Fzp3tkYzryGWbyC`

Official Question Papers and Mark Schemes in the supplied `PastPapers` folder remain the question-level evidence source. The production database already contains those source-backed QP/MS records; this review does not alter question text, marks, references, assets, or mark-scheme content.

## Safety rules

1. A 2021–2023 question is classified only against the 2021–2023 syllabus taxonomy/LO rows.
2. A 2024–2025 question is classified only against the 2024–2025 syllabus taxonomy/LO rows.
3. Component coverage is enforced: Papers 1/2 use AS topics 1–12; Papers 3/4 use A Level topics 13–20.
4. The old mapping is a weak prior only; low confidence is never promoted merely by increasing its confidence value.
5. Question stem, context, marks, source reference, assets, dependencies and mark scheme are immutable in this workflow.
6. Every applied row is old-hash guarded and written to `question_taxonomy_review_history` before taxonomy mutation.
7. `reviewed_at` / `reviewed_by` are not set by this automated source-backed workflow.
8. `questions.status` becomes `approved` only when both a historical-syllabus-valid primary subtopic and at least one historical-syllabus-valid LO pass the source-review gate.
