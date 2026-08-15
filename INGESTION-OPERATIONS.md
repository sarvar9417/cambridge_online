# CamPath real-paper ingestion operations

This runbook is the operational source of truth for rolling Cambridge 9618 QP/MS files into the canonical question bank.

## Safety invariants

- Never place database passwords, Supabase secret keys, access tokens or Anthropic keys in Git, job payloads or committed command history.
- Do not use a Supabase publishable key or `sbp_...` management token as the private asset uploader credential. The corpus worker requires a server-only Storage secret/service-role credential.
- Do not bulk enqueue until syllabus coverage, `corpus:readiness` and `corpus:preflight` are understood.
- Never bind an older paper to the currently active syllabus as a fallback. The paper year must match exactly one syllabus validity range.
- Start with one reference pair, then a small limited batch, then widen the corpus.
- Binary-only assets are not auto-approved until the crop is durably stored.
- A source paper whose questions already appear in assignments or answers cannot be destructively re-ingested. It requires a future revision/snapshot workflow.
- A changed PDF SHA for an already-used source paper is rejected during staging for the same reason.

## 1. Worker prerequisites

The worker needs:

- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- optional `ANTHROPIC_MODEL`
- `SUPABASE_URL`
- `SUPABASE_STORAGE_SECRET_KEY` — server-only secret/service-role credential
- optional `ASSET_STORAGE_BUCKET` (defaults to `question-assets`)
- a **private** Supabase Storage bucket matching `ASSET_STORAGE_BUCKET`
- Poppler commands `pdftoppm` and `pdftotext` on `PATH`, or explicit `PDFTOPPM_PATH` / `PDFTOTEXT_PATH`
- migrations through `0022_component_learning_objective_coverage.sql`
- staged QP/MS files readable from the worker filesystem

The private bucket is intentionally not auto-created by the worker. Create it deliberately in the intended Supabase project, keep it private, and configure application access through signed/authenticated reads.

## 2. Apply migrations deliberately

Only in the intended deployment environment:

```bash
npm run db:migrate -w backend
npm run corpus:readiness -w backend
```

Readiness checks schema/migration state through `0022`, Poppler executability, Anthropic configuration and private Storage reachability without printing secret values.

## 3. Validate and import historical syllabus catalogs

The built-in historical descriptors are:

- `backend/src/database/catalogs/9618-2021-2023.json`
- `backend/src/database/catalogs/9618-2024-2025.json`

They resolve shared source-backed fragments into 20 topics / 44 subtopics. `component_topics` models shared Paper 3/Paper 4 topics and `component_learning_objectives` handles narrower Paper 4 exclusions inside section 20.1.

Always dry-run both catalogs first:

```bash
npm run syllabus:catalog -w backend -- --file=backend/src/database/catalogs/9618-2021-2023.json
npm run syllabus:catalog -w backend -- --file=backend/src/database/catalogs/9618-2024-2025.json
```

Import only into the intended database and only after reviewing the dry-run counts:

```bash
CONFIRM_SYLLABUS_CATALOG_IMPORT=YES \
  npm run syllabus:catalog -w backend -- \
  --file=backend/src/database/catalogs/9618-2021-2023.json --write

CONFIRM_SYLLABUS_CATALOG_IMPORT=YES \
  npm run syllabus:catalog -w backend -- \
  --file=backend/src/database/catalogs/9618-2024-2025.json --write
```

Then verify exam-year coverage before staging papers:

```bash
npm run syllabus:coverage -w backend -- --year-from=2021 --year-to=2025
```

A missing, ambiguous or incomplete year is a hard blocker. Do not route it to another syllabus version.

## 4. Discover and stage source files

If the worker-visible source tree already contains canonical Cambridge filenames, generate the inventory first:

```bash
npm run corpus:discover -w backend -- --root=<past-paper-root>
```

Discovery recognises QP/MS filenames such as `9618_s25_qp_11.pdf` and reports complete/unpaired variants while ignoring inserts, thresholds and unrelated PDFs.

