# 12 — API shartnomasi

`apps/api` — NestJS 10. Barcha javob va so'rovlar JSON. Prefiks: `/api/v1`.
(v4: eski `backend` — Express yozuvi talab sifatida qoladi; amalga oshirilgan
tuzilma va dalillar `IMPLEMENTATION-STATUS.md` da.)

---

## 1. Autentifikatsiya

### 1.1 Token modeli

| Token | Muddat | Qayerda |
|---|---|---|
| Access (JWT) | 15 daqiqa | `Authorization: Bearer <token>` |
| Refresh | 30 kun | **httpOnly, Secure, SameSite=Strict** cookie |

**Nega refresh cookie'da:** o'quvchi paneli umumiy kompyuterlarda ochiladi.
`localStorage` dagi token XSS orqali o'g'irlanadi; httpOnly cookie o'g'irlanmaydi.

Access token `localStorage` ga **yozilmaydi** — xotirada (React state) saqlanadi.
Sahifa yangilanganda `/auth/refresh` bilan qayta olinadi.

### 1.2 JWT payload

```json
{ "sub": "uuid", "role": "student", "schoolId": "uuid",
  "tv": 3, "iat": 1723526400, "exp": 1723527300 }
```

`tv` (token version) — `users.token_version`. Parol o'zgarsa yoki hisob
bloklansa oshiriladi va barcha mavjud access token'lar bekor bo'ladi.

### 1.3 Endpoint'lar

| Metod | Yo'l | Izoh |
|---|---|---|
| `POST` | `/auth/login` | `{ identifier, password }` — email yoki username |
| `POST` | `/auth/refresh` | Cookie'dan o'qiydi. **Rotatsiya:** eski token bekor qilinadi |
| `POST` | `/auth/logout` | Refresh token bekor qilinadi |
| `POST` | `/auth/redeem-invite` | `{ code, fullName, password }` → hisob yaratadi |
| `GET` | `/auth/me` | Joriy foydalanuvchi |
| `POST` | `/auth/change-password` | Barcha refresh token'larni bekor qiladi |

**Refresh rotatsiyasi majburiy.** Ishlatilgan refresh token qayta kelsa —
o'g'irlangan deb hisoblanadi va foydalanuvchining **barcha** sessiyalari bekor qilinadi.

### 1.4 Rate limiting

| Endpoint | Limit |
|---|---|
| `/auth/login` | 5 / 15 daqiqa / IP + identifier |
| `/auth/redeem-invite` | 10 / soat / IP |
| Umumiy | 300 / daqiqa / foydalanuvchi |
| AI job yaratish | 60 / soat / foydalanuvchi |

---

## 2. Konventsiyalar

### 2.1 Nomlash

Yo'llar `kebab-case`, JSON maydonlari `camelCase`, DB ustunlari `snake_case`.
Konvertatsiya repository qatlamida (SQL mapping), route handlerda emas.

### 2.2 Sahifalash

```
GET /questions?limit=50&cursor=eyJpZCI6...
→ { "data": [...], "nextCursor": "eyJpZCI6..." | null }
```

Cursor-based, offset emas — savol banki katta va offset chuqurlashganda sekinlashadi.

### 2.3 Xato formati

```json
{
  "error": {
    "code": "time_expired",
    "message": "Imtihon vaqti tugadi.",
    "details": { "deadline": "2026-08-13T10:45:00Z" }
  }
}
```

`code` — mashina uchun, barqaror. `message` — o'zbekcha, foydalanuvchiga ko'rsatiladi.

