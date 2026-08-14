# CamPath

Cambridge International AS & A Level Computer Science (9618) preparation
platform. Product rules live in `claude.md`; the requirement documents are
`00-README.md` through `12-api.md`.

## Layout

```
apps/api        NestJS 10 — REST, JWT auth, global guards
apps/worker     NestJS standalone — BullMQ consumers, no HTTP
apps/web        React 18 + Vite + Tailwind + TanStack Query
packages/db     Drizzle ORM, SQL migrations, seed
packages/shared Zod contracts, marking.ts, srs.ts, validation rules
packages/ai     Claude wrapper (worker-only, R9)
prompts/        Versioned prompt files (R7)
papers/         Source QP and MS PDFs
```

## Infrastructure

PostgreSQL and object storage come from **Supabase**. Redis has no Supabase
equivalent and BullMQ needs one, so it runs locally in development and needs a
hosted instance (Upstash or similar) in production.

| Concern | Development | Production |
| --- | --- | --- |
| PostgreSQL | Supabase | Supabase |
| Object storage | Supabase Storage (S3 protocol) | Supabase Storage |
| Redis / BullMQ | `docker compose` | Hosted Redis |

Two database URLs are needed. `DATABASE_URL` is the transaction pooler
(port 6543) and carries request traffic. `DIRECT_URL` is the direct connection
(port 5432) and is used only by migrations, which take a session-level advisory
lock the pooler cannot honour.

## Getting started

```bash
pnpm install
cp .env.example .env          # fill in the Supabase values
pnpm db:migrate               # uses DIRECT_URL
pnpm db:seed                  # owner, teacher, 2 classes, 12 students
docker compose up             # api :3001, worker, web :5173, redis :6379
```

Fully offline instead of Supabase:

```bash
docker compose --profile local up      # adds postgres :5432 and minio :9000
```

## Checks

```bash
pnpm verify      # format, lint, typecheck, test
```

The two blocking tests must pass before any deploy:

- `apps/api/test/authz.e2e-spec.ts` — authorization scenarios against a real
  PostgreSQL 16 started by Testcontainers. **Requires Docker** — or an external
  database via `TEST_DATABASE_URL` (the harness applies the same migrations and
  seed either way, e.g. `TEST_DATABASE_URL=postgresql://... pnpm test`).
- `apps/api/test/route-coverage.spec.ts` — every route is guarded unless it is
  one of the five agreed `@Public()` endpoints.

## Endpoints

```
GET    /api/v1/health            public   liveness
GET    /api/v1/ready             public   db, redis, s3 — 503 when degraded
POST   /api/v1/auth/login        public   rate limited 5 / 15 min / IP+identifier
POST   /api/v1/auth/refresh      public   rotation; replay revokes all sessions
POST   /api/v1/auth/redeem-invite public
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
PATCH  /api/v1/auth/me
GET    /api/v1/admin/ai-calls    owner
GET    /api/v1/admin/audit-log   owner
GET    /api/v1/questions         owner/teacher  bank, parts or families view
GET    /api/v1/questions/:id/portable        context chain + assets
GET    /api/v1/questions/filter-options      topic tree + classes
GET    /api/v1/selections        owner/teacher  baskets (savatcha)
POST   /api/v1/selections        owner/teacher  create basket
POST   /api/v1/selections/:id/items          add leaf (returns dependencies)
GET    /api/v1/selections/:id                review: renumbered, total marks
```

## Seeding past papers

Real 9618 papers are transcribed at sub-part level and seeded from
`packages/db/src/seed/`:

```bash
pnpm db:seed-paper-11   # 9618/11/M/J/23
pnpm db:seed-paper-12   # 9618/12/M/J/23
pnpm db:seed-paper-13   # 9618/13/M/J/23
pnpm db:seed-papers     # all transcripts in one process
```

All source QP/MS PDFs live in `papers/` (git-ignored), downloaded by
`scripts/download-papers.py` from Google Drive.

## Notes

The previous Express + `pg` implementation is preserved on the
`archive/express-stack` branch.
