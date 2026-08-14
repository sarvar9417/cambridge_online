# 08 — PDF eksport va paper generator

> Eksport tugmasi va progress `apps/web` da; job yaratish, Chrome headless va private
> storage `apps/worker` da. Frontend PDF fayl tizimiga bevosita kira olmaydi.
> (v4: eski `frontend/`+`backend/` nomlari talab sifatida qoladi.)

## 1. Chiqarish turlari

| Tur | Kim uchun | Mazmun |
|---|---|---|
| **Question paper** | O'quvchi | Savollar + javob joyi, mark scheme yo'q |
| **Mark scheme** | O'qituvchi | Savol + MP lar + guidance |
| **Combined** | O'qituvchi | QP + MS bir faylda (dars uchun) |
| **Topic pack** | O'quvchi | Bitta topic bo'yicha barcha savollar, yil bo'yicha |
| **Answer sheet** | O'quvchi | Faqat javob joyi (savol proyektorda) |
| **Feedback report** | O'quvchi/ota-ona | Bitta o'quvchining vazifa natijasi + MP tahlili |
| **Class report** | O'qituvchi | Sinf natijalari + heatmap |

---

## 2. Texnologiya

**v1: HTML → Puppeteer → PDF**

Sabab: 1–2 kunda ishlaydi, brauzerda ko'rish/tahrirlash mumkin, CSS bilan boshqariladi.

```
Backend job runner: HTML shablon + print CSS
   → Puppeteer → PDF → private storage → vaqtinchalik URL (24 soat)
```

Backend Docker bilan deploy qilinsa Chromium image'da oldindan o'rnatiladi.
Serverless function emas, uzoq ishlaydigan Node.js hosting ishlatiladi.

