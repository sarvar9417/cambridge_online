# 06 — O'quvchi paneli

> Bu hujjatdagi ekranlar `apps/web` ichida React bilan yoziladi. Attempt va vaqt
> qoidalari `apps/api` da tekshiriladi; frontend taymer faqat ko'rsatish uchun.
> (v4: eski `frontend/`+`backend/` nomlari talab sifatida qoladi.)

## 1. Loyihaviy cheklov: mobil birinchi

O'quvchilar Navoiyda, asosan telefonda, internet beqaror.
**O'quvchi paneli 360px kenglikda to'liq ishlashi shart.** Desktop — bonus.

Bu quyidagilarni belgilaydi:
- Bitta ustunli maket, gorizontal skroll yo'q
- Tugmalar ≥ 44px balandlik
- Javob avtosaqlash `localStorage` + server (ikkalasi)
- Internet uzilsa ish to'xtamaydi
- Rasm yuklashda avtomatik siqish (2 MB → ~300 KB) yuborishdan oldin

---

## 2. Navigatsiya (pastki tab bar)

```
[Uy]  [Vazifalar]  [O'rganish]  [Natijalar]  [Profil]
```

---

## 3. Uy

```
┌───────────────────────────────┐
│ Salom, Aziz                   │
│                               │
│ ⏰ Bugun tugaydi              │
│ ┌───────────────────────────┐ │
│ │ Databases HW3             │ │
│ │ 8 savol · 24 ball         │ │
│ │ 18:00 gacha               │ │
│ │        [Boshlash →]       │ │
│ └───────────────────────────┘ │
│                               │
│ 📇 Takrorlash                 │
│ 14 karta bugun kutmoqda       │
│           [Boshlash →]        │
│                               │
│ 📊 Yangi natija               │
│ Processor HW2 · 17/20 (85%)   │
│           [Ko'rish →]         │
│                               │
│ Kuchsiz mavzuing              │
│ Topic 4 Processor · 41%       │
│      [Mashq qilish →]         │
└───────────────────────────────┘
```

"Kuchsiz mavzuing" — `mastery` jadvalidan eng past 1 ta subtopic.
Bosilganda o'sha subtopic bo'yicha 5 savollik mashq to'plami generatsiya qilinadi.

---

## 4. Vazifa yechish

### 4.1 Maket

```
┌───────────────────────────────┐
│ ← Databases HW3      3 / 8  ⋮ │
│ ●●●○○○○○                      │  ← progress, javob berilganlar to'la
├───────────────────────────────┤
│ 9618/12/M/J/23 Q3(b)          │
│ Explain · [3 ball]            │
│                               │
│ A company stores customer     │  ← ota kontekst, yig'iladigan
│ records in a database...      │
│ [Kontekstni ko'rsatish ▾]     │
│                               │
│ Explain why a primary key     │  ← savol (serif)
│ is required.                  │
│                               │
│ ┌───────────────────────────┐ │
│ │                           │ │
│ │  Javobingni yoz...        │ │
│ │                           │ │
│ └───────────────────────────┘ │
│ 42 so'z · saqlandi 12:34      │
│                               │
│ [📷 Rasm] [⌨ Pseudocode]      │
├───────────────────────────────┤
│ [← Oldingi]      [Keyingi →]  │
│         [Topshirish]          │
└───────────────────────────────┘
```

### 4.2 Javob turlari

