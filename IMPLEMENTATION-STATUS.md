# CamPath implementation status

Updated: 2026-08-14

This file records verified implementation evidence. Requirements remain in
`00-README.md` through `12-api.md`.

## Architecture

- `frontend/`: React 19 + Vite, KaTeX rendering, feature folders under `src/features/`.
- `backend/`: Express 5 + TypeScript + PostgreSQL.
- Root npm workspaces run both applications.
- One Vercel project: static frontend plus `api/[...path].ts`.

## Verified locally

- `npm run verify` passes: Prettier check, ESLint, strict typecheck, tests, production build.
- 245 backend and 17 frontend tests pass.
- Chrome renders at 1440x900 and emulated 360x800; no 360px overflow.
- Migrations 0001-0008 and 0011 plus seed data are applied to Supabase.
  Migrations 0009 (registration and groups) and 0010 (LaTeX content) are written
  and typechecked but **not yet applied to Supabase** — apply with
  `npm run db:migrate -w backend` before deploying.
- A real assignment export completed through PostgreSQL jobs and Chrome; the
  inspected PDF is one page, 68 KB, contains selectable text and totals 20 marks.

## Registration and placement

- `POST /api/v1/auth/register` creates a student account in `pending`, rate
  limited to 5 per hour per IP. Role, school and status cannot be set from the
  request body.
- A `pending` account authenticates and can read `/auth/me`; every other route is
  refused by `requireActiveAccount` with `account_pending`, and the account is
  enrolled nowhere, so class-scoped queries return nothing regardless.
- Staff place a student with `POST /api/v1/enrolment/students/:id/assign`
  (`classId` plus optional `groupId`), which enrols and activates in one
  transaction and writes to `audit_log`. Only the owner may suspend, which also
  bumps `token_version` to revoke live access tokens.
- `groups` subdivide a class; the composite foreign key `(group_id, class_id)`
  makes a cross-class group assignment impossible in SQL, not just in code.

## Syllabus

- `backend/src/database/syllabus-9618-2026.ts` carries the official structure
  transcribed from Cambridge document `697372-2026-syllabus.pdf` (syllabus for
  examination from 2026): 4 components, 20 topics, 44 subtopics, with the topic
  to paper mapping (1-8 → P1, 9-12 → P2, 13-18 → P3, 19-20 → P4). Covered by tests.
- `npm run db:seed -w backend` writes topics and subtopics; `GET /api/v1/syllabus/topics`
  serves the tree with approved-question counts.
- Learning objectives are deliberately not transcribed: the syllabus prints them
  in a two-column layout that does not survive text extraction, and
  `03-ingestion.md` section 7 requires them to be checked by hand.

## LaTeX authoring

- Questions, mark scheme points, guidance and level descriptors carry `*_latex`
  columns; `question_assets` carries `latex_source` (editable TikZ master) plus
  `svg_markup` (what actually renders).
- `backend/src/lib/latex.ts` validates against the KaTeX contract: balanced
  braces and `$` delimiters, no file/exec/macro-redefinition commands, diagram
  environments routed to the SVG path, and SVG hardening against script, event
  handlers and external references. Rejections return 422 with per-finding detail
  so the editor can point at the offending text.
- `frontend/src/lib/latex.ts` renders under the same contract: prose is
  HTML-escaped, maths goes through KaTeX with `trust: false`. KaTeX fonts are
  bundled by Vite, so the page makes no external request.
- Owner-only authoring API (`POST`/`PUT /api/v1/questions`) writes question,
  subtopics, assets and mark scheme in one transaction and enforces V01, V05 and
  marks/mark-scheme agreement before writing anything.

## Implemented domains

- Faza 0: auth, refresh rotation/reuse, invite redemption, self-registration,
  authorization middleware, route coverage, readiness, migrations and seed data.
- Faza 1: question bank with keyset pagination and topic/subtopic/component
  filters, assignments, attempts, heartbeat/timer, offline queue, manual grading,
  released results, assignment result rosters, grading appeals and mastery.
- Analytics: authorized class heatmap, mark-point miss rates, command-word
  performance, student mastery confidence and owner-only AI quality metrics,
  with a responsive staff dashboard.
- Faza 2 foundation: PostgreSQL jobs, retry/DLQ, ingestion/review API, V01-V20,
  and an extraction pipeline (batching with page overlap, dedupe, QP↔MS match,
  classify, validate, cross-check) fully tested against fake providers.
- Faza 3 foundation: paper generator, export API, HTML and Chrome PDF processor,
  school/date/internal-use watermark, per-user daily limit and polled statuses.
- Faza 4 foundation: deterministic marking, safe AI output, shadow processor,
  budget guard and AI audit.
- Faza 5 foundation: content schema, C01-C10, SM-2 and flashcard API.
- Ops: rate limits, robots block, migration lock, capability reporting,
  self-service JSON data export and owner-only student anonymization that keeps
  aggregate grading statistics while clearing identity, sessions and answers;
  PostgreSQL pool size is serverless-aware to stay within hosted connection limits;
  assignment create/publish, attempt and export support 24-hour Idempotency-Key replay.

## Prompts

`prompts/` holds versioned prompts as required by R13: `extract-question.v1.md`,
`extract-markscheme.v1.md`, `classify-question.v1.md`, `cross-check.v1.md`. The
extraction prompts state the LaTeX contract so model output matches what the
renderer accepts.

## External requirements not yet satisfied

- No `ANTHROPIC_API_KEY`: `ExtractionProvider` has no live implementation, so the
  pipeline runs only against fakes and the four-week calibration is pending.
- Poppler is absent: `PdfPreparer` has no live implementation, so PDF PREPARE
  cannot run against the past papers.
- No durable private storage credentials: presigned upload/URLs are pending.
  Diagrams are stored inline as SVG and need no object storage.
- **The job runner and the attempt scheduler do not run on Vercel.** Serverless
  functions have no long-lived process, so PDF export jobs never finish and
  expired attempts are not auto-submitted in production. Writing is still refused
  after the deadline by the per-request window check, so no student gains time.
  Running `npm run jobs -w backend` on any long-lived host against the same
  database resolves both.
- Vercel production frontend, database readiness and owner login are verified
  at `https://cambridge-online.vercel.app`; the private GitHub repository is
  connected for automatic deployments from `main`.
- Data-dependent gates (150+ ground truth, agreement targets, real paper
  extraction and timed review study) remain unverified.
- Learning objectives are not imported yet; placeholder educational content was
  intentionally not fabricated.

`GET /api/v1/ready` exposes database state and `ai`, `pdfPrepare`, and
`durableStorage` capability flags.
