# CamPath

CamPath uses one repository and one Vercel project:

- `frontend/` - React and Vite
- `backend/` - Express and PostgreSQL
- `api/` - Vercel adapter for the Express backend

## Local development

Install dependencies once:

```bash
npm install
```

Then start the complete frontend and backend with one command:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:3001/api/v1/health

Apply migrations and seed the official 9618 syllabus:

```bash
npm run db:migrate -w backend
npm run db:seed -w backend
```

Run all checks (format, lint, typecheck, tests, build) with:

```bash
npm run verify
```

## Background jobs

PDF export, ingestion and automatic attempt closing need a long-lived process.
Vercel functions are serverless, so run the worker on any always-on host that
can reach the same `DATABASE_URL`:

```bash
npm run jobs -w backend
```

Without it the application still works — assignments, answers, manual grading
and results are all request-scoped — but exports stay queued and expired
attempts are not auto-submitted (writing past the deadline is refused either way).

## Production

- Application: https://cambridge-online.vercel.app
- Repository: https://github.com/sarvar9417/cambridge_online

The Vercel project must have `DATABASE_URL`, `JWT_SECRET`,
`JWT_REFRESH_SECRET`, `FRONTEND_URL`, and `NODE_ENV=production` configured for
Production, Preview, and Development as appropriate. Do not commit `.env`.
Serverless deployments default to two PostgreSQL connections per function;
`DB_POOL_MAX` can override that limit when the database plan allows it.

Detailed product requirements are in `00-README.md` through `12-api.md`.
