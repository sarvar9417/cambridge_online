# CamPath real-paper ingestion operations

This runbook is the operational source of truth for rolling Cambridge 9618 QP/MS files into the canonical question bank.

## Safety invariants

- Never place database passwords, Supabase secret keys, access tokens or Anthropic keys in Git, job payloads or command history committed to the repository.
- Do not use a Supabase publishable key or `sbp_...` management token as the private asset uploader credential. The corpus worker requires a server-only Storage secret/service-role credential.
- Do not bulk enqueue until `corpus:readiness` and `corpus:preflight` are both understood.
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
- migrations through `0020_question_asset_storage_metadata.sql`
- staged QP/MS files readable from the worker filesystem

The private bucket is intentionally not auto-created by the worker. Create it deliberately in the intended Supabase project, keep it private, and configure application access separately through signed/authenticated reads.

Check all non-source prerequisites without mutating the database:

```bash
npm run corpus:readiness -w backend
```

Readiness verifies schema/migration state, Poppler executability, Anthropic configuration and that the private Storage bucket is reachable using the server-only credential. It never prints the secret value.

A non-zero exit means at least one blocking readiness check remains.

## 2. Apply migrations deliberately

Only in the intended deployment environment:

```bash
npm run db:migrate -w backend
```

Then run readiness again. The corpus worker should not be started while readiness is blocked.

## 3. Stage source files

Use canonical Cambridge filenames and the source-staging manifest utility. Staging validates:

- syllabus/year/series/paper code
- the syllabus version whose `valid_from..valid_to` range contains the exam year
- QP vs MS kind
- local file existence and minimum size
- SHA-256
- duplicate manifest keys
- source revision safety for papers already used by students

Dry-run validation does not require database access:

```bash
npm run corpus:stage -w backend -- --manifest=<manifest.json>
```

Register the validated files only with an explicit write confirmation:

```bash
CONFIRM_SOURCE_STAGE=YES \
  npm run corpus:stage -w backend -- --manifest=<manifest.json> --write
```

Staging must happen on the same durable/private filesystem or storage mount visible to the corpus worker. A Vercel preview filesystem is not a corpus source store.

## 4. Read-only corpus preflight

```bash
npm run corpus:preflight -w backend
```

Rows are classified as:

- `COMPLETE`
- `READY_TO_QUEUE`
- `SOURCE_MISSING`

Preflight compares canonical DB coverage with worker-local QP/MS availability and reports known minimum AI-call counts.

## 5. Reference pair first

Use one small, known QP/MS pair before creating durable bulk jobs.

```bash
npm run corpus:reference -w backend -- --qp=<QP_SOURCE_PAPER_ID> --ms=<MS_SOURCE_PAPER_ID>
```

Without `--persist`, the reference command runs extraction, leaf/MS matching, asset metadata validation, classification, dependency detection, deterministic validation and cross-check **without writing canonical questions or Storage objects**.

Persistence is intentionally double-gated:

```bash
CONFIRM_REAL_PAPER_PERSIST=YES \
  npm run corpus:reference -w backend -- \
  --qp=<QP_SOURCE_PAPER_ID> --ms=<MS_SOURCE_PAPER_ID> --persist
```

Persist mode additionally requires full readiness and performs binary asset crop/upload before validation/persistence. Crops are rendered from the source PDF at the same 200 dpi coordinate system used by extraction. Durable objects use content-addressed paths and DB rows store `supabase://<bucket>/<object>`, byte size and SHA-256.

Inspect validation findings, cross-check disagreements, question/MS counts, classification, `storedAssets`, asset-store report and persistence result before proceeding.

## 6. Dry-run durable queue plan

The enqueue command is dry-run by default:

```bash
npm run corpus:enqueue -w backend -- --year-from=2021 --year-to=2025
```

The output includes readiness, preflight totals and the exact queue count. No job is inserted.

## 7. First durable batch: one pair

Only after readiness is green and the reference result is acceptable:

```bash
CONFIRM_CORPUS_ENQUEUE=YES \
  npm run corpus:enqueue -w backend -- \
  --apply --limit=1 --year-from=2021 --year-to=2025
```

`--apply` is refused when readiness is blocked. Source-missing pairs block the rollout unless `--allow-partial` is explicitly supplied.

## 8. Start the corpus worker

```bash
npm run jobs:corpus -w backend
```

Worker startup runs readiness again and refuses to start when the schema, Poppler, Anthropic or private Storage configuration is incomplete.

The durable pipeline is:

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

For binary assets the `bbox` contract is `[x1,y1,x2,y2]` in pixels of the supplied 200-dpi page image, with a top-left origin. The crop stage converts this to Poppler `x/y/width/height`, uploads a PNG to private Storage, and records `size_bytes`, `content_hash` and `crop_status='ready'`.

## 9. Retry behavior

Each ingestion run carries:

- `attempt_no`
- `run_key`

The durable key includes pipeline version, QP SHA, MS SHA and attempt number. `runKey` is propagated through every child job, so an old failed stage cannot suppress a legitimate retry. An already `queued` or `processing` run is not duplicated.

Asset object paths are content-addressed by SHA-256. Upload uses idempotent upsert semantics, so a retried stage writes the same bytes to the same object path; changed bytes produce a new path.

## 10. Approval behavior

A paper remains `needs_review` when any blocking condition survives, including:

- deterministic validation error
- unresolved truncated QP carry-over
- unresolved extraction/classification mismatch
- QP/MS leaf coverage mismatch
- invalid/missing asset crop coordinates
- suspiciously tiny durable crop
- cross-check disagreement or low confidence
- pending/failed binary asset

A durably stored binary asset may become `ready`; pending/failed assets cannot be hidden by an earlier `approved_candidate` intermediate state.

Final ingestion-run status is derived from persisted approval gates; it is not trusted from an earlier intermediate stage.

## 11. Scale gradually

Recommended rollout:

1. reference pair, no persist
2. reference pair with explicit persist if clean
3. durable `--limit=1`
4. inspect DB, private Storage and review queue
5. small batch such as `--limit=3`
6. larger batches only after observed failure/review rates are acceptable

Do not start with the whole corpus merely because CI is green. CI validates code behavior; it does not validate every real Cambridge PDF, crop coordinate or model response.
