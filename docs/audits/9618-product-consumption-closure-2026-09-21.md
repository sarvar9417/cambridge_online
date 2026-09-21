# Cambridge 9618 Product Consumption Closure — 2026-09-21

## Scope

This closure follows the completed 2021–2026 source-backed corpus release and asks a different question:

> Can every approved Cambridge 9618 scoring leaf be consumed safely by the teacher-facing product paths without weakening source fidelity?

The three paths are:

1. Question Bank / source-backed question detail
2. generated worksheet, paper, PDF and DOCX flows
3. Live Challenge classroom delivery and learning evidence

The canonical Cambridge corpus remains authoritative. Product code may expand context or prerequisite closure, but it must not rewrite question wording, marks, source identity, mark schemes, or syllabus evidence.

## Production baseline before this change

Read-only production audits against the merged corpus returned:

| Gate | Before |
| --- | ---: |
| Approved unique scoring leaves | 2773 |
| Missing question LaTeX | 0 |
| Missing structured content | 0 |
| Canonical mark-scheme blockers | 0 |
| Missing / cross-source / unrenderable structured asset refs | 0 |
| Same-source sibling asset refs outside ancestry | 261 |
| Leaves using those sibling refs | 156 |
| Root scoring leaves excluded by old Live selection | 108 |
| Scoring leaves with required dependencies excluded by old Live selection | 373 |
| Old Live structural pool after those exclusions | 2292 |
| Questions with direct/reviewed current-syllabus LO mapping | 1926 |
| Questions requiring safe current-syllabus subtopic fallback | 847 |
| Questions lacking both explicit LO mapping and stable primary subtopic mapping | 0 |

All 2773 approved scoring leaves have a high-confidence primary subtopic that resolves to the active 2026–2028 syllabus by stable topic number + subtopic code.

## Export / portable asset reconciliation

The old export audit counted every explicit structured asset whose owner row was outside the leaf ancestry as a portable-closure blocker. That produced 261 refs across 156 leaves.

This was stricter than the actual runtime contract.

`PgStaffAwareQuestionsRepository.portable()` already:

- reads explicit asset IDs from structured `content_json`
- resolves missing ancestry assets by exact asset ID
- rejects missing asset rows
- rejects cross-source-paper ownership
- signs private storage paths
- appends the verified sibling asset to the frozen portable snapshot

Therefore same-source, renderable sibling asset references are now reported as resolved informational counts. Only missing, cross-source, or unrenderable references remain release blockers.

Expected production result after the audit update:

- export asset blockers: 0
- sibling refs resolved by portable loader: 261
- affected leaves: 156
- `referenced_assets_requiring_portable_closure`: 0
- `leaves_requiring_portable_closure`: 0

## Live Challenge prerequisite closure

The previous Live Challenge pool intentionally excluded:

- root scoring leaves
- every question having any dependency

That prevented 481 valid Cambridge scoring leaves from entering the classroom pool before other filters were considered.

The new contract treats required question dependencies as part of the assessment unit:

1. teacher selects or auto-selects a scoring leaf
2. backend recursively expands every required dependency
3. dependency targets are verified as approved scoring leaves with approved canonical mark schemes
4. prerequisites are topologically ordered before the dependent question
5. the complete ordered set is frozen into `live_exam_questions`
6. the dependent round exposes only the learner's own earlier answer where Cambridge says to use a previous answer
7. dependency audit evidence/confidence is stripped from learner snapshots

Cycles, missing targets, unapproved targets, missing canonical mark schemes, and oversized bundles fail closed.

Production corpus facts supporting this design:

- dependency-bearing leaves: 373
- required dependency edges: 534
- distinct dependency targets: 413
- missing dependency targets: 0
- unavailable required targets: 0

## Current-syllabus analytics without invented LO mappings

Historical Cambridge syllabi sometimes split or combine learning objectives differently from the active 2026–2028 syllabus.

The production corpus has:

- 1926 questions with a direct active-syllabus LO or an explicitly reviewed compatibility edge
- 847 additional questions without such an LO edge
- all 847 still have a high-confidence primary subtopic that maps exactly by topic number + subtopic code

Migration `0190_live_challenge_subtopic_evidence_fallback.sql` therefore adds a truthful fallback:

- direct current LO → LO evidence + subtopic mastery
- reviewed LO compatibility → target LO evidence + subtopic mastery
- otherwise stable primary subtopic → **subtopic-only evidence**, with `learning_objective_id = NULL`

The fallback never assigns an arbitrary current learning objective.

`mapping_basis` records which path produced the evidence:

- `direct_lo`
- `reviewed_compatibility`
- `stable_subtopic`
- `legacy_lo` for pre-migration rows

Subtopic mastery continues to use Cambridge marks; speed and leaderboard position do not contribute to mastery.

## New release audit

`backend/src/database/audits/9618-product-consumption-readiness.sql` is the consolidated read-only gate.

Current production data, evaluated with the new contract, gives:

| Metric | Result |
| --- | ---: |
| approved_scoring_leaves | 2773 |
| question_bank_latex_blockers | 0 |
| structured_content_blockers | 0 |
| canonical_mark_scheme_blockers | 0 |
| export_asset_blockers | 0 |
| sibling_asset_refs_resolved_by_portable_loader | 261 |
| leaves_using_sibling_asset_resolution | 156 |
| live_root_scoring_leaves | 108 |
| live_dependency_leaves | 373 |
| live_dependency_blockers | 0 |
| live_explicit_current_lo_questions | 1926 |
| live_stable_subtopic_fallback_questions | 847 |
| live_analytics_mapping_blockers | 0 |
| live_structural_ready_questions | 2773 |

## Definition of done

This product-consumption closure is releasable when:

- branch CI / `npm run verify` passes
- migration 0190 dry-run succeeds
- migration 0190 is applied to production in ledger order
- production product-consumption audit returns 2773 structural-ready questions and zero blocker columns
- updated export readiness returns zero true portable-closure blockers
- Vercel preview is READY
- PR merges cleanly to `main`
- final `main` CI and production deployment succeed

This document does not claim a browser-driven two-account teacher/student click-through unless that literal action is actually executed. Automated release contracts, production audits, preview/runtime smoke, and CI are recorded separately.
