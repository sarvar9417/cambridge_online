# CamPath implementation status

Updated: 2026-08-14

This file records verified implementation evidence. Requirements remain in
`00-README.md` through `12-api.md`; product rules live in `claude.md`. The
previous Express + `pg` implementation is preserved on the
`archive/express-stack` branch.

## Architecture

- pnpm workspaces monorepo:
  - `apps/api` — NestJS 10, REST, JWT auth, global guards
  - `apps/worker` — NestJS standalone, BullMQ consumers (no HTTP)
  - `apps/web` — React 18 + Vite + Tailwind + TanStack Query
  - `packages/db` — Drizzle ORM, SQL migrations, seed + paper transcripts
  - `packages/shared` — Zod contracts, marking.ts, srs.ts, validation rules
  - `packages/ai` — Claude wrapper (worker-only, R9)
- PostgreSQL and object storage: Supabase. Redis (BullMQ): local docker,
  hosted (Upstash or similar) in production.
- Local dev: `docker compose up`; fully offline via `docker compose --profile local up`.

## Verified locally

- `pnpm verify` passes: Prettier check, ESLint, strict typecheck, tests.
- 249 tests pass: `shared` 111, `db` 57, `api` 31 (incl. e2e) + 9 todo, `worker`
  49, `web` 1. Both blocking suites (`authz.e2e-spec.ts`, `route-coverage.spec.ts`) pass.
- `pnpm -r typecheck` clean; `apps/api` and `apps/web` production builds pass.
- The two blocking tests run against a real PostgreSQL:
  - `route-coverage.spec.ts` — pure unit, always runs.
  - `authz.e2e-spec.ts` — Testcontainers by default (**requires Docker**); an
    externally provisioned Postgres can substitute via `TEST_DATABASE_URL` or
    `startHarness({ databaseUrl })` (the harness applies the same migrations
    and seed either way).
- Question bank UI verified end-to-end in headless Chrome via CDP against the
  live Supabase database: login, parts view (100 leaves), families view (40
  families), subtopic filter, add-to-basket, review screen with source ref.

## Migrations and seed

- Migrations `0001`–`0008` plus `0009_question_bank_selections.sql` are the
  current forward-only set in `packages/db/migrations/`.
- The live Supabase database carries migrations under both the current and the
  legacy (Express-era) names; `0009_question_bank_selections.sql` (selections
  and selection_items) is applied there.
- `pnpm db:seed` writes one school, the official 9618 syllabus (4 components,
  20 topics, 44 subtopics), one owner, one teacher, two classes, twelve
  enrolled students and one unused invite code — idempotent upserts.
- Seed credentials come from `SEED_*` env vars; the live owner password
  predates this seed and is not the seed password.

## Real paper transcripts (Prompt: "question paperlarni latexda qo'sh")

Three 2023 May/June Paper 1 papers are transcribed at sub-part level and seeded:

| Paper | Transcript file | Seed script | npm script |
| --- | --- | --- | --- |
| 9618/11/M/J/23 (v1) | `packages/db/src/seed/paper-9618-s23-11.ts` | `seed-paper-9618-s23-11.ts` | `db:seed-paper-11` |
| 9618/12/M/J/23 (v2) | `packages/db/src/seed/paper-9618-s23-12.ts` | `seed-paper-9618-s23-12.ts` | `db:seed-paper-12` |
| 9618/13/M/J/23 (v3) | `packages/db/src/seed/paper-9618-s23-13.ts` | `seed-paper-9618-s23-13.ts` | `db:seed-paper-13` |

- Each is 75 marks total, LaTeX bodies (`body_format = 'latex'`), subtopic
  links against the 2026 syllabus, and mark schemes as
  `all_required` / `any_n_from_m` groups from the official MS.
- `packages/db/src/seed/seed-paper.ts` is the shared writer (one transaction,
  idempotent, `variant`/`year`/`series` parameters);
  `seed-papers-all.ts` seeds every transcript in one process
  (`pnpm db:seed-papers`).
- Transcripts are covered by contract tests (`paper-9618-s23-11/12/13.test.ts`):
  total marks, LaTeX validity, mark-scheme sums, subtopic codes, path shape.