Use the source-staging manifest utility. Staging validates syllabus/year/series/paper code, exact exam-year syllabus version, QP vs MS kind, file existence/size, SHA-256, duplicate keys and revision safety.

Dry-run validation does not require database access:

```bash
npm run corpus:stage -w backend -- --manifest=<manifest.json>
```

Register only with explicit confirmation:

```bash
CONFIRM_SOURCE_STAGE=YES \
  npm run corpus:stage -w backend -- --manifest=<manifest.json> --write
```

Staging must happen on durable/private storage visible to the corpus worker. A Vercel preview filesystem is not a corpus source store.

## 5. Read-only corpus preflight

```bash
npm run corpus:preflight -w backend
```

Rows are classified as `COMPLETE`, `READY_TO_QUEUE` or `SOURCE_MISSING`. Preflight compares canonical DB coverage with staged QP/MS availability and reports known minimum AI-call counts.

## 6. Reference pair first

Use one small known QP/MS pair before durable bulk jobs:

```bash
npm run corpus:reference -w backend -- --qp=<QP_SOURCE_PAPER_ID> --ms=<MS_SOURCE_PAPER_ID>
```

Without `--persist`, extraction, matching, asset metadata, classification, dependency detection, deterministic validation and cross-check run without writing canonical questions or Storage objects.

Persistence is double-gated:

```bash
CONFIRM_REAL_PAPER_PERSIST=YES \
  npm run corpus:reference -w backend -- \
  --qp=<QP_SOURCE_PAPER_ID> --ms=<MS_SOURCE_PAPER_ID> --persist
```

Persist mode additionally requires full readiness and performs binary crop/upload before validation/persistence. Inspect findings, cross-check disagreements, QP/MS coverage, classification, stored assets and persistence result before continuing.

## 7. Dry-run durable queue plan

```bash
npm run corpus:enqueue -w backend -- --year-from=2021 --year-to=2025
```

No job is inserted without `--apply` and confirmation.

## 8. First durable batch

```bash
CONFIRM_CORPUS_ENQUEUE=YES \
  npm run corpus:enqueue -w backend -- \
  --apply --limit=1 --year-from=2021 --year-to=2025
```

Source-missing pairs block rollout unless `--allow-partial` is explicitly supplied.

## 9. Start worker and observe

```bash
npm run jobs:corpus -w backend
```

Pipeline:

```text
PREPARE
→ SEGMENT
→ EXTRACT_QP_V2
→ EXTRACT_MS
→ MATCH_LEAVES
→ ASSET_METADATA
→ CROP_200_DPI
→ PRIVATE_STORAGE
→ CLASSIFY_V2
→ DEPENDS
→ VALIDATE
→ CROSSCHECK_V2
→ PERSIST
```

After the batch, use the read-only rollout report:

```bash
npm run corpus:status -w backend -- --year-from=2021 --year-to=2025
```

Review approved/review/failed runs, failed stage, validation findings, asset state, AI call failures/tokens and known cost before increasing the batch size.

## 10. Retry and approval behavior

Each run has `attempt_no` and a `run_key` containing pipeline version, QP SHA, MS SHA and attempt. The key propagates through child jobs so an old failed stage cannot suppress a legitimate retry. Active queued/processing runs are not duplicated.

Asset paths are content-addressed by SHA-256. Binary `bbox` uses `[x1,y1,x2,y2]` pixels on the 200-dpi page image. A paper remains `needs_review` for deterministic errors, unresolved carry-over, QP/MS mismatch, invalid crop metadata, suspicious assets, classification/dependency issues, cross-check disagreement or pending/failed binary assets.

## 11. Scale gradually

Recommended rollout:

1. catalogs dry-run/import + syllabus coverage audit
2. source discovery/staging
3. reference pair, no persist
4. reference pair with explicit persist if clean
5. durable `--limit=1`
6. inspect `corpus:status`, DB, private Storage and review queue
7. `--limit=3`
8. larger batches only after observed failure/review rates are acceptable

Do not start with the whole corpus merely because CI is green. CI validates code behavior; it does not validate every real Cambridge PDF, crop coordinate, syllabus mapping or model response.
