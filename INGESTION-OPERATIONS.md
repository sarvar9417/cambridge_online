# CamPath real-paper ingestion operations

This runbook is the operational source of truth for rolling Cambridge 9618 QP/MS files into the canonical question bank.

## Safety invariants

- Never place database passwords, Supabase access tokens or Anthropic keys in Git, job payloads or command history committed to the repository.
- Do not bulk enqueue until `corpus:readiness` and `corpus:preflight` are both understood.
- Start with one reference pair, then a small limited batch, then widen the corpus.
- Binary-only assets are not auto-approved until a durable crop exists.
- A source paper whose questions already appear in assignments or answers cannot be destructively re-ingested. It requires a future revision/snapshot workflow.
- A changed PDF SHA for an already-used source paper is rejected during staging for the same reason.

## 1. Worker prerequisites

The worker needs:

- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- optional `ANTHROPIC_MODEL`
- Poppler commands `pdftoppm` and `pdftotext` on `PATH`, or explicit `PDFTOPPM_PATH` / `PDFTOTEXT_PATH`
- migrations through `0019_ingestion_run_attempt.sql`
- staged QP/MS files readable from the worker filesystem

Check all non-source prerequisites without mutating the database:

```bash
npm run corpus:readiness -w backend
```

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
- QP vs MS kind
- local file existence and minimum size
- SHA-256
- duplicate manifest keys
- source revision safety for papers already used by students

Staging must happen on the same durable/private filesystem or storage mount visible to the corpus worker. A Vercel preview filesystem is not a corpus store.

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

Without `--persist`, the reference command runs extraction/classification/dependency/validation/cross-check without writing canonical questions.

Persistence is intentionally double-gated:

```bash
CONFIRM_REAL_PAPER_PERSIST=YES \
  npm run corpus:reference -w backend -- \
  --qp=<QP_SOURCE_PAPER_ID> --ms=<MS_SOURCE_PAPER_ID> --persist
```

Inspect validation findings, cross-check disagreements, question/MS counts, classification and asset status before proceeding.

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

Worker startup runs readiness again and refuses to start when the schema, Poppler or Anthropic configuration is incomplete.

The durable pipeline is:

```text
PREPARE
→ SEGMENT
→ EXTRACT_QP
→ EXTRACT_MS
→ MATCH_LEAVES
→ ASSETS
→ CLASSIFY_V2
→ DEPENDS
→ VALIDATE
→ CROSSCHECK_V2
→ PERSIST
```

## 9. Retry behavior

Each ingestion run carries:

- `attempt_no`
- `run_key`

The durable key includes pipeline version, QP SHA, MS SHA and attempt number. `runKey` is propagated through every child job, so an old failed stage cannot suppress a legitimate retry. An already `queued` or `processing` run is not duplicated.

## 10. Approval behavior

A paper remains `needs_review` when any blocking condition survives, including:

- deterministic validation error
- unresolved extraction/classification mismatch
- QP/MS leaf coverage mismatch
- cross-check disagreement or low confidence
- pending/failed binary asset

Final ingestion-run status is derived from persisted approval gates; it is not trusted from an earlier intermediate stage.

## 11. Scale gradually

Recommended rollout:

1. reference pair, no persist
2. reference pair with explicit persist if clean
3. durable `--limit=1`
4. inspect DB and review queue
5. small batch such as `--limit=3`
6. larger batches only after observed failure/review rates are acceptable

Do not start with the whole corpus merely because CI is green. CI validates code behavior; it does not validate every real Cambridge PDF or model response.
