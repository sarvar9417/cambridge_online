# CamPath — Cambridge 9618 Preparation Platform

**Spec versiyasi:** 3.0  
**Sana:** 2026-08-13  
**Asosiy arxitektura qarori:** sodda `frontend/` + `backend/`

**Joriy loyiha/release holati (canonical):** [`PROJECT-STATE.md`](./PROJECT-STATE.md)  
**Tarixiy implementatsiya snapshoti:** [`IMPLEMENTATION-STATUS.md`](./IMPLEMENTATION-STATUS.md)

> Current holat, corpus window/count, acceptance yoki infrastructure bo'yicha eski hujjat
> `PROJECT-STATE.md` bilan zid bo'lsa, `PROJECT-STATE.md` ustun hisoblanadi.

## Bu nima

Cambridge International AS & A Level Computer Science 9618 uchun o'qituvchi
boshqaruvidagi platforma:

1. Topic bo'yicha strukturalangan savol banki va mashina o'qiydigan mark scheme.
2. Vazifa → javob → baholash → mark point darajasidagi feedback oqimi.
3. Notes, glossary, flashcard, quiz va o'yinlardan iborat topic kontenti.

## Fayllar

| Fayl | Mazmun |
|---|---|
| `PROJECT-STATE.md` | Joriy product/release/corpus/acceptance holatining yagona canonical manifesti |
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
┌──────────────────┐   HTTPS/JSON   ┌──────────────────────────┐
│ frontend/        │ ─────────────► │ backend/                 │
│ React + Vite     │ ◄───────────── │ Node.js + Express        │
└──────────────────┘                │ auth · API · domain · job│
                                    └───────────┬──────────────┘
                                                │
                              ┌─────────────────┼──────────────┐
                              ▼                 ▼              ▼
                       ┌────────────┐   ┌──────────────┐  ┌─────────┐
                       │ PostgreSQL │   │ Supabase     │  │ Claude  │
                       │ data + jobs│   │ private files│  │ API     │
                       └────────────┘   └──────────────┘  └─────────┘
```

Faza 0–1 da alohida worker, Redis, BullMQ va MinIO yo'q. Faza 2 dan boshlab
uzoq ishlar PostgreSQL `jobs` jadvaliga yoziladi va `backend/src/jobs/runner.ts`
bajaradi. Dastlab runner backend bilan bir processda ishlashi mumkin. Yuk oshsa
shu entrypoint alohida Node.js process qilib deploy qilinadi; repo tuzilmasi
o'zgarmaydi.

Productionda ikkala papka bitta Vercel projectdan chiqadi: React static build,
Express esa `api/[...path].ts` catch-all serverless Function orqali ishlaydi.
`/api/*` bir xil domen ostida backendga uzatiladi.

## Texnologiyalar

```text
Frontend    React 19 · TypeScript · Vite · custom client-side router · fetch API client
Backend     Node.js · Express 5 · TypeScript · node-postgres (pg) · Zod
Database    PostgreSQL 16 / Supabase
Jobs        PostgreSQL jobs jadvali
Storage     Local disk (dev/export temp) · private Supabase Storage (source assets)
Auth        JWT access 15 daqiqa · refresh 30 kun · argon2id
AI          Anthropic Claude API (faqat backend; configured bo'lsa)
PDF/DOCX    Puppeteer/Chromium · DOCX renderer
Test        Vitest · Supertest · browser smoke/audit fixtures
Package     npm workspaces
```

Frontendning current `package.json` faylida TanStack Query yoki React Router dependency
yo'q. Routing `frontend/src/lib/router` orqali, API access esa loyiha fetch wrapperlari
orqali amalga oshiriladi. Bu hujjat eski rejalashtirilgan stackni current implementation
deb ko'rsatmasligi kerak.

Express va `pg` loyiha egasiga tanish, oqimi ochiq va deploy'i sodda. Migration
oddiy SQL bo'ladi; analitik so'rovlar yashirin ORM qatlamisiz bajariladi.

## Repo strukturasi

```text
campath/
├─ frontend/
│  ├─ src/
│  │  ├─ teaching/
│  │  ├─ student/
│  │  ├─ components/
│  │  └─ lib/
│  │     ├─ api.ts
│  │     └─ router.ts
│  └─ package.json
├─ backend/
│  ├─ src/
│  │  ├─ routes/
│  │  ├─ middleware/
│  │  ├─ services/
│  │  ├─ repositories/
│  │  ├─ database/
│  │  │  ├─ migrations/
│  │  │  └─ audits/
│  │  ├─ jobs/
│  │  └─ lib/
│  └─ package.json
├─ api/
├─ prompts/
├─ scripts/
├─ package.json
└─ .env.example
```

Frontend backend ichki fayllarini import qilmaydi. Ular faqat `/api/v1` JSON
shartnomasi orqali gaplashadi. Yakuniy ball har doim backendda hisoblanadi;
frontenddagi hisob faqat optimistik ko'rinish.

## Agent uchun qat'iy qoidalar

### R1 — Fazadan chiqma

`10-phases.md` build-order va acceptance talablarini belgilaydi. Loyiha hozir boshlang'ich
fazalardan o'tgan; current next-action va release gate uchun `PROJECT-STATE.md` ustun.

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

Authorization va route-coverage testlari majburiy. Auth middleware'dan tashqarida
yopiq route topilsa CI yiqilishi kerak.

### R5 — AI ball bermaydi

Model faqat mark point uchun dalil topadi. Ballni sof
`backend/src/lib/marking.ts` funksiyasi hisoblaydi.

### R6 — AI chiqishi validatsiyalanadi

Deterministik tekshiruvdan o'tmagan natija `needs_review` bo'ladi. Xato jim
qabul qilinmaydi.

### R7 — Migration faqat oldinga

`backend/src/database/migrations/NNNN_name.sql`. Qo'llangan migration tahrirlanmaydi;
yangi o'zgarish yangi raqamli fayl bilan yoziladi.

### R8 — Seed majburiy

Development/acceptance seedlari production source corpus o'rnini bosmaydi. Current
Cambridge release holati source-backed production audit bilan isbotlanadi.

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

`.env` faqat local. `ANTHROPIC_API_KEY`, database va private storage credentials faqat
server muhitida bo'ladi va hech qachon `VITE_` prefiksi bilan frontendga uzatilmaydi.

### R13 — Promptlar faylda

Promptlar `prompts/` ichida versiyalanadi; ishlatilgan `prompt_version` bazaga yoziladi.

## Ishga tushirish

```bash
npm install
cp .env.example .env
npm run db:migrate -w backend
npm run dev
```

- Frontend odatda `http://localhost:5173`
- Backend `http://localhost:3001`
- Health `http://localhost:3001/api/v1/health`

Current keyingi ish tartibi va release blockerlar: [`PROJECT-STATE.md`](./PROJECT-STATE.md)
`Required next release gates` bo'limi.
