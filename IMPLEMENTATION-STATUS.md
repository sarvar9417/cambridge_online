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
- 206 backend and 7 frontend tests pass.
- Chrome renders at 1440x900 and emulated 360x800; no 360px overflow.
- Migrations 0001-0008 and 0011-0013 plus seed data are applied to Supabase;
  idempotency and per-student late grants are active in production.
- A real assignment export completed through PostgreSQL jobs and Chrome; the
  inspected PDF is one page, 68 KB, contains selectable text and totals 20 marks.

## Implemented domains

- Faza 0: auth, refresh rotation/reuse, invite redemption, authorization
  middleware, route coverage, readiness, migrations and seed data.
- Faza 1: question bank, assignments, attempts, heartbeat/timer, offline queue,
  manual grading, released results, assignment result rosters, grading appeals
  and mastery. Question detail exposes mark schemes to staff and only to a
  student whose own submission has been released, through a central serializer.
  Canonical class-assignment, submission and grading routes are available;
  publishing precreates student submissions and staff can grant individual
  late-access deadlines without changing the whole class due date.
- Analytics: authorized class heatmap, mark-point miss rates, command-word
  performance, student mastery confidence and owner-only AI quality metrics,
  with a responsive staff dashboard.
- Faza 2 foundation: PostgreSQL jobs, retry/DLQ, QP/MS bundle gating, ingestion run lifecycle, V01-V20, and an audited keyboard review queue with grouping, bulk approval, editing, and undo.
- Faza 3 foundation: paper generator, export API, HTML and Chrome PDF processor,
  school/date/internal-use watermark, per-user daily limit and polled statuses.
- Faza 4 foundation: deterministic marking, safe AI output, shadow processor,
  budget guard, AI audit, enforced calibration gates, manual-only Evaluate/levels
  answers, and deterministic 10% teacher quality sampling.
- Faza 5 foundation: content schema, C01-C10, SM-2 and flashcard API.
- Ops: rate limits, robots block, migration lock, capability reporting,
  self-service JSON data export and owner-only student anonymization that keeps
  aggregate grading statistics while clearing identity, sessions and answers;
  PostgreSQL pool size is serverless-aware to stay within hosted connection limits;
  assignment create/publish, attempt and export support 24-hour Idempotency-Key replay.
- Frontend API access tokens remain memory-only; concurrent 401 responses share
  one rotating refresh request, retry once and return to login on refresh failure.

## Authorization acceptance evidence

All 14 mandatory cases from `02-data-model.md` section 12.6 are covered by
executable tests:

1. Cross-student answers return 404: `domain-services.test.ts`.
2. Student mark schemes stay absent before release: `questions-repository.test.ts`.
3. Unreleased grading detail returns 404: `results-service.test.ts`.
4. Post-submit answer updates return 409: `domain-services.test.ts`.
5. Expired-attempt answer updates return 409: `domain-services.test.ts`.
6. Another teacher's class returns 404: `auth.integration.test.ts` and `classes-repository.test.ts`.
7. Teacher question mutation returns 403: `questions-repository.test.ts`.
8. Student access to AI calls returns 403: `admin-service.test.ts`.
9. Profile role elevation returns 400: `auth.integration.test.ts`.
10. Expired access tokens return 401: `auth.integration.test.ts`.
11. Revoked refresh tokens return 401 while rotated-token reuse revokes all sessions: `auth.integration.test.ts`.
12. Cross-school enrollment returns 403: `classes-repository.test.ts`.
13. Cross-student attempt creation returns 403: `domain-services.test.ts`.
14. Invalid or already-used invites return 410: `auth.integration.test.ts`.

## External requirements not yet satisfied

- No `ANTHROPIC_API_KEY`: real model calls and four-week calibration are pending.
- No durable private storage credentials: presigned upload/URLs are pending.
- Poppler is absent: PDF PREPARE cannot run.
- Vercel production frontend, database readiness and owner login are verified
  at `https://cambridge-online.vercel.app`; the private GitHub repository is
  connected for automatic deployments from `main`.
- Data-dependent gates (150+ ground truth, agreement targets, real paper
  extraction and timed review study) remain unverified.
- Official syllabus subtopics and learning objectives are not imported yet;
  placeholder educational content was intentionally not fabricated.
- Production readiness and owner authentication were smoke-tested against the
  Supabase database after deployment.

`GET /api/v1/ready` exposes database state and `ai`, `pdfPrepare`, and
`durableStorage` capability flags.