| HTTP | Qachon |
|---|---|
| 400 | Validatsiya xatosi (Zod) |
| 401 | Token yo'q / muddati o'tgan |
| 403 | Rol yetarli emas |
| **404** | Topilmadi **yoki ruxsat yo'q** ← ma'lumot sizmasligi uchun |
| 409 | Holat mos emas (`already_submitted`, `time_expired`) |
| 410 | Ishlatilgan/muddati o'tgan taklif kodi |
| 422 | Domen qoidasi buzilgan (mark scheme yig'indisi mos emas) |
| 429 | Rate limit |
| 500 | Ichki xato (`requestId` bilan) |

**404 vs 403 qoidasi:** resurs mavjud emas va resursga ruxsat yo'q — ikkalasi ham
`404`. `403` faqat **rol** yetarli emasligida (masalan student `owner` endpoint'iga).
Aks holda hujumchi `403` orqali resurs mavjudligini bilib oladi.

### 2.4 Validatsiya

Backend request va job payload Zod sxemalari `packages/shared` da.
Frontend o'z formasi va API javobini bir xil `packages/shared` sxemalari bilan
validatsiya qiladi; frontend backend ichki faylini import qilmaydi.

### 2.5 Idempotentlik

Yon ta'sirli `POST` lar `Idempotency-Key` sarlavhasini qo'llab-quvvatlaydi
(attempt boshlash, vazifa nashr qilish, eksport). 24 soat kesh.

---

## 3. Asosiy endpoint'lar

### Savollar (Prompt C — amalga oshirilgan)

```
GET    /questions?view=parts|families&component&topicIds&subtopicIds
                  &commandWords&marksMin&marksMax&aos&yearFrom&yearTo&series
                  &hasDiagram&status&q&unusedInClassId&dependency&limit
GET    /questions/filter-options
GET    /questions/:id/portable             → leaf + context chain + assets + dependencies
```

- `view=parts` (default) — faqat leaf'lar (ball oladigan sub-part'lar);
  `view=families` — ildiz savol ostida mos qismlar guruhlanadi.
- `portable` — recursive CTE bilan leaf'dan ildizgacha butun kontekst zanjiri,
  har bir tugunning `context` va `assets`lari ajdod tartibida.
- `dependency=independent` — qardosh savolga havola qilmaydigan leaf'lar.
- `difficulty` va `unusedInClassId` — hozircha `unavailableFilters` sifatida
  qaytadi (baholash/topshiriq moduli kelganda ishga tushadi).

### Tanlash / savatcha (Prompt C — amalga oshirilgan)

```
GET    /selections
POST   /selections                        { name }
GET    /selections/:id                    → ko'rib chiqish: qayta raqamlangan, jami ball
POST   /selections/:id/items              { questionId, role } → dependencies qaytadi
PATCH  /selections/:id/items/:itemId      { role }  graded | context_only
DELETE /selections/:id/items/:itemId
```

- `role=context_only` element ballga qo'shilmaydi (`effectiveMarks: 0`).
- `POST .../items` javobida `dependencies` bor — add-time modal shu yerda ochiladi;
  `answer_ref` bog'liqlik uchun context_only taklif qilinmaydi.
- Qayta raqamlash: `Q1`, `Q1(a)`, `Q1(b)(i)`; asl manba `source_ref` da saqlanadi.

Qolgan rejalashtirilgan savol endpoint'lari (PATCH, approve, stats) hali yo'q —
savol tahrirlash Prompt A/B darajasida ingestion bilan, tasdiqlash oqimi keyingi
fazada.

> ★ O'quvchi uchun serializer `markScheme` va `markSchemePoints` ni **olib tashlaydi**,
> baho `released` bo'lmaguncha. Bu `backend/src/services/question-serializer.ts` da,
> route handler ichida emas — bitta joyda, unutilmasin.

### Vazifalar

```
GET    /classes/:id/assignments
POST   /assignments                      teacher
POST   /assignments/generate             teacher — avto-generator
PATCH  /assignments/:id
POST   /assignments/:id/publish
POST   /assignments/:id/session/open     proctored mock — kod qaytaradi
POST   /assignments/:id/session/close
GET    /assignments/:id/results
```

### Attempt va javoblar

```
POST   /assignments/:id/attempt          → { startedAt, deadline, serverNow }
GET    /submissions/:id
PUT    /submissions/:id/answers/:questionId
POST   /submissions/:id/submit
POST   /submissions/:id/heartbeat        → { serverNow, remainingSeconds }
POST   /submissions/:id/extend           teacher
POST   /submissions/:id/grant            teacher
```

`heartbeat` har 30 s. Vazifasi: taymer sinxronizatsiyasi, `time_spent_s`,
sessiya tirikligi. Javob 10 daqiqadan ko'p kelmasa — `session_switch` bayrog'i.

### Baholash

```
GET    /grading/queue?classId&mode=by_question|by_student&sort=confidence
GET    /gradings/:id
PATCH  /gradings/:id/points/:pointId     { teacherMatched }  → ball qayta hisoblanadi
POST   /gradings/:id/confirm
POST   /gradings/:id/release
POST   /gradings/:id/appeal              student
```

`PATCH .../points/:pointId` — MP toggle. Javobda yangi `finalScore` qaytadi;
frontend optimistik preview ko'rsatishi mumkin, lekin server qaytargan `finalScore`
har doim yakuniy haqiqat.

### Ingestion

```
POST   /ingestion/upload                 owner → backend/private storage
POST   /ingestion/papers                 owner → job navbatga
GET    /ingestion/papers?status
GET    /ingestion/review-queue?ruleCode&severity&limit
POST   /ingestion/findings/:id/resolve   { resolution }
POST   /ingestion/findings/bulk-resolve  { ruleCode, resolution }
```

### Kontent, analitika, eksport

```
GET    /topics · /subtopics/:id/content · /flashcards/due · POST /flashcards/:id/review
GET    /analytics/classes/:id/heatmap · /mark-points · /command-words
GET    /analytics/students/:id/mastery
GET    /analytics/ai-quality            owner
POST   /exports                          → job → { exportId }
GET    /exports/:id                      → { status, url? }
```

---

## 4. Uzoq operatsiyalar

Ingestion, eksport, kontent generatsiyasi darrov qaytmaydi:

```
POST /exports  →  202 { "jobId": "...", "status": "queued" }
GET  /jobs/:id →  { "status": "running", "progress": 0.4 }
               →  { "status": "succeeded", "result": { "url": "https://..." } }
```

Frontend `GET /jobs/:id` ni 2 s da bir marta poll qiladi (TanStack Query).
WebSocket kerak emas — bu operatsiyalar kam va qisqa.

**Istisno:** baholash navbati va vazifa progressi — SSE (`GET /events/stream`).
O'qituvchi 30 ta javobni baholayotganda navbat real vaqtda yangilanishi kerak.

---

## 5. Sog'liq va kuzatuv

```
GET /health   → 200 { status: 'ok' }                    liveness
GET /ready    → 200 { db: 'ok' } readiness
```

Har bir so'rovda `X-Request-Id`. Pino JSON log: `requestId`, `userId`, `route`,
`durationMs`, `status`. **Parol, token, o'quvchi javobi log'ga yozilmaydi.**

Job runner log'larida `jobId`, `attempt`, `promptVersion`, `costUsd`.

---

## 6. Frontend mijoz

`apps/web/src/lib/api.ts` — yagona `fetch` wrapper:

- Access token'ni xotiradan qo'shadi
- `401` kelsa avtomatik `/auth/refresh`, keyin so'rovni bir marta qaytaradi
- Refresh ham yiqilsa → login sahifasi
- `credentials: 'include'` (refresh cookie uchun)
- Zod bilan javobni parse qiladi — tip xavfsizligi runtime'da ham

**Har bir endpoint uchun TanStack Query hook** `features/*/api.ts` da.
Komponentlar `api.ts` ni to'g'ridan-to'g'ri chaqirmaydi.
