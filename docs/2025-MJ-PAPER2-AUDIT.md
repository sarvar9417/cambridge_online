# 2025 May/June Paper 2 controlled corpus audit

This document records the controlled source-backed work for Cambridge 9618/21, /22 and /23 from May/June 2025.

## Rules

- Official QP/MS is authoritative for question wording, marks and mark-point structure.
- These papers remain attached to the `2024-2025` syllabus tree.
- Paper 2 taxonomy is restricted to topics 9-12 and their component learning-objective coverage.
- Every mark-bearing leaf must have exactly one primary subtopic.
- Learning objectives are written only from the same syllabus version and only when their owning subtopic is selected.
- Published `Max n` mark schemes preserve all atomic Cambridge MPs and use `any_n_from_m`; distinct MPs are not collapsed merely because the maximum is lower than the number of available points.
- A question already used in assignments/answers/gradings is not destructively rewritten without a compatibility plan.

## 9618/21/M/J/25

Source QP Drive ID: `1Po8la8reZISgGIobKNkIbu-o6-myDcy7`  
Source MS Drive ID: `1xSlJ94k5saUc7OlNx-RpCMhD_GjHugO9`

The paper was already persisted, so it was audited in place rather than re-ingested.

- 26 question-tree nodes
- 18 mark-bearing leaves
- 75/75 marks
- 18/18 matched mark schemes
- 18 mark-scheme groups
- 88 atomic mark points after source repair
- 29 subtopic rows
- 39 LO rows
- 18/18 leaves have one primary subtopic and at least one LO
- 0 version/component/LO-owner issues

Five composite-point collapses were corrected before any affected question had assignment, answer or grading usage: Q2(a)(i), Q2(a)(ii), Q2(b)(iii), Q5 and Q7(b)(ii). In particular, Q5 now preserves the published MP1-MP10 with Max 7 instead of combining the push operation and stack-pointer update.

Audit manifest: `backend/src/database/manual-ingestion/9618-s25-21-audit.json`

## 9618/22/M/J/25

Source QP Drive ID: `1AOuGMmsRc6nBfsWzJ5QgREGAC7bzroWE`  
Source MS Drive ID: `1FbB0P1ynkw63m6TPlKW97Au2jyda7KYZ`

- 34 question-tree nodes
- 23 mark-bearing leaves
- 75/75 marks
- 23/23 mark schemes
- 23 groups
- 85 mark points
- 29 subtopic rows
- 35 LO rows
- 5 portable context/assets
- 0 taxonomy issues

Q1(a)(ii) and Q1(b)(ii) are `manual_only` because the published live-series note says all candidates received full marks and the normal mark scheme was not used.

Audit manifest: `backend/src/database/manual-ingestion/9618-s25-22-audit.json`

## 9618/23/M/J/25

Source QP Drive ID: `12NVktwpGifm_C3FVWsFVbHHrTxPeN0yL`  
Source MS Drive ID: `1X1NtUGGY0v8dFfsVs7zT_-3L9bg31H4y`

This paper had source-paper records but no persisted question nodes, so it was ingested manually from rendered official QP/MS pages.

- 31 question-tree nodes
- 21 mark-bearing leaves
- 75/75 marks
- 21/21 mark schemes
- 21 groups
- 89 atomic mark points
- 27 subtopic rows
- 41 LO rows
- 6 portable context/assets for expression/table, stack, linked-list and structure-chart questions
- 21/21 leaves have exactly one primary subtopic
- 21/21 leaves have at least one historical LO mapping
- 0 broken parent links
- 0 mark mismatches
- 0 bad mark-scheme groups
- 0 cross-version mappings
- 0 out-of-component mappings
- 0 LO-owner mismatches

Audit manifest: `backend/src/database/manual-ingestion/9618-s25-23-audit.json`

## Corpus state after Paper 23

Live source-backed 9618 corpus for 2021-2025:

- 118 QP source records
- 10 QPs with persisted mark-bearing leaves
- 260 mark-bearing leaves
- 260/260 with subtopic mappings
- 142/260 with at least one LO mapping (54.6%)
- source-backed structural taxonomy audit: 0 issues

The next batch should continue with audit-before-ingest: first check whether the target paper already has persisted questions, then either source-audit/repair it or perform a small controlled ingestion.
