# CamPath — Cambridge 9618 Preparation Platform

**Spec versiyasi:** 3.0  
**Sana:** 2026-08-13  
**Asosiy arxitektura qarori:** sodda `frontend/` + `backend/`

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
┌──────────────────┐   HTTPS/JSON   ┌──────────────────────────┐
│ frontend/        │ ─────────────► │ backend/                 │
│ React + Vite     │ ◄───────────── │ Node.js + Express        │
└──────────────────┘                │ auth · API · domain · job│
                                    └───────────┬──────────────┘
                                                │
                              ┌─────────────────┼──────────────┐
                              ▼                 ▼              ▼
                       ┌────────────┐   ┌──────────────┐  ┌─────────┐
                       │ PostgreSQL │   │ File storage │  │ Claude  │
                       │ data + jobs│   │ hosted later │  │ API     │
                       └────────────┘   └──────────────┘  └─────────┘
```

Faza 0–1 da alohida worker, Redis, BullMQ va MinIO yo'q. Faza 2 dan boshlab
uzoq ishlar PostgreSQL `jobs` jadvaliga yoziladi va `backend/src/jobs/runner.ts`
bajaradi. Dastlab runner backend bilan bir processda ishlashi mumkin. Yuk oshsa
shu entrypoint alohida Node.js process qilib deploy qilinadi; repo tuzilmasi
o'zgarmaydi.

Productionda ikkala papka bitta Vercel projectdan chiqadi: React static build,
Express esa `api/index.ts` orqali serverless Function bo'ladi. `/api/*` rewrite
qilinadi, shu sabab foydalanuvchi uchun bitta domen va bitta deploy mavjud.

## Texnologiyalar

```text
Frontend    React 19 · TypeScript · Vite · TanStack Query · React Router
Backend     Node.js · Express 5 · TypeScript · node-postgres (pg) · Zod
Database    PostgreSQL 16
Jobs        PostgreSQL jobs jadvali (MVP)
Storage     Local disk (dev) · S3-compatible hosted storage (Faza 2+)
Auth        JWT access 15 daqiqa · refresh 30 kun · argon2id
AI          Anthropic Claude API (faqat backend)
PDF         Puppeteer (Faza 3)
Test        Vitest · Supertest · Playwright
Package     npm workspaces
```

Express va `pg` loyiha egasiga tanish, oqimi ochiq va deploy'i sodda. Migration
oddiy SQL bo'ladi; analitik so'rovlar yashirin ORM qatlamisiz bajariladi.

## Repo strukturasi

```text
campath/
├─ frontend/
│  ├─ src/
│  │  ├─ features/
│  │  ├─ components/
│  │  └─ lib/api.ts
│  └─ package.json
├─ backend/
│  ├─ src/
│  │  ├─ routes/
│  │  ├─ middleware/
│  │  ├─ services/
│  │  ├─ repositories/
│  │  ├─ database/
│  │  │  ├─ migrations/
│  │  │  └─ seed/
│  │  ├─ jobs/
│  │  └─ lib/
│  └─ package.json
├─ prompts/
├─ package.json
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

`backend/src/**/*.authz.test.ts` dagi 14 test va route-coverage testi majburiy.
Auth middleware'dan tashqarida yopiq route topilsa test yiqiladi.

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
npm install
cp .env.example .env
npm run db:migrate -w backend
npm run dev
```

- Frontend odatda `http://localhost:5173`
- Backend `http://localhost:3001`
- Health `http://localhost:3001/api/v1/health`

Keyingi ish tartibi: `10-phases.md` → Faza 0.
