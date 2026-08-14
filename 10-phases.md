# 10 — Qurish fazalari

## Umumiy tamoyil

Ikkita mustaqil yo'l parallel ketadi:

```
QURISH YO'LI (AI tezlashtiradi)      MA'LUMOT YO'LI (tezlashtirilmaydi)
Faza 0 → 1 → 2 → 3 → 4 → 5           Ground truth: 200 baholangan javob
    ~2 hafta                          Real sinf ishi: ~4 hafta
```

Ikkinchisi qisqartirilmaydi. Shuning uchun 1–2-haftada sinf platformadan
foydalana boshlashi kerak — AI baholashsiz ham.

> **v4 eslatma:** amalga oshirish `apps/` (api, worker, web) + `packages/` (db,
> shared, ai) monoreposida. Quyidagi `frontend/`+`backend/` nomlari talab
> darajasida qoladi. Faza 0 (skelet + auth), Faza 2 (ingestion) va Prompt C
> (savol banki + ajratib olish) bajarildi; worker `apps/worker` da BullMQ bilan
> alohida process — Vercel'da ishlamaydi (`IMPLEMENTATION-STATUS.md`).

---

## Faza 0 — Skelet va authorization (3–4 kun)

**Maqsad:** ma'lumot modeli va ruxsat qatlami to'g'riligini isbotlash.

| Ish | Chiqish |
|---|---|
| npm workspaces: `frontend/`, `backend/` | Tushunarli struktura |
| Hosted yoki local PostgreSQL | Yagona infratuzilma bog'liqligi |
| Oddiy SQL migration 0001–0011 | To'liq DB |
| Auth: login, refresh rotatsiyasi, invite redemption | JWT oqimi |
| **Middleware: `requireAuth`, `requireRoles`, `requireClassAccess`** | Ruxsat qatlami |
| `backend/src/lib`: Zod tiplar, `marking.ts` skeleti | Domain kodi |
| Seed: 1 maktab, 2 sinf, 12 o'quvchi | Test ma'lumot |
| **20 savolni QO'LDA kiritish** (ingestion yo'q) | Sxema sinovdan o'tdi |
| **14 ta authz testi + route coverage testi** | ★ Deploy blokeri |

### Acceptance
- [ ] 14 ta authorization testi o'tadi (`02-data-model.md` §12.6)
- [ ] Route coverage testi o'tadi — auth middleware'dan tashqarida yopiq endpoint yo'q
- [ ] Refresh rotatsiyasi ishlaydi; ishlatilgan token qayta kelsa barcha sessiyalar bekor
- [ ] O'quvchi login qiladi va faqat o'z sinfini ko'radi
- [ ] Qo'lda kiritilgan 20 savol daraxt strukturasi bilan to'g'ri saqlanadi
- [ ] `any 3 from 5`, `levels_of_response`, diagrammali savol — hammasi kiritilgan
- [ ] `/ready` PostgreSQL bog'liqligini `ok` qaytaradi

> **Nega qo'lda 20 savol:** ingestion yozishdan oldin sxema real savollarni
> ko'tara olishini bilish kerak. Yetarli emasligi shu yerda ma'lum bo'lsa —
> arzon tuzatiladi. Keyinchalik bu 20 savol pipeline uchun bepul regression test.

---

## Faza 1 — Ishlaydigan sikl (4–5 kun)

**Maqsad:** sinf foydalana boshlaydi. **AI yo'q.**