| `answer_kind` | Muhit |
|---|---|
| `text` | Oddiy textarea + so'z sanagich. Rich text **yo'q** — imtihonda ham yo'q. |
| `pseudocode` | CodeMirror, 9618 pseudocode highlight, avtomatik indent, kalit so'z autocomplete |
| `code` | CodeMirror + til tanlash (Python / VB.NET / Java) |
| `table` | Oddiy jadval tahrirlagich (mark scheme kataklariga mos) |
| `diagram` / `image` | Rasm yuklash majburiy (chizish quroli yo'q — telefonda foydasiz) |

**Rich text yo'q qarori:** Cambridge javob varaqasida bold yoki markerlar yo'q.
Formatlash imkoni bersak, o'quvchi mazmun o'rniga ko'rinishga vaqt sarflaydi.

### 4.3 Rasm yuklash oqimi

```
📷 bosiladi
   ↓ kamera yoki galereya
Sifat tekshiruvi (mijozda): o'lcham, xiralik, burchak
   ↓ past bo'lsa
   "Rasm xira. Yorug'roq joyda, to'g'ridan-to'g'ri ustidan oling."  [Qayta] [Baribir ishlat]
   ↓
Siqish (max kenglik 1600px, JPEG q=0.8)
   ↓ Storage ga yuklash
OCR (fon jarayoni)
   ↓
"Shunday yozganmisan?" → OCR matni ko'rsatiladi, tahrirlanadi
   ↓
[To'g'ri] → baholashga o'tadi
```

OCR matnini o'quvchiga ko'rsatish **majburiy**. OCR xatosi tufayli ball yo'qotish
adolatsiz va ishonchni buzadi.

### 4.4 Avtosaqlash

```ts
// Har o'zgarishda:
localStorage.setItem(`answer:${submissionId}:${questionId}`, JSON.stringify(draft));

// Har 5 s (debounced) yoki savol almashganda:
await api.put(`/submissions/${submissionId}/answers/${questionId}`, draft);
// 409 time_expired kelsa → "Vaqt tugadi" ekrani, qayta urinilmaydi

// Sahifa ochilganda:
// server versiyasi va localStorage versiyasini solishtirish
// localStorage yangiroq bo'lsa → "Saqlanmagan o'zgarish topildi. Tiklaymi?"
```

Ulanish yo'q bo'lsa: yuqorida jim indikator `⚠ Oflayn — javoblaring saqlanmoqda`.
Ulanish tiklanganda avtomatik sinxronizatsiya + `✓ Sinxronlandi`.

### 4.5 Topshirish

```
┌───────────────────────────────┐
│ Topshirishga tayyormisan?     │
│                               │
│ Javob berilgan   6 / 8        │
│ Bo'sh: Q5, Q7                 │
│                               │
│ Topshirgandan keyin javobni   │
│ o'zgartira olmaysan.          │
│                               │
│  [Ortga]      [Topshirish]    │
└───────────────────────────────┘
```

Bo'sh savollar aniq nomlanadi.

### 4.6 Mock rejim

Qo'shimcha: taymer (yuqorida, oxirgi 5 daqiqada qizil), avtomatik topshirish,
savollar orasida erkin harakat, "belgilab qo'yish" bayrog'i, kontent va
kalkulyator bloklangan.

---

## 5. Natijalar

### 5.1 Vazifa natijasi

```
┌───────────────────────────────┐
│ Databases HW3                 │
│ 17 / 24  ·  71%  ·  Grade B   │
│ Sinf o'rtachasi 68%           │
├───────────────────────────────┤
│ Q1  ✓✓✓        3/3            │
│ Q2  ✓✓✗        2/3            │
│ Q3  ✓✗✗        1/3   [Ko'r →] │
│ Q4  ✓✓✓✓       4/4            │
└───────────────────────────────┘
```

Har savol yonida MP holatlari kichik belgilar bilan — bir qarashda ko'rinadi.

### 5.2 Savol tafsiloti — ★ eng muhim ekran

```
┌───────────────────────────────┐
│ Q3(b) Explain · 1 / 3         │
├───────────────────────────────┤
│ SAVOL                         │
│ Explain why a primary key is  │
│ required.                     │
│                               │
│ SENING JAVOBING               │
│ "A primary key means each     │
│  record can be told apart     │
│  from the others. It also     │
│  keeps entity integrity."     │
│  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔           │  ← ball olgan qism ajratilgan
│                               │
│ BALL TAHLILI                  │
│ ✓ Yagona identifikatsiya      │
│   Sening so'zlaring: "each    │
│   record can be told apart"   │
│                               │
│ ✗ Entity integrity            │
│   Atamani yozgansan, lekin u  │
│   nimani oldini olishini      │
│   aytmagansan. "Explain"      │
│   savolida atama yetarli emas │
│   — natijasini ham yozish     │
│   kerak.                      │
│                               │
│ ✗ Foreign key bog'lanishi     │
│   Bu jihatni umuman           │
│   yoritmagansan.              │
│                               │
│ [Mark scheme'ni ko'rish]      │
│ [Bu mavzuni o'rganish →]      │
│ [Baho bilan rozi emasman]     │
└───────────────────────────────┘
```

**Bu ekran platformaning butun qiymati.** Oddiy "1/3" hech narsa o'rgatmaydi.
"Explain savolida atama yetarli emas" — bu keyingi safar 2 ball qo'shadi.

### 5.3 Progress

```
Topic bo'yicha o'zlashtirish

Topic 1  ████████████████░░  82%
Topic 2  ██████████████░░░░  71%
Topic 4  ████████░░░░░░░░░░  41%  ← [Mashq →]
Topic 8  ███████████████░░░  77%

Command word bo'yicha
State    ████████████████░░  91%
Explain  ███████████░░░░░░░  58%  ← eng katta zaiflik
```

**Command word bo'limi o'quvchiga ham ko'rsatiladi.** Bu unga aniq va bajariladigan
maqsad beradi: "Explain savollarida sabab yozishni o'rganishim kerak."

### 5.4 Apellyatsiya

`[Baho bilan rozi emasman]` → sabab yozish → o'qituvchi navbatiga.
Cheklov: bir vazifada max 3 apellyatsiya (suiiste'molning oldini olish).

---

## 6. O'rganish bo'limi

```
Topic 8 · Databases
├─ 8.1 Database concepts     ●●●○○  60%
│   [Notes] [Glossary] [Kartochkalar 12] [Quiz] [Savollar 8]
├─ 8.2 Normalisation         ●●○○○  40%
└─ 8.3 SQL                   ●●●●○  80%
```

### 6.1 Kartochka rejimi (SM-2)

```
┌───────────────────────────────┐
│  Bugun: 14 karta   3/14       │
│                               │
│         Primary key           │
│                               │
│    [Javobni ko'rsatish]       │
└───────────────────────────────┘

ochilgandan keyin:
│  A field that uniquely        │
│  identifies each record in    │
│  a table.                     │
│                               │
│  Qanchalik oson edi?          │
│  [Qiyin] [O'rta] [Oson]       │  → SM-2 grade 1 / 3 / 5
```

`packages/shared/srs.ts` — EnglishPath'dan olinadi, o'zgartirilmaydi.

**Xato qilingan savoldan kartochka:** o'quvchi Q3(b) da MP2 ni yo'qotsa,
o'sha MP dan avtomatik kartochka yaratiladi va 3 kundan keyin navbatga tushadi.
Bu `error_patterns` → `flashcards` bog'lanishi.

### 6.2 Mashq rejimi

Vazifadan tashqari. Filtrlar: topic, command word, qiyinlik.
Baholash bir xil, lekin `assignment_id = null` va ball jurnalga kirmaydi.
`mastery` ga esa kiradi (past vazn bilan, 0.5).

### 6.3 O'yinlar

Faza 5. Uchtasi yetarli, ko'p emas:

1. **Term match** — atama ↔ ta'rif juftlash, vaqtga qarshi
2. **Sequence** — jarayon qadamlarini tartibga solish
   (fetch-decode-execute sikli, normalizatsiya bosqichlari, TCP handshake)
3. **Spot the gap** — javob berilgan, mark point'lardan qaysi biri yetishmayotganini topish
   ← bu eng foydalisi, chunki bevosita imtihon ko'nikmasini o'rgatadi

---

## 7. Bildirishnomalar

| Hodisa | Kanal |
|---|---|
| Yangi vazifa | In-app + PWA push |
| Muddat 24 s qoldi (topshirilmagan) | Push |
| Muddat 2 s qoldi | Push |
| Baho chiqarildi | In-app + push |
| Kartochkalar kutmoqda (kuniga 1) | Push, ixtiyoriy |

Sozlamalarda har biri o'chiriladi. Kuniga max 3 push.

---

## 8. Dizayn

`05-admin-ui.md` §8 dagi token'lar bir xil, quyidagi farqlar bilan:

- Zichlik pastroq (barmoq uchun): jadval qatori 48px, tugma 44px
- Savol matni kattaroq: 17px serif (o'qituvchida 15px)
- Progress ko'rsatkichlari bor (o'qituvchida yo'q) — motivatsiya uchun
- Ball rangi: yashil/qizil aynan mark point holatida, boshqa joyda yo'q

**Geymifikatsiya cheklovi:** streak va progress bar bor, lekin ball, daraja,
nishon, reyting jadvali **yo'q**. Sabab: reyting jadvali kuchsiz o'quvchini
platformadan uzoqlashtiradi, kuchlisiga esa hech narsa qo'shmaydi.
Yagona taqqoslash — sinf o'rtachasi, va u ham faqat vazifa natijasida.
