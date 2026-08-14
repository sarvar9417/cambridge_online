# CamPath implementation status

Updated: 2026-08-14

This file records verified implementation evidence. Requirements remain in
`00-README.md` through `12-api.md`.

## Architecture

- `frontend/`: React 19 + Vite.
- `backend/`: Express 5 + TypeScript + PostgreSQL.
- Root npm workspaces run both applications.
- One Vercel project: static frontend plus `api/[...path].ts`.

## Verified locally

- Strict typecheck and production builds pass.
- 134 backend and 2 frontend tests pass.
- Chrome renders at 1440x900 and emulated 360x800; no 360px overflow.
- Migrations 0001-0008 and seed data are applied to Supabase.
- A real assignment export completed through PostgreSQL jobs and Chrome; the
  inspected PDF is one page, 68 KB, contains selectable text and totals 20 marks.

## Implemented domains

- Faza 0: auth, refresh rotation/reuse, invite redemption, authorization
  middleware, route coverage, readiness, migrations and seed data.
- Faza 1: question bank, assignments, attempts, heartbeat/timer, offline queue,
  manual grading, released results, assignment result rosters, grading appeals
  and mastery.
- Analytics: authorized class heatmap, mark-point miss rates, command-word
  performance, student mastery confidence and owner-only AI quality metrics,
  with a responsive staff dashboard.
- Faza 2 foundation: PostgreSQL jobs, retry/DLQ, ingestion/review API, V01-V20.
- Faza 3 foundation: paper generator, export API, HTML and Chrome PDF processor.
- Faza 4 foundation: deterministic marking, safe AI output, shadow processor,
  budget guard and AI audit.
- Faza 5 foundation: content schema, C01-C10, SM-2 and flashcard API.
- Ops: rate limits, robots block, migration lock and capability reporting.

## External requirements not yet satisfied

- No `ANTHROPIC_API_KEY`: real model calls and four-week calibration are pending.
- No durable private storage credentials: presigned upload/URLs are pending.
- Poppler is absent: PDF PREPARE cannot run.
- Vercel production frontend and `/api/v1/health` are deployed and verified at
  `https://cambridge-online.vercel.app`; persistent project environment
  variables and GitHub auto-deploy connection still require dashboard setup.
- Data-dependent gates (150+ ground truth, agreement targets, real paper
  extraction and timed review study) remain unverified.
- Official syllabus subtopics and learning objectives are not imported yet;
  placeholder educational content was intentionally not fabricated.
- On 2026-08-14 the Supabase direct PostgreSQL endpoint began timing out; a
  fresh backend pool also reported `database:error`, so the newest analytics
  endpoints await a repeat live smoke test after external connectivity returns.

`GET /api/v1/ready` exposes database state and `ai`, `pdfPrepare`, and
`durableStorage` capability flags.
