# CamPath — Cambridge 9618 Preparation Platform

**Spec versiyasi:** 3.0  
**Sana:** 2026-08-13  
**Asosiy arxitektura qarori:** pnpm workspaces monorepo — `apps/` + `packages/`  
> **v4 eslatma:** joriy implementatsiya `frontend/`+`backend/` o'rniga `apps/`
> (api, worker, web) va `packages/` (db, shared, ai) tuzilmasida. Bu hujjat
> talablarni tasvirlaydi; haqiqiy tuzilma va dalillar
> [`IMPLEMENTATION-STATUS.md`](./IMPLEMENTATION-STATUS.md) da.

**Joriy implementatsiya dalillari:** [`IMPLEMENTATION-STATUS.md`](./IMPLEMENTATION-STATUS.md)

## Bu nima

Cambridge International AS & A Level Computer Science 9618 uchun o'qituvchi
boshqaruvidagi platforma:

1. Topic bo'yicha strukturalangan savol banki va mashina o'qiydigan mark scheme.
2. Vazifa → javob → baholash → mark point darajasidagi feedback oqimi.
3. Notes, glossary, flashcard, quiz va o'yinlardan iborat topic kontenti.

## Fayllar

| Fayl | Mazmun |
|---|---|
| `00-README.md` | Arxitektura va agent qoidalari |
| `01-overview.md` | Mahsulot doirasi va rollar |
| `02-data-model.md` | PostgreSQL sxemasi va authorization |
| `03-ingestion.md` | PDF ingestion pipeline |
| `04-ai-grading.md` | AI baholash va kalibrlash |
| `05-admin-ui.md` | O'qituvchi paneli |
| `06-student-ui.md` | O'quvchi paneli |
| `07-content-system.md` | Kontent tizimi |
| `08-export-and-papers.md` | PDF va paper generator |
| `09-analytics.md` | Mastery va analitika |
| `10-phases.md` | Qurish fazalari |
| `11-ops-and-legal.md` | Deploy, xarajat va huquq |
| `12-api.md` | REST API shartnomasi |

## Arxitektura

```text
┌────────────┐   HTTPS/JSON   ┌──────────────────────────┐
│ apps/web   │ ─────────────► │ apps/api                 │
│ React+Vite │ ◄───────────── │ NestJS · auth · API      │
└────────────┘                └───────────┬──────────────┘
                                          │ (BullMQ / Redis)
                                          ▼
                                 ┌──────────────────┐
                                 │ apps/worker      │  ingestion · grading · export
                                 └──────────────────┘
                                          │
                ┌─────────────────────────┼──────────────┐
                ▼                         ▼              ▼
         ┌──────────────┐         ┌─────────────┐  ┌─────────┐
         │ PostgreSQL   │         │ S3 storage  │  │ Claude  │
         │ (Supabase)   │         │ (Supabase)  │  │ API     │
         └──────────────┘         └─────────────┘  └─────────┘
```

Uzoq ishlar (ingestion, PDF export, baholash) `apps/worker` da BullMQ
consumer'larida bajariladi — API processida emas (R-sil). `packages/shared`
domen qoidalarini (marking, srs, validation) API, worker va web uchun yagona
joyda ushlaydi. `packages/db` migration va seed'ni olib yuradi.

