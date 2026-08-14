# 11 — Operatsiya, xarajat va huquqiy masalalar

## 1. Mualliflik huquqi — bu bo'limni birinchi o'qi

Cambridge past paper va mark scheme'lari **Cambridge Assessment International
Education mualliflik huquqi bilan himoyalangan**. Cambridge ro'yxatdan o'tgan
maktablarga School Support Hub orqali foydalanish beradi, lekin bu qayta nashr
qilish huquqini bermaydi.

### Xavf darajalari

| Model | Xavf | Izoh |
|---|---|---|
| **Yopiq: faqat sening maktabing, login majburiy, ochiq ro'yxat yo'q** | Past | Odatiy o'quv amaliyoti doirasida |
| Bir nechta maktab, taklif bilan | O'rta | Cambridge'dan yozma ruxsat so'rash tavsiya etiladi |
| Ochiq ro'yxatdan o'tish, bepul | Yuqori | Qayta nashr sifatida qaralishi mumkin |
| Pullik / obuna | Juda yuqori | Tijoriy foydalanish. Takedown ehtimoli yuqori |

**Qaror: v1 yopiq bo'ladi.** Ochiq ro'yxatdan o'tish yo'q. Faqat taklif kodi.
Bu spec'da (`02-data-model.md` — `invites` jadvali) shunday belgilangan.

### Texnik chora-tadbirlar

- [ ] Ochiq ro'yxatdan o'tish sahifasi **yo'q**
- [ ] Barcha Storage bucket'lar private, signed URL (1–24 soat)
- [ ] Original PDF'larga faqat `owner` kirish huquqi
- [ ] Har bir eksportda watermark: maktab nomi + sana + "ichki foydalanish uchun"
- [ ] Ommaviy eksport cheklovi: bir foydalanuvchi kuniga max 20 PDF
- [ ] `robots.txt` — to'liq bloklash. Qidiruv tizimlariga indekslanmaydi
- [ ] Ommaviy demo yoki screenshot'da real savol matni ko'rsatilmaydi

### Uzoq muddatli yechim: o'z savol banki

Agar keyinchalik kengaytirmoqchi bo'lsang, ikki yo'l:

**A. Cambridge'dan yozma ruxsat** — maktab orqali, rasmiy so'rov.

**B. O'z savollaringni yozish** — ★ tavsiya etiladi

Past paper'ni **shablon** sifatida ishlatib, yangi savol yozish:
- Bir xil topic, command word, marks, AO
- Bir xil savol strukturasi
- **Boshqa kontekst, boshqa matn, boshqa raqamlar**

Bu huquqiy jihatdan toza va uzoq muddatda qimmatliroq aktiv — chunki past
paper'lar cheklangan (60 ta), o'z savollaring cheksiz.

AI bilan tezlashtiriladi:
```
Original savol + mark scheme → yangi savol + yangi mark scheme
   → deterministik tekshiruv (marks mos, MP soni mos, matn ≥ 60% farqli)
   → owner tasdiqlaydi
```

**Bu Faza 6.** Lekin arxitektura buni allaqachon qo'llab-quvvatlaydi:
`source_papers.kind` ga `'ORIGINAL'` qo'shiladi, qolgan hamma narsa bir xil ishlaydi.

Amaliy tavsiya: **hozirdan har bir tasdiqlangan past paper savoliga
1 ta o'z variantingni yozib bor.** Bir yildan keyin mustaqil bankingiz bo'ladi.

---

## 2. Ma'lumotlar maxfiyligi

O'quvchilar — voyaga yetmaganlar. Bu majburiyat yuklaydi.

| Qoida | Amalga oshirish |
|---|---|
| Minimal ma'lumot yig'ish | Ism, sinf, email (yoki username). Tug'ilgan sana, telefon, manzil **yo'q** |
| O'quvchi javoblari — shaxsiy | Authorization qatlami: faqat o'zi + o'z o'qituvchisi |
| AI ga yuborilganda | Ism yuborilmaydi. Faqat javob matni. Prompt'da `{answer_text}` — metadata yo'q |
| Ma'lumot saqlash muddati | O'quv yili + 1 yil. Keyin arxiv yoki o'chirish |
| Parollar | argon2id, xom parol hech qayerda log qilinmaydi |
| Eksport huquqi | O'quvchi o'z ma'lumotini JSON/PDF da yuklab olishi mumkin |
| O'chirish huquqi | O'quvchi ketganda ma'lumot anonimlashtiriladi (ball statistikasi qoladi, ism ketadi) |

