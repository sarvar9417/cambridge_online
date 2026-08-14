# Real Cambridge 9618 paper ingestion

This document describes the **real-corpus** path. It is deliberately separate from synthetic seed data and from the experimental monorepo worker.

## Source-of-truth scope

For the verified 2021–2025 M/J + O/N Drive baseline, the source inventory contains **118 canonical 9618 paper variants and 118/118 QP–MS pairs**. The database is not considered complete merely because the source files exist: each paper must also pass extraction, QP↔MS coverage, classification, dependency, deterministic validation, cross-check and persistence/review gates.

## Security

- Never commit database passwords, Supabase service-role/personal-access tokens, Anthropic keys, or source-download credentials.
- Supply runtime secrets through the deployment/worker environment only.
- The corpus worker is intentionally a separate process; the web API does not need to instantiate the ingestion model client.

## Runtime prerequisites

The current `PREPARE` stage reads `source_papers.storage_path` from the worker filesystem and requires:

- `DATABASE_URL`
- `PDFTOPPM_PATH`
- `PDFTOTEXT_PATH`
- `ANTHROPIC_API_KEY`
- optional `ANTHROPIC_MODEL`

`pdftoppm` renders 200-DPI source pages and `pdftotext -layout` supplies a text layer. QP/MS extraction sends **actual image content blocks plus the text layer** to the model.

## Read-only preflight

Build the backend, then run the compiled `corpus-preflight-cli` for the desired year range. The preflight never mutates the database.

It reports each canonical QP row as:

- `COMPLETE` — DB leaf marks equal the official component total, every leaf has a mark scheme, every leaf is approved and there are no unresolved paper-level validation errors;
- `READY_TO_QUEUE` — QP and MS both exist on the worker filesystem but DB coverage is not complete;
- `SOURCE_MISSING` — the QP/MS pair or its worker-local source file is unavailable.

It also reports known page counts and the minimum multimodal extraction-call count implied by the three-page/one-page-overlap batching algorithm. It does **not** manufacture a dollar estimate when token volume/model pricing is unknown.

## Canonical corpus worker

`backend/src/jobs/start-corpus-worker.ts` composes the real pipeline:

`PREPARE → SEGMENT → EXTRACT_QP → EXTRACT_MS → MATCH_LEAVES → ASSETS → CLASSIFY_V2 → DEPENDS → VALIDATE → CROSSCHECK_V2 → PERSIST`

Important invariants:

1. QP↔MS matching is **leaf-only**. Parent/context nodes correctly have no mark scheme.
2. Overlapping extraction batches deduplicate identical paths. Conflicting overlap is never last-write-wins; it receives an `overlap_conflict` review issue.
3. Classification can map one leaf to up to five real syllabus subtopics, but only codes that exist in the database catalogue are accepted.
4. `answer_ref` dependencies are normalized to `required`; candidate-answer dependencies can never be satisfied as context-only.
5. Deterministic validation uses the component total from the database, not a model-supplied total.
6. Cross-check is a consistency pass, not a grading pass.
7. Persistence is a single transaction and rewrites derived child rows on retry.
8. Binary assets are never silently dropped. `source_page + source_bbox` is preserved and the asset remains pending/needs-review until a crop is durably stored.

## Asset state

Migration `0018_question_asset_source_bbox.sql` adds source crop provenance and crop lifecycle state.

- text/table/code content already represented as `content_md` can be used immediately;
- binary/image-only assets with a valid page+bbox persist as `pending` and prevent auto-approval;
- binary assets without reproducible coordinates persist as `failed` and require review.

A durable crop/storage worker remains a separate follow-up. Until it exists, no code should claim those binary assets are complete.

## What is not yet automatic

- Google Drive source files still need a deliberate staging path into the worker filesystem/private storage. The worker must not assume it can access a user's Drive folder directly.
- Bulk queue creation must reuse the repository's existing `JobQueue` / `ingestion_runs` idempotency contract; do not insert guessed job rows.
- Full immutable mark-scheme revision snapshots for historical assignments remain separate from ingestion persistence.

## Production rule

Do not apply new migrations or start a 118-paper bulk run until:

1. CI is green;
2. the preflight has been run against the intended database;
3. source paths are present on the actual worker host;
4. AI/Poppler configuration is verified on one reference QP/MS pair;
5. that reference pair reaches review/persist with expected mark totals and no silent asset loss.