Production: `apps/api` va `apps/worker` Supabase bilan ishlaydi; Redis hosting
talab qiladi (Upstash yoki o'xshash). Vercel'da worker ishlamaydi — worker
alohida har doim-yoniq host kerak (qarang `README.md`).

## Texnologiyalar

```text
apps/api        NestJS 10 · Express 4 · TypeScript · pg · Zod · jose
apps/worker     NestJS 10 standalone · BullMQ · Redis
apps/web        React 18 · TypeScript · Vite · Tailwind · TanStack Query
packages/db     Drizzle ORM · PostgreSQL 16 · SQL migrations · tsx seed
packages/shared Zod · marking.ts · srs.ts · validation (23 qoida)
packages/ai     Anthropic Claude wrapper (faqat worker, R9)
Auth        JWT access 15 daqiqa · refresh 30 kun · argon2id · token rotation
PDF         Chrome headless (apps/worker export processor)
Test        Vitest · Supertest · Testcontainers (real Postgres)
Package     pnpm workspaces
```

NestJS global `JwtAuthGuard` + `RolesGuard` (APP_GUARD) default DENY qiladi;
`@Public()` faqat kelishilgan besh endpointda. Migration oddiy SQL fayllar.

## Repo strukturasi

```text
campath/
├─ apps/
│  ├─ api/          NestJS REST · auth · guards · routes
│  ├─ worker/       NestJS standalone · BullMQ consumer'lar
│  └─ web/          React + Vite · features/ · lib/api.ts
├─ packages/
│  ├─ db/           Drizzle schema · migrations/ · seed/
│  ├─ shared/       Zod · marking.ts · srs.ts · validation/
│  └─ ai/           Claude wrapper (worker-only)
├─ prompts/         versiyalangan promptlar (R13)
├─ papers/          manba QP/MS PDFlar (git-ignore)
├─ scripts/         download-papers.py va boshqalar
├─ claude.md        loyiha qoidalari
└─ .env.example
```

Frontend backend ichki fayllarini import qilmaydi. Ular faqat `/api/v1` JSON
shartnomasi orqali gaplashadi. Yakuniy ball har doim backendda hisoblanadi;
frontenddagi hisob faqat optimistik ko'rinish.

## Agent uchun qat'iy qoidalar

### R1 — Fazadan chiqma

`10-phases.md` tartibida ishlanadi. Faza N acceptance mezonlari tugamaguncha
N+1 funksiyasi yozilmaydi.

### R2 — Sxema yagona haqiqat manbai

`02-data-model.md` dagi sxema o'zboshimchalik bilan o'zgartirilmaydi. Yetishmagan
ustun yoki constraint topilsa, kod bilan yashirilmaydi; loyiha egasidan so'raladi.

### R3 — Har bir endpoint authorization bilan

Express route tartibi qat'iy:

1. Faqat `/health`, `/auth/login`, `/auth/refresh`, `/auth/redeem-invite` ochiq.
2. Ulardan keyin global `requireAuth` middleware mount qilinadi.
3. Role endpointlari `requireRoles(...)` ishlatadi.
4. Resurs endpointlari class/submission ownership middleware ishlatadi.
5. Repository metodlari `actor` qabul qiladi va SQL so'rovining o'zida scope qiladi.

Default qaror — rad etish. Ruxsat yo'q resurs ham mavjud bo'lmagan resurs kabi
`404` qaytaradi; `403` faqat rol yetarli bo'lmaganda ishlatiladi.

### R4 — Authorization testlari deployni bloklaydi

`apps/api/test/authz.e2e-spec.ts` dagi 14 ssenariy va
`apps/api/test/route-coverage.spec.ts` majburiy (claude.md dagi blocking testlar).
Auth guard'dan tashqarida yopiq route topilsa test yiqiladi.

### R5 — AI ball bermaydi

Model faqat mark point uchun dalil topadi. Ballni sof
`packages/shared/marking.ts` funksiyasi hisoblaydi (R5: yagona nusxa — worker,
api, web import qiladi).

### R6 — AI chiqishi validatsiyalanadi

Deterministik tekshiruvdan o'tmagan natija `needs_review` bo'ladi. Xato jim
qabul qilinmaydi.

### R7 — Migration faqat oldinga

`packages/db/migrations/NNNN_name.sql`. Qo'llangan migration tahrirlanmaydi;
yangi o'zgarish yangi raqamli fayl bilan yoziladi.

### R8 — Seed majburiy

Faza 0 uchun 1 maktab, 2 sinf, 12 o'quvchi va acceptance talabidagi 20 qo'lda
kiritilgan savol bo'ladi.

### R9 — Til

UI o'zbekcha. Cambridge atamalari (command word, mark scheme, mark point,
learning objective) tarjima qilinmaydi. Kod va kommentariya inglizcha.

### R10 — Xarajat nazorati

Har bir Claude chaqiruvi `ai_calls` jadvaliga model, token, latency, narx va
maqsad bilan yoziladi.

### R11 — Idempotent job

`jobs.payload.idempotencyKey`: `ingest:{sha256}` yoki
`grade:{answerId}:{promptVersion}`. Qayta urinish dublikat yaratmaydi.

### R12 — Sirlar kodda emas

`.env` faqat local. `ANTHROPIC_API_KEY` faqat backend muhitida bo'ladi va hech
qachon `VITE_` prefiksi bilan frontendga uzatilmaydi.

### R13 — Promptlar faylda

Promptlar `prompts/` ichida versiyalanadi; ishlatilgan `prompt_version` bazaga yoziladi.

## Ishga tushirish

```bash
pnpm install
cp .env.example .env        # Supabase DATABASE_URL / DIRECT_URL / JWT_SECRET
pnpm db:migrate             # packages/db, DIRECT_URL bilan
pnpm db:seed                # owner, teacher, 2 sinf, 12 o'quvchi
pnpm db:seed-papers         # 9618 transkripsiyalari (ixtiyoriy)
docker compose up           # api :3001, worker, web :5173, redis :6379
```

- Web odatda `http://localhost:5173`
- API `http://localhost:3001`
- Health `http://localhost:3001/api/v1/health`

Tekshiruv: `pnpm verify` (format · lint · typecheck · test).