**Anonimlashtirish:**
```sql
update profiles set full_name = 'O''chirilgan foydalanuvchi', email = null,
       avatar_url = null, is_active = false
where id = $1;
-- submissions, answers, gradings qoladi (analitika buzilmasin)
-- lekin answers.text ham o'chiriladi (shaxsiy yozuv)
```

Maktab ma'muriyatiga ma'lumot berish siyosati yoziladi va ota-onalarga
ma'lum qilinadi. Bu texnik emas, tashkiliy ish — lekin unutilmasin.

---

## 3. Deploy

```text
frontend/   Vercel static build (`frontend/dist`)
backend/    Ayni Vercel project ichidagi Node.js Function (`api/index.ts`)
postgres    Supabase PostgreSQL yoki local PostgreSQL 16
storage     Faza 2 gacha DB metadata; keyin private S3-compatible storage
domen       Bitta domen; `/api/*` Vercel rewrite orqali Express'ga o'tadi
```

MVP bitta Vercel project sifatida deploy qilinadi. `frontend/` va `backend/`
kodda alohida qoladi, lekin deploy birga bajariladi. Alohida worker hamda Redis yo'q.
Faza 2 job runneri backend ichida ishlaydi. Puppeteer/ingestion resursi oshsa,
`npm run jobs -w backend` ayni backend kodidan alohida process sifatida deploy qilinadi.

### Local

`npm run dev` frontend va backendni birga ishga tushiradi. Database uchun hosted
`DATABASE_URL` ishlatish mumkin; Docker majburiy emas.

### Sirlar

| O'zgaruvchi | frontend | backend |
|---|---|---|
| `VITE_API_URL` | ixtiyoriy; productionda `/api/v1` | — |
| `DATABASE_URL` | — | ✓ |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | — | ✓ |
| `S3_*` | — | Faza 2+ |
| `ANTHROPIC_API_KEY` | **hech qachon** | Faza 4 |

`VITE_` prefiksli qiymat brauzerga ochiq hisoblanadi. Hech qanday parol yoki API
kaliti shu prefiks bilan yozilmaydi.

### Muhitlar

| Muhit | Maqsad |
|---|---|
| `local` | `npm run dev`, local yoki hosted test DB, seed ma'lumot |
| `staging` | Alohida PostgreSQL, anonimlashtirilgan nusxa |
| `production` | Real ma'lumot |

**Migration'lar `staging` da sinovdan o'tmasdan `production` ga chiqmaydi.**

### CI

```yaml
on: [push, pull_request]
jobs:
  - typecheck (`npm run typecheck`)
  - lint
  - unit  (vitest)                # marking.ts, validation, generator, srs
  - api   (supertest + testcontainers postgres)
  - ★ authz e2e                   # 14 ta test — BLOKLAYDI
  - ★ route-coverage              # auth middleware tashqarisidagi route — BLOKLAYDI
  - migration apply (staging)
  - e2e (playwright)              # vazifa → javob → baho oqimi
  - build (`npm run build`)
```

**Authorization testlari yoki route coverage yiqilsa deploy bloklanadi.**
Boshqa test yiqilsa — ogohlantirish.

Sabab: RLS'siz arxitekturada bitta unutilgan middleware = o'quvchilar bir-birining
javobini o'qiy oladi. Bu boshqa har qanday xatodan jiddiyroq.

---

## 4. Backup

| Nima | Chastota | Saqlash |
|---|---|---|
| Postgres (provayder avtomatik / PITR) | Kunlik | 7–14 kun |
| Postgres (`pg_dump` cron) | Haftalik | 3 oy, R2 va tashqi disk |
| Private storage (PDF, rasmlar) | Haftalik sync/export | 3 oy |
| Prompt fayllari | Git | Cheksiz |

Job navbati PostgreSQL backup tarkibiga kiradi. Backend startida eskirgan
`running` locklar `queued` holatiga qaytariladi.

**Tiklashni sinab ko'r.** Backup borligini bilish yetarli emas — u ishlashini
bilish kerak. Faza 3 dan keyin bir marta to'liq tiklash mashqi.

**Eng qimmatli ma'lumot:** `grading_points` va tasdiqlangan savol banki.
Bularni yo'qotsang, oylar yo'qoladi. Alohida haftalik eksport:
```bash
pg_dump -t questions -t mark_schemes -t mark_scheme_points \
        -t grading_points --data-only > weekly_$(date +%F).sql
```

---

## 5. Xarajat

### Bir martalik

| Element | Narx |
|---|---|
| Ingestion (900 savol) | ~$20 |
| Kontent generatsiyasi | ~$25 |
| Kalibrlash tajribalari | ~$15 |
| **Jami** | **~$60** |

### Oylik

| Element | Narx |
|---|---|
| PostgreSQL | Boshlanishida bepul tarif mumkin |
| Backend Node hosting | Boshlanishida bepul yoki arzon tarif |
| Private storage (Faza 2+) | Hajmga qarab |
| Frontend hosting | $0 |
| Claude API (~1000 baholash/oy) | ~$12 |
| Domen | ~$1 |
| **MVP infra** | **bepul tariflardan boshlash mumkin** |

Foydalanuvchi va job hajmi oshganda pullik backend/PostgreSQL tarifiga o'tiladi.
Narxlar provayderga bog'liq va deploy vaqtida qayta tekshiriladi.

### Nazorat

```
app_settings['ai.monthly_budget_usd'] = 50
```

Oshsa:
1. 80% → owner'ga ogohlantirish
2. 100% → yangi AI job'lar `queued` da qoladi, o'qituvchi qo'lda baholaydi
3. Tizim ishlashda davom etadi — faqat AI to'xtaydi

**Bu muhim:** AI to'xtasa platforma ishlashi kerak. AI — tezlashtirish,
tayanch emas.

---

## 6. Monitoring

| Signal | Chegara | Harakat |
|---|---|---|
| `jobs.status = failed` | > 5/soat | Ogohlantirish |
| Backend restart | > 3/soat | Tekshirish |
| **401/403 to'satdan o'sish** | 3× normal | ★ Authorization xatosi yoki hujum |
| Grading navbati | > 100 kutmoqda | Ogohlantirish |
| AI latency p95 | > 20 s | Tekshirish |
| Point agreement | 5% pasayish | Autopilot avtomatik o'chadi |
| Xato darajasi (frontend) | > 1% sessiya | Tekshirish |
| Byudjet | 80% | Ogohlantirish |

**Agreement pasayishi eng nozik signal.** Model yangilansa yoki savollar
turi o'zgarsa sifat pasayishi mumkin. 10% namuna monitoringi shuning uchun
hech qachon o'chirilmaydi.

---

## 7. Ochiq savollar (owner hal qiladi)

0. **Hosting** — boshqariladigan servislar (~$60/oy, kam ish) yoki bitta VPS
   (~$18/oy, qo'lda ish)? Bu Faza 0 dan oldin hal bo'lishi kerak.
1. **Domen** — `campath.uz` sotib olinadimi yoki maktab subdomeni?
2. **Boshqa o'qituvchilar** — v1 da bir o'qituvchi (sen) yoki maktabdagi
   barcha CS o'qituvchilari? Bu `class_teachers` mantiqiga ta'sir qiladi.
3. **Til** — o'quvchi interfeysi faqat o'zbekchami yoki inglizcha ham?
   (Prezident maktabi kontekstida inglizcha ham mantiqiy)
4. **Baho jurnali** — maktabning mavjud tizimiga integratsiya kerakmi?
5. **Ota-onalar** — natijalarni ko'rish talabi bo'ladimi? (hozir non-goal)
6. **Grade boundaries** — qaysi manbadan olinadi?

Bularni Faza 1 dan oldin hal qil — keyinroq o'zgartirish qimmat.

---

## 8. Muvaffaqiyat mezonlari

3 oydan keyin quyidagilar to'g'ri bo'lsa — loyiha ishladi:

| Mezon | Maqsad |
|---|---|
| Baholashga sarflanadigan vaqt | 5 soat/hafta → **≤ 2 soat/hafta** |
| Savol topish vaqti | 2 soat/hafta → **≤ 15 daqiqa** |
| O'quvchi topshirish darajasi | **≥ 85%** vazifalar muddatida |
| Sinfning zaif MP larini aniqlash | **Har hafta 3 ta aniq mavzu** |
| Savol banki | **≥ 800** tasdiqlangan savol |
| AI agreement | **≥ 85%** (autopilot bo'lmasa ham) |

Agar birinchi ikkitasi bajarilsa va qolganlar bajarilmasa — loyiha baribir
o'zini oqlaydi. Haftasiga 5 soat — bu yiliga 200 soat.