- `scripts/download-papers.py` downloads every year's QP + MS from Google Drive
  into `papers/` (git-ignored); idempotent, no API key, `--filter`, `--dry-run`.

## Question bank and part-level extraction (Prompt C)

- `GET /api/v1/questions` — leaves by default (`view=parts`); `view=families`
  groups matching leaves under their root question. Filters: component, topic
  tree to subtopic, command word, marks range, AO, year range, series,
  has-diagram, status (owner), full-text search, `dependency=independent`.
  `difficulty` and `unusedInClassId` are surfaced as unavailable until the
  grading/assignment modules land.
- `GET /api/v1/questions/:id/portable` — recursive-CTE context chain
  (leaf → root) with each node's context and assets in ancestor order.
- Selections (basket): `GET/POST /api/v1/selections`, `GET :id`,
  `POST :id/items` (returns dependencies for the add-time modal),
  `PATCH/DELETE items`. Server-side, survives filter changes and reloads.
- Review numbering (`packages/shared`-independent pure function in
  `apps/api/src/questions/selection-review.ts`): fresh refs `Q1(a)`, `Q1(b)(i)`
  with `source_ref` preserved; `context_only` items contribute 0 marks.
- Web UI `apps/web/src/features/questions/`: parts/families toggle, filters,
  keyboard (`/` search, Space/Enter add, A add, arrows), basket panel with
  role switch, dependency modal (`answer_ref` cannot be context-only), review
  screen rendering the inherited context chain (`ContextChain.tsx`).
- Tests: `question-bank.repository.test.ts` and `selection-review.test.ts`
  (unit), `question-bank.e2e-spec.ts` (11 supertest scenarios against real
  PostgreSQL — leaves vs families, portable chain, dependency filter, 403 for
  students, basket CRUD, renumbering, context_only = 0),
  `ContextChain.test.tsx` (web).

## Implemented domains

- Prompt A (auth foundation): login, refresh rotation/reuse, invite
  redemption, self-registration, `/auth/me`, authorization middleware, route
  coverage, readiness, migrations, seed. 14 mandatory authorization cases from
  `02-data-model.md` §12.6 are listed in `authz.e2e-spec.ts` (those needing
  modules not yet built remain `todo` and name their module).
- Prompt B (ingestion): BullMQ FlowProducer chain
  UPLOAD → PREPARE → SEGMENT → EXTRACT_QP → EXTRACT_MS → MATCH → ASSETS →
  CLASSIFY → DEPENDS → VALIDATE → CROSSCHECK → PERSIST, running in
  `apps/worker` only. Versioned prompts in `prompts/` (R7); 23 deterministic
  validation rules in `packages/shared/validation`; sha256 + jobId idempotency;
  resume-after-crash via stage store.
- Prompt C (question bank + extraction workflow): see the section above.
- Faza 3/4/5 foundations from the original plan (paper generator, export API,
  deterministic marking, content schema, SM-2) were delivered in the Express
  stack and are preserved on `archive/express-stack`; the monorepo carries the
  schema and shared modules needed for them (`packages/shared/marking.ts`,
  `srs.ts`, validation rules).

## External requirements not yet satisfied

- No `ANTHROPIC_API_KEY`: the extraction pipeline runs only against fake
  providers; four-week calibration is pending.
- Poppler is absent: PDF PREPARE has no live implementation against the past
  papers.
- No durable private storage credentials: presigned upload/URLs are pending;
  diagrams are stored inline as SVG and need no object storage.
- **The job runner does not run on Vercel.** Serverless functions have no
  long-lived process, so PDF export jobs and ingestion need `apps/worker` on a
  long-lived host against the same database (`docker compose up` locally).
- Redis is not hosted: BullMQ requires a hosted Redis in production.
- Data-dependent gates (150+ ground truth, agreement targets, real paper
  extraction and timed review study) remain unverified.
- Learning objectives are not imported yet; placeholder educational content
  was intentionally not fabricated.

`GET /api/v1/ready` exposes database state and `ai`, `pdfPrepare`, and
`durableStorage` capability flags.