| Ish | Chiqish |
|---|---|
| `GET /questions` filtrlar bilan + frontend savol banki | O'qituvchi savol topadi |
| Vazifa yaratish (qo'lda tanlash) + publish | Vazifa berish |
| **Attempt boshqaruvi: `POST /attempt`, oyna tekshiruvi, heartbeat** | Server-taymer |
| **Avtomatik yopish (backend scheduler + DB lock)** | Mock asosi |
| O'quvchi paneli: javob yozish + avtosaqlash + oflayn | Mobil ishlaydi |
| **Qo'lda baholash ekrani** (MP toggle) | ★ Ground truth |
| Natija ekrani (MP darajasida feedback) | O'quvchi sababni ko'radi |

### Acceptance
- [ ] To'liq sikl 360px telefonda ishlaydi
- [ ] Internet uzilganda javob yo'qolmaydi, tiklanganda sinxronlanadi
- [ ] O'qituvchi bitta javobni **≤ 40 soniyada** baholaydi
- [ ] Har bir baholash `grading_points` ga yoziladi
- [ ] **Taymerni mijozda o'chirib javob yozib bo'lmaydi** → 409 `time_expired`
- [ ] Sahifa yangilansa attempt vaqti qayta boshlanmaydi
- [ ] Ikki qurilmada ochilsa eskisi bekor bo'ladi
- [ ] Mark scheme baho chiqmaguncha API javobida yo'q (serializer testi)

> ★ **Yashirin maqsad:** baholash ekrani `grading_points` ni to'ldiradi. Bu
> Faza 4 dagi AI kalibrlashning **yagona** manbai. Bu ekran soddalashtirilmaydi.

**Shu yerda sinf boshlanadi.** Keyingi fazalar sinf ishlab turgan holda quriladi.

---

## Faza 2 — Ingestion (4–5 kun)

| Ish | Chiqish |
|---|---|
| Sillabus importi + qo'lda tekshirish | 20 topic, ~80 subtopic, ~400 LO |
| `backend/src/jobs`: DB-backed ingestion bosqichlari | 11 bosqich |
| PREPARE: pdftoppm, pdftotext, sharp | Rasm + matn qatlami |
| EXTRACT_QP / EXTRACT_MS / MATCH / CLASSIFY | Savol yozuvlari |
| **20 validatsiya qoidasi** (`backend/src/lib/validation`) + testlar | Filtr |
| Cross-check o'tishi | Ikkinchi qatlam |
| **Review queue UI** (klaviatura, prefetch, bulk) | ≤ 20 s/savol |
| Presigned upload, retry, DLQ | Barqarorlik |

### Acceptance
- [ ] 20 qoidaning har biri unit test bilan qoplangan
- [ ] Bitta paper to'liq ishlanadi va `V02` (jami ball) o'tadi
- [ ] Flagged nisbati **10–20%** (< 5% → validatsiya yumshoq; > 30% → ekstraksiya yomon)
- [ ] Review queue'da 20 savol **≤ 7 daqiqada**
- [ ] Bir xil PDF ikki marta → dublikat yo'q (sha256 + jobs.idempotencyKey)
- [ ] Job runner o'ldirilib qayta ishga tushirilsa job qoldi joyidan davom etadi
- [ ] **Faza 0 dagi 20 savol pipeline natijasi bilan solishtiriladi** — nomuvofiqlik
      topilsa promptlar tuzatiladi
- [ ] **Real barg savollar soni o'lchanadi va butun hajm qayta hisoblanadi**

> Oxirgi ikki punkt muhim. Ikkinchisi: spec'dagi "900 savol" — taxmin.
> Birinchi paper ishlangach aniq son chiqadi (ehtimol 2,000+ P1+P2 uchun).

---

## Faza 3 — Eksport va generator (3 kun)

| Ish | Chiqish |
|---|---|
| Backend job runnerda SSR + Puppeteer | PDF chiqadi |
| QP / MS / Combined shablonlari | Cambridge formatiga yaqin |
| Paper generator (`backend/src/lib`, sof funksiya) | Avto vazifa |
| Feedback report PDF | O'quvchiga hisobot |
| `POST /exports` → job → presigned URL | To'liq oqim |

### Acceptance
- [ ] Savol sahifa o'rtasida bo'linmaydi; ota kontekst bolasidan ajralmaydi
- [ ] Jami ball original paperga mos
- [ ] Generator 7 ta testdan o'tadi
- [ ] 25 balllik paper **≤ 15 soniyada**
- [ ] Presigned URL 24 soatdan keyin ishlamaydi

---

## Faza 4 — AI baholash (4 kun qurish, 4 hafta kalibrlash)

⚠ **Kalendar vaqtga bog'liq, ish hajmiga emas.**

| Bosqich | Shart | Davomiyligi |
|---|---|---|
| Qurish | — | 4 kun |
| Soya rejimi | 150+ ground truth | 1–2 hafta |
| Yordamchi | agreement ≥ 80% | 1–2 hafta |
| Autopilot (tor) | agreement ≥ 88%, FP < 3% | — |

| Ish | Chiqish |
|---|---|
| `packages/shared/marking.ts` + 12 unit test | Deterministik ball |
| `grade-answer` processor + prompt v1 | AI dalil topadi |
| Chiqish validatsiyasi (`fabricated_evidence`) | Xavfsizlik |
| Soya rejimi (natija yashirin) | Toza o'lchov |
| `grading_evaluations` + AI sifat paneli | Sifat ko'rinadi |
| Few-shot injeksiya | Sifat oshirish |
| Byudjet nazorati (limit oshsa navbat to'xtaydi) | Xarajat |

### Acceptance
- [ ] `marking.ts` ning 12 testi o'tadi
- [ ] Soya rejimida ≥ 150 javob to'plangan
- [ ] Point agreement ≥ 85%; false positive < 3%
- [ ] `Evaluate` va `levels_of_response` hech qanday holatda avtomatik emas
- [ ] Autopilot yoqilganda ham 10% tasodifiy namuna o'qituvchiga boradi
- [ ] `ANTHROPIC_API_KEY` backend muhitida, frontend build'da yo'q

> **Agreement 85% ga yetmasa:** autopilot yoqilmaydi. AI yordamchi bo'lib qoladi —
> bu ham baholashni ~40% tezlashtiradi. Autopilot majburiy emas.

---

## Faza 5 — Kontent (3–4 kun)

| Ish | Chiqish |
|---|---|
| `generate-content` processor: notes/glossary/flashcard/quiz | ~80 × 4 |
| 10 ta kontent validatsiya qoidasi | Filtr |
| Cross-check (sillabusdan chiqmaslik) | Nazorat |
| SM-2 (`backend/src/lib/srs.ts`) | Kartochka rejimi |
| Xatodan kartochka: `error_patterns` → `flashcards` | Shaxsiylashtirish |
| 3 ta o'yin | Term match, Sequence, Spot the gap |

### Acceptance
- [ ] C01–C10 testlangan
- [ ] Har bir LO kamida bitta kontentda qamrab olingan
- [ ] `definition_en` sillabus/MS matnida topiladi (C04)
- [ ] SM-2 intervallari to'g'ri
- [ ] Sillabusdan tashqari atama yo'q (C10)

---

## Faza 6 — Kengaytmalar

- Qo'lyozma OCR
- To'liq mock: grade boundaries, integrity signallari, natija hisoboti
- **Kod baholash sandbox'i** — alohida konteyner, tarmoqsiz, seccomp,
  5 s CPU / 128 MB. Mustaqil backend tanlashning asosiy sabablaridan biri.
- O'z savol banki (past paper'dan ilhomlangan original savollar)
- PWA push bildirishnomalar
- Ko'p maktab / ko'p o'qituvchi

---

## Vaqt jadvali

```
Hafta 1     Faza 0 (skelet + authorization)
Hafta 1–2   Faza 1                              ← sinf boshlaydi
Hafta 2–3   Faza 2 (ingestion)
Hafta 3     Faza 3 (eksport, generator)
Hafta 4     Faza 4 qurish → soya rejimi
Hafta 5     Faza 5 (kontent)        + kalibrlash
Hafta 6     Sayqallash              + kalibrlash
Hafta 7     Autopilot qarori (ma'lumotga asoslangan)
```

**Platforma 2-haftada foydalanishga tayyor. AI baholash 6–7-haftada ishonchli.**

---

## Xavflar

| Xavf | Belgi | Qarshi chora |
|---|---|---|
| **Authorization teshigi** | Middleware'dan oldin mount qilingan yopiq endpoint | Route coverage testi CI'da |
| **Auth xatosi** | Token oqishi, sessiya buzilishi | Refresh rotatsiyasi + `tv` + httpOnly cookie |
| Ekstraksiya sifati past | Flagged > 30% | Promptni tuzat, batch kichraytir |
| Mark scheme noto'g'ri o'qilgan | Bir savolda ommaviy shikoyat | `possible_ms_error` → owner navbati |
| AI agreement 85% ga yetmaydi | Faza 4 tiqiladi | Yordamchi rejimda qol |
| Job runner yiqiladi | Job navbatda qoladi | `jobs` jadvalidan qayta davom etadi |
| Backend qayta ishga tushadi | `running` job osilib qoladi | Stale lock timeout va retry |
| Byudjet oshadi | `ai_calls` | Navbat to'xtaydi, qo'lda baholash davom etadi |
| **Spec yozildi, ishga tushmadi** | Faza 1 kechikadi | Faza 0+1 birinchi ikki haftada |

Oxirgi xavf eng jiddiy. Faza 2–5 kechiksa — muammo emas, ular sinf ishlab
turgan holda quriladi. Faza 1 kechiksa — hech narsa boshlanmaydi.
