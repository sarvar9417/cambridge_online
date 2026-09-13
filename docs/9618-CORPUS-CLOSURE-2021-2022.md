# 9618 corpus closure: 2021 and 2022

Updated: 2026-09-13

This note records the verified database closure state for the first two years of the 9618 LaTeX corpus rollout. It contains no Cambridge question or mark-scheme text.

## 2021

Status: **CLOSED / READY**

- May/June: 12 official QP variants (`11,12,13,21,22,23,31,32,33,41,42,43`)
- October/November: 10 official QP variants (`11,12,13,21,22,23,31,32,41,42`)
- Total official QP sources represented: **22**
- QP source metadata complete: **22/22**
- Corresponding MS source metadata/pairing complete: **22/22**
- Closure audit result: **22/22 READY**

November 2021 does not have components `33` or `43` in the official session. This is confirmed by the source grade-threshold document `9618_w21_gt.pdf`, which lists components `11,12,13,21,22,23,31,32,41,42` only. Therefore 22, not 24, is the correct complete source count for 2021.

A database audit-log event records the closure as `9618_2021_corpus_closed`.

## 2022

Status: **CLOSED / READY**

- May/June: all 12 QP variants present
- October/November: all 12 QP variants present
- Total official QP sources represented: **24**
- QP source metadata complete: **24/24**
- Corresponding MS source metadata/pairing complete: **24/24**
- Exact-content equivalent QP source rows: **4** (canonical content is shared through `source_paper_equivalences`)
- Closure audit result: **24/24 READY**

The final blocking pass was a source-backed taxonomy review. Low-confidence mappings were either confirmed after review or corrected. Notable corrections included:

- enumerated type -> non-composite user-defined data type objective;
- OOP property declaration -> Programming Paradigms / OOP;
- digital-signature production/checking -> asymmetric-encryption objective rather than certificate-use objective;
- Big-O comparison -> Big-O and algorithm-comparison objectives;
- file-reading tasks -> file-processing objective rather than exception-handling objective;
- imperative search/array/call tasks -> imperative-programming objective;
- genuinely cross-topic OOP + file-processing tasks retain reviewed secondary mappings.

Review history is stored in `question_taxonomy_review_history` under `2022-closure-taxonomy-v2`; confirmed low-confidence mappings also have `audit_log` evidence under `9618_2022_taxonomy_review_confirmed`.

A database audit-log event records the year closure as `9618_2022_corpus_closed`.

## Closure gate used

A source paper counts as READY only when the effective content owner passes the current closure audit for:

- complete source identity/provenance;
- QP/MS pairing;
- complete marked-leaf question tree and correct total marks;
- approved mark schemes matching the paper total;
- structured v1 content;
- promoted source-faithful LaTeX;
- command-word coverage;
- primary subtopic and learning-objective review;
- source provenance pinned per marked leaf;
- no accepted bridge wording/PDF extraction artifacts;
- no unresolved required visual assets.

## Rollout rule

No deployment or merge to `main` is part of this closure. Work remains on `feat/9618-latex-corpus-rollout` until an explicit release decision is made.

With 2021 and 2022 closed, the next chronological corpus year is 2023.
