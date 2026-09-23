# Source Visual Recovery Plan

## Scope

This work closes the remaining question-visual integrity gap after the Live Challenge rendering fix.

The original audit surfaced 65 visual assets with no storage URL and no raw SVG in `content_md`. A deeper source-aware audit shows that this number mixed several different states:

- **60 assets are already source-backed and renderable** through `question_assets.svg_markup` once the browser compatibility layer accepts both direct SVG and XML-prefixed SVG.
- **4 approved Cambridge assets** have no current SVG/storage object but do have verified source-paper provenance and reconstructable `latex_source`.
- **1 legacy asset** has no verifiable Cambridge source and belongs to an **archived** question. It must stay quarantined and must never be promoted as source-faithful content.

Therefore the production objective is not to invent 65 diagrams. It is to make every active Cambridge visual provably renderable, repair the four verified gaps from the exact source papers, and keep the unverifiable legacy row out of student/staff delivery paths.

## Safety and source-fidelity rules

1. Never synthesize a visual when the exact source cannot be verified.
2. Preserve existing question IDs and asset IDs.
3. Verify the source PDF SHA-256 against `source_papers.sha256` before a source repair.
4. Prefer an existing signed storage object or verified SVG markup.
5. For source-page recovery, record `source_page`, `source_bbox`, `content_hash`, `size_bytes`, and `crop_status`.
6. Raw SVG/XML must render as an image, never as learner-visible code.
7. Unrenderable active questions must fail closed and be excluded from Live Challenge/student practice until repaired.
8. Archived legacy questions remain quarantined unless a real Cambridge source is later supplied.

## Verified source gaps

### 9618/22/O/N/22 Q2(b)
- Asset: `e798f5c0-f449-4dc6-8b94-f1e87ef562be`
- Source page: 4
- Source PDF SHA-256 verified against Drive and database
- Visual: state-transition diagram plus completion table

### 9618/31/O/N/22 Q4
- Asset: `37725cd5-035f-43ae-b01d-013cc38bdadc`
- Source page: 5
- Source PDF SHA-256 verified against Drive and database
- Visual: compilation-stage matching layout

### 9618/31/O/N/22 Q7(a)
- Asset: `296cb706-6ea4-4bda-8559-8aa23a6aabf4`
- Source page: 7
- Source PDF SHA-256 verified against Drive and database
- Visual: four-variable Karnaugh map

### 9618/31/O/N/22 Q7(b)
- Asset: `427d42ea-4da5-4eb9-bdca-fb4200481d70`
- Source page: 7
- Same verified K-map workspace as Q7(a)

### Quarantined legacy row
- Asset: `67b60df2-b032-4640-a24b-115b8f43a7a5`
- Question: `LEGACY/9618/11/M/J/26 Q19(a)`
- Question status: `archived`
- No source URL and no verified source visual
- Required action: retain quarantine; do not fabricate a Cambridge visual

## Implementation phases

### Phase A — renderer and eligibility integrity
- Normalize direct SVG and XML-prefixed SVG detection.
- Treat `svg_markup` as a first-class renderable source.
- Centralize source-visual readiness predicates.
- Ensure Live Challenge and other learner-facing selection flows exclude unrenderable required visuals.
- Add regression tests for raw SVG, XML-prefixed SVG, storage-backed images, prose placeholders, and archived legacy rows.

### Phase B — four verified data repairs
- Download the exact source QP from recorded Drive URLs.
- Verify downloaded SHA-256 equals the stored source-paper SHA.
- Recover the exact source-page visual.
- Preserve the existing asset ID.
- Backfill renderable SVG markup plus source geometry/provenance metadata.
- Re-run the corpus audit after each repair.

### Phase C — closure audit
Acceptance criteria:

- **0 approved/student-eligible Cambridge visual assets** without a renderable source.
- **0 learner-facing raw SVG/XML code**.
- **0 archived/unverified legacy assets** promoted as source-backed.
- Live Challenge eligible-question selection returns only renderable visual questions when diagrams are included.
- Question Bank, Lesson Studio, student past-paper, assignment/result views, projector and Live Challenge use the same visual readiness rules.
- CI and source-fidelity audit pass.

## Production validation

After deployment:
1. Open at least one storage-backed image question.
2. Open one direct `svg_markup` question.
3. Open one XML-prefixed SVG question.
4. Open each of the four repaired questions above.
5. Verify Live Challenge teacher, student and projector views.
6. Confirm no raw `<svg` / `<?xml` strings are learner-visible.
7. Confirm the archived legacy row does not appear in eligible active question flows.
