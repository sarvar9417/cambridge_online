# CamPath — Cambridge 9618 exam preparation platform

## What this is
A teacher-run platform for Cambridge International AS & A Level Computer Science
(9618). Core value: a question bank where past paper questions are stored at
**sub-part level** with machine-readable mark schemes, so a teacher can filter by
topic, cherry-pick individual sub-parts, and generate assignments or PDFs.

## Stack — do not substitute
- Monorepo: pnpm workspaces
- `apps/api` — NestJS 10, REST, JWT auth
- `apps/worker` — NestJS standalone, BullMQ consumers (no HTTP)
- `apps/web` — React 18 + Vite + TypeScript + Tailwind + TanStack Query
- `packages/db` — Drizzle ORM, PostgreSQL 16, SQL migrations
- `packages/shared` — Zod types, marking.ts, srs.ts, validation rules
- `packages/ai` — Anthropic Claude wrapper (claude-sonnet-4-6)
- Redis 7 (BullMQ), S3-compatible storage (MinIO local / R2 prod)
- Local dev: `docker compose up`

## Non-negotiable rules

### R1 — Authorization on every endpoint
There is no RLS. Authorization lives entirely in the application.
- Global `JwtAuthGuard` + `RolesGuard` via `APP_GUARD`. Default is DENY.
- Public routes must be explicitly marked `@Public()`. Only: `/auth/login`,
  `/auth/refresh`, `/auth/redeem-invite`, `/health`, `/ready`.
- Every repository method takes `actor: Actor` and scopes in SQL.
- Never write a repository method without an `actor` parameter.

### R2 — 404, not 403, for missing OR unauthorised resources
`403` is only for insufficient ROLE. Anything else returns `404` so an attacker
cannot probe for resource existence.

### R3 — Mark schemes are hidden until grades are released
Strip `markScheme` and `markSchemePoints` in the **serializer**, not the frontend.
One place. A student must never receive mark scheme data in an API response
before `gradings.released_at` is set for that answer.

### R4 — AI never assigns a score
The model only matches mark points and cites verbatim evidence. Scores are
computed by `packages/shared/marking.ts`, a pure function. Never write a prompt
that asks the model for a numeric score.

### R5 — marking.ts has exactly one copy
It is used by worker (AI results), api (teacher toggles), and web (optimistic
display). Never duplicate it. If you need it somewhere, import from
`@campath/shared`.

### R6 — Every AI output passes deterministic validation
Extraction, grading, content generation. Anything failing validation gets
`status = 'needs_review'` and a row in `validation_findings`. Never silently accept.

### R7 — Prompts are versioned files, never inline strings
Store in `prompts/<name>.v<N>.md`. Write `prompt_version` to the database on
every AI call. Log every call to `ai_calls` (model, tokens, cost, latency, purpose).

### R8 — Migrations move forward only
`packages/db/migrations/NNNN_name.sql`. Never edit an applied migration.

### R9 — Secrets
`ANTHROPIC_API_KEY` exists **only** in the worker environment. Not in api, not
in web. AI calls happen only through the queue.

### R10 — Language
UI strings: **Uzbek**. Cambridge terms stay English (command word, mark scheme,
mark point, learning objective, subtopic). Code, comments, commit messages: English.

## Blocking tests
CI fails and deploy is blocked if either fails:
- `apps/api/test/authz.e2e-spec.ts` — 14 authorization scenarios
- `apps/api/test/route-coverage.spec.ts` — every route has a guard or `@Public()`

Write these in the first session. They are not optional and not "later".

## Domain vocabulary
- **QP / MS** — question paper / mark scheme PDF
- **Leaf** — a sub-part that carries marks, e.g. `Q3(c)(i)`. The unit of search
  and selection. Parent nodes carry context, not marks.
- **Context chain** — ancestors of a leaf, root to parent. Must travel with the
  leaf whenever it is extracted.
- **Mark point (MP)** — one awardable idea in a mark scheme
- **Scheme type** — `all_required` | `any_n_from_m` | `levels_of_response` |
  `exact_match` | `code_output` | `manual_only`
- **Dependency** — one leaf referring to another, e.g. "the table in part (a)"
- **Selection / basket** — a teacher's working set of leaves across searches
- **Ground truth** — a teacher-assigned grade, used to measure AI agreement

## Working style
- Ask before changing the schema. Do not adapt code to work around it.
- Build one feature end to end before starting the next.
- After each task, report: what was built, what was tested, what you are unsure about.
- Do not add libraries not listed above without asking.