**v2: Typst** (LaTeX o'rniga tavsiya)

Typst LuaLaTeX'ga qaraganda ~50× tez kompilyatsiya qiladi, sintaksisi soddaroq,
Docker image kichik. Cambridge formatiga yetarli darajada nazorat beradi.
LuaLaTeX faqat murakkab diagrammalar (TikZ) kerak bo'lsa.

**v1 dan boshlanadi.** Typst'ga o'tish Faza 4 dan keyin, agar chindan kerak bo'lsa.

---

## 3. Cambridge formatiga mos maket

Original QP formatiga yaqinlashtirish muhim — o'quvchi imtihonda tanish formatni ko'radi.

### 3.1 Sahifa

```
A4, chekkalar: yuqori 20mm, past 20mm, chap 25mm, o'ng 15mm
Shrift: 11pt serif (savol), 10pt sans (metadata)
```

### 3.2 Sarlavha (birinchi sahifa)

```
┌──────────────────────────────────────────────────────┐
│ NAVOIY PREZIDENT MAKTABI                             │
│ Computer Science 9618 · Paper 1                       │
│                                                       │
│ Ism: ______________________  Sinf: ______             │
│ Sana: ____________           Vaqt: 45 daqiqa          │
│                                                       │
│ KO'RSATMA                                             │
│ • Barcha savollarga javob bering                      │
│ • Javobingizni berilgan joyga yozing                  │
│ • Jami ball: 25                                       │
└──────────────────────────────────────────────────────┘
```

### 3.3 Savol bloki

```
3   A company stores customer records in a relational database.

    (a)  Define the term primary key.

         ...........................................................

         .......................................................[2]

    (b)  Explain why a primary key is required.

         ...........................................................

         ...........................................................

         .......................................................[3]
```

**Detallar (Cambridge'ga mos):**
- Savol raqami chap chekkada, matn 8mm ichkarida
- Sub-part `(a)`, `(b)` — bir daraja ichkarida
- Javob chiziqlari: nuqtali, `answer_lines` bo'yicha (yo'q bo'lsa `marks × 2`)
- Ball `[3]` — oxirgi chiziqning o'ng chetida, chiziq ichida
- `[Turn over]` sahifa pastida (oxirgi sahifadan tashqari)
- Oxirgi sahifada `[Total: 25]`

### 3.4 Sahifa uzilishi

**Savol sahifa o'rtasida bo'linmasin.** CSS:
```css
.question-block { break-inside: avoid; }
.question-parent { break-after: avoid; }  /* ota kontekst bolasidan ajralmasin */
```

Savol sahifaga sig'masa — keyingi sahifaga to'liq o'tadi.
Juda uzun savol (diagramma + ko'p sub-part) bo'linishga majbur bo'lsa,
sub-part chegarasida bo'linadi.

### 3.5 Diagrammalar

Storage'dan olinadi, kenglik max 140mm, `break-inside: avoid` bilan
o'z sub-part'iga bog'langan.

---

## 4. Mark scheme formati

```
3(a)  Define the term primary key.                              [2]

      MP1  A field / attribute                                   (1)
      MP2  that uniquely identifies each record                  (1)

      Accept: "column" for field
      Reject: "makes the table faster"

3(b)  Explain why a primary key is required.                     [3]
      Any three from:

      MP1  Uniquely identifies each record                        (1)
      MP2  Enforces entity integrity / prevents duplicates        (1)
      MP3  Used by foreign keys to link tables                    (1)
      MP4  ...
      MP5  ...

      Guidance: Max 2 if no example given.
```

---

## 5. Feedback report

O'quvchiga PDF sifatida beriladigan natija — ota-onaga ko'rsatish yoki daftarga
saqlash uchun.

```
┌──────────────────────────────────────────────────────┐
│ Karimov Aziz · 10-A                                   │
│ Databases HW3 · 2026-08-13                            │
│                                                       │
│ 17 / 24  ·  71%  ·  Grade B   (sinf o'rtachasi 68%)  │
├──────────────────────────────────────────────────────┤
│ Q3(b) Explain                                    1/3  │
│                                                       │
│ Sening javobing:                                      │
│   "A primary key means each record can be told        │
│    apart from the others. It also keeps entity        │
│    integrity."                                        │
│                                                       │
│ ✓ Yagona identifikatsiya — olindi                     │
│ ✗ Entity integrity — atama bor, natijasi yo'q         │
│ ✗ Foreign key bog'lanishi — yoritilmagan              │
│                                                       │
│ Izoh: "Explain" savolida atama yetarli emas.          │
│       Natijasini ham yozish kerak.                    │
├──────────────────────────────────────────────────────┤
│ NIMA USTIDA ISHLASH KERAK                             │
│ 1. Topic 8.2 Normalisation — 41%                      │
│ 2. "Explain" savollarida sabab yozish — 58%           │
└──────────────────────────────────────────────────────┘
```

Oxirgi blok — 2 ta aniq, bajariladigan tavsiya. Ko'p emas.

---

## 6. Paper generator

`05-admin-ui.md` §4.2 dagi UI ning backend qismi.

```ts
interface GenerateParams {
  syllabusId: string;
  componentIds: string[];
  subtopicIds: string[];
  targetMarks: number;
  aoRatio?: { AO1: number; AO2: number; AO3: number };
  yearFrom?: number; yearTo?: number;
  difficulty?: 'easy' | 'mixed' | 'hard';
  excludeSeenByClassId?: string;
  excludeDiagrams?: boolean;
  commandWordMix?: 'balanced' | 'higher_order';
  seed?: number;              // qayta ishlab chiqarish uchun
}

export function generatePaper(pool: Question[], p: GenerateParams): GenerateResult
```

### Algoritm

```
1. Hovuzni filtrlash (status='approved', barcha shartlar)
2. Savollarni ILDIZ bo'yicha guruhlash — Q3 va uning barcha bolalari bitta birlik
   (marks = bolalar yig'indisi)
3. Skorlash: har bir nomzod uchun
   score = w1·ao_moslik + w2·subtopic_qamrov + w3·qiyinlik_moslik
         + w4·yangilik(ko'rilmagan) + w5·yil_yangiligi
4. Greedy: eng yuqori skorli nomzodni qo'shish, qolgan ballni yangilash
5. targetMarks ga ±2 ichida kelmasa → backtracking (oxirgi 3 tanlovni qaytarish)
6. 200 iteratsiyada topilmasa → eng yaqin natija + ogohlantirish
7. Tartiblash: oson → qiyin (marks bo'yicha o'sish, keyin AO)
```

**Sof funksiya, seed bilan deterministik.** Test yozish mumkin, o'qituvchi
bir xil natijani qayta olishi mumkin.

### Testlar

```ts
it('jami ball maqsaddan ±2 ichida');
it('ota savol tanlansa barcha bolalari kiradi');
it('excludeSeenByClassId ishlaydi');
it('bir savol ikki marta tanlanmaydi');
it('bir xil seed bir xil natija beradi');
it('hovuz yetarli emas → ogohlantirish, xato emas');
it('aoRatio imkonsiz bo\'lsa → eng yaqin + ogohlantirish');
```

---

## 7. Eksport oqimi

```
Foydalanuvchi [PDF] bosadi
   ↓
POST /exports → 202 { jobId } → PostgreSQL `jobs` navbati
   ↓ UI: "Tayyorlanmoqda..." (progress)
Render → Puppeteer → PDF
   ↓
Private storage: exports/{exportId}.pdf
   ↓ presigned URL (24 soat)
UI: [Yuklab olish]  + Yuklanishlar tarixida saqlanadi
```

Katta paper (30+ sahifa) 10–20 soniya oladi. Fon jarayoni, UI bloklanmaydi.

**Watermark:** har bir eksport pastida kichik matn:
`Navoiy Prezident maktabi · 2026-08-13 · faqat ichki foydalanish uchun`
Bu `11-ops-and-legal.md` dagi cheklovga bog'liq.
