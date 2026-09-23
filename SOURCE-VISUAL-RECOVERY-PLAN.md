# 9618 Source Visual Recovery Plan

Status: implementation branch `fix/source-visual-recovery`  
Production mutation: **not applied by this branch**  
Baseline: `main@4c1b96b02e4888681e63b7339521b6d5a5045553`

## 1. Why the earlier "65 missing visuals" count was misleading

The first inventory classified a visual as present only when `question_assets.storage_path` or
`content_md` contained an inline SVG. The canonical schema also has `svg_markup`, which is
already used by the source-fidelity repair pipeline.

Production audit shows:

- 60 assets already contain a renderable source-faithful SVG in `svg_markup`.
- 5 assets are genuinely unresolved when `storage_path`, `content_md`, and `svg_markup`
  are all evaluated.
- Of those 5, four belong to approved Cambridge 9618 questions and must be recovered.
- The fifth belongs to an archived legacy/manual question and must stay quarantined rather
  than being invented or promoted into learner-facing content.

Therefore the release target is **zero unresolved visuals on approved learner-facing questions**,
not "force all 65 rows to receive new files".

## 2. Genuine unresolved production inventory

| Asset | Question | Source | Page | Status | Action |
|---|---|---|---:|---|---|
| `e798f5c0-f449-4dc6-8b94-f1e87ef562be` | `9618/22/O/N/22 Q2(b)` | `9618_w22_qp_22.pdf` | 4 | approved | recover verified state-transition diagram/table |
| `37725cd5-035f-43ae-b01d-013cc38bdadc` | `9618/31/O/N/22 Q4` | `9618_w22_qp_31.pdf` | 5 | approved | recover verified compiler-stage matching visual |
| `296cb706-6ea4-4bda-8559-8aa23a6aabf4` | `9618/31/O/N/22 Q7(a)` | `9618_w22_qp_31.pdf` | 7 | approved | recover shared blank K-map |
| `427d42ea-4da5-4eb9-bdca-fb4200481d70` | `9618/31/O/N/22 Q7(b)` | `9618_w22_qp_31.pdf` | 7 | approved | recover shared blank K-map |
| `67b60df2-b032-4640-a24b-115b8f43a7a5` | `LEGACY/9618/11/M/J/26 Q19(a)` | legacy/manual | 1 | archived | keep excluded; do not invent a diagram |

The four official repairs are SHA-guarded in
`backend/src/database/migrations/0194_verified_source_visual_recovery.sql`.

## 3. Recovery principles

1. **Source first.** A learner-facing visual must originate from the recorded Cambridge source,
   a stored source asset, or a source-faithful verified redraw. Prose descriptions are never
   treated as visuals.
2. **Fail closed.** If a required visual cannot be rendered, assignment/live/generator delivery
   must reject the question rather than serving incomplete content.
3. **Preserve provenance.** Question IDs and asset IDs are unchanged. Repairs update the asset
   body only and are guarded by question ID + source-paper SHA-256.
4. **One readiness contract.** Storage-backed images, inline SVG in `content_md`, and verified
   SVG in `svg_markup` are handled by one shared predicate/runtime helper.
5. **No production-wide generic migration.** Existing migration-ledger drift remains a known
   constraint. Migration 0194 must be reconciled and applied deliberately, never via a blind
   `npm run db:migrate` on production.

## 4. Product gates implemented

The implementation branch makes source readiness authoritative in:

- Question Bank diagram presence/filtering.
- Selection/generator eligibility.
- Assignment creation/start serialization.
- Lesson checkpoint delivery.
- Live Challenge auto/manual selection and final creation.
- Results serialization.
- Portable source assets and private storage signing.

A source visual is learner-renderable only when:

- a private storage asset can be signed into a browser URL, or
- a complete SVG is present in the canonical inline source.

A storage path without a usable browser URL is not considered ready at runtime.

## 5. Database recovery

Migration `0194_verified_source_visual_recovery.sql` repairs the four approved assets.

Each repair:

- checks the exact canonical question ID;
- checks the source paper SHA-256;
- writes source-faithful SVG into `svg_markup`;
- sets `crop_status='not_needed'`;
- clears stale crop errors;
- recalculates content hash and byte size;
- verifies the expected row count and aborts on mismatch.

No archived legacy row is promoted or silently reconstructed.

## 6. Verification gates before merge

Required:

- `npm run verify` is green.
- SQL readiness predicate tests cover storage, direct SVG, fenced SVG, XML-prefix SVG,
  `svg_markup`, prose rejection, and browser URL readiness.
- Manual builder and auto generator cannot select unresolved approved visuals.
- Assignment and Live Challenge creation fail closed when an explicitly requested question has
  an unresolved required visual.
- Lesson checkpoint does not advertise prose placeholders as diagrams.
- The database audit in
  `backend/src/database/audits/source-visual-recovery-readiness.sql` reports:
  - current production pre-migration: 4 approved unresolved + 1 archived legacy unresolved;
  - expected post-0194: 0 approved unresolved;
  - the archived legacy row remains excluded from learner-facing status.

## 7. Production rollout

1. Merge this PR only after CI is green.
2. Deploy application code first; this is safe because it tightens fail-closed behavior.
3. Reconcile production migration ledger explicitly.
4. Dry-run migration 0194 against a production-equivalent database or a transaction rollback.
5. Apply migration 0194 deliberately.
6. Run the recovery audit.
7. Verify the four repaired questions in Question Bank and Lesson Studio.
8. Run a Live Challenge smoke test containing at least one repaired visual.
9. Confirm Vercel runtime logs have no new visual/signing errors.

## 8. Definition of done

The source-visual incident is closed when:

- all approved visual-dependent 9618 questions are source-renderable;
- no learner-facing flow emits raw SVG/prose placeholders;
- unresolved visual questions fail closed everywhere;
- recovered visuals retain source-paper provenance and exact asset IDs;
- the single remaining unresolved row is archived legacy content and cannot enter student,
  assignment, generator, checkpoint, or Live Challenge delivery.
