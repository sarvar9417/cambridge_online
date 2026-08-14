# 05 — Admin / O'qituvchi paneli

> Bu hujjatdagi ekranlar `frontend/src/features/` ichida React bilan yoziladi.
> Ular ma'lumotni faqat `frontend/src/lib/api.ts` orqali Express backenddan oladi.

## 1. Navigatsiya

```
├─ Bosh sahifa          Bugungi ish: baholash navbati, review navbati, deadline'lar
├─ Sinflar              Ro'yxat → sinf → o'quvchilar, natijalar, mastery
├─ Vazifalar            Ro'yxat → yaratish → natijalar
├─ Baholash             Navbat (savol bo'yicha / o'quvchi bo'yicha)
├─ Savol banki          Qidiruv, filtr, savol ko'rish
├─ Import               PDF yuklash, ingestion holati, review queue
├─ Kontent              Topic → subtopic → kontent elementlari
├─ Analitika            Sinf heatmap, topic tahlili, AI sifati
└─ Sozlamalar           (owner) AI, xarajat, foydalanuvchilar, audit log
```

---

## 2. Bosh sahifa

**Yagona savolga javob beradi: bugun nima qilishim kerak?**

```
┌─────────────────────────────────────────────────────────────┐
│  Salom, Sarvar                          13-avgust, payshanba │
│                                                              │
│  ┌────────────────┐ ┌────────────────┐ ┌──────────────────┐│
│  │ 24             │ │ 12             │ │ 2                ││
│  │ javob kutmoqda │ │ savol tekshi-  │ │ vazifa muddati   ││
│  │ [Baholashni    │ │ ruvda          │ │ bugun tugaydi    ││
│  │  boshlash →]   │ │ [Ko'rish →]    │ │ [Ko'rish →]      ││
│  └────────────────┘ └────────────────┘ └──────────────────┘│
│                                                              │
│  Diqqat talab qiladi                                        │
│  ⚠ 11-A: 8 o'quvchi Topic 4 da 40% dan past                │
│  ⚠ Q3(b) — sinfning 73% i MP2 ni yo'qotdi                  │
│  ⚠ AI ishonchi past: 5 javob                               │
│                                                              │
│  Yaqin muddatlar                                            │
│  10-A · Databases HW3 · ertaga · 18/24 topshirgan           │
└─────────────────────────────────────────────────────────────┘
```

"Diqqat talab qiladi" bloki — bu platformaning eng qimmatli chiqishi.
Oddiy ballar emas, **harakat talab qiladigan xulosa**.

---

## 3. Savol banki

### 3.1 Filtrlar (chap panel, doim ko'rinadi)

```
Component    [P1] [P2] [P3] [P4]
Topic        ▾ ko'p tanlov, subtopic bilan daraxt
Command word ▾ ko'p tanlov
Marks        [1]—[15] slider
AO           [AO1] [AO2] [AO3]
Yil          [2019]—[2026]
Series       [M/J] [O/N] [F/M]
Holat        [approved] [needs_review] [rejected]
Diagramma    [bor] [yo'q]
Ishlatilgan  [hech qachon] [oxirgi yil ichida]   ← takrorlanishning oldini oladi
Qiyinlik     [oson] [o'rta] [qiyin]              ← real natijalardan
Matn qidiruv [_______________]                    ← full-text
```

**"Ishlatilgan" filtri muhim:** o'qituvchi bilmasdan bir savolni ikki marta beradi.

### 3.2 Ro'yxat

Har bir qator: `ref · command word · marks · subtopic · qiyinlik · [ko'z] [+ vazifaga]`

Ko'p tanlash → "Tanlangan 12 ta savoldan vazifa yaratish" / "PDF ga chiqarish".

### 3.3 Savol ko'rish (modal)

Tab'lar: **Savol** | **Mark scheme** | **Statistika** | **Manba PDF**

*Statistika* tabi:
```
42 marta javob berilgan · o'rtacha 2.1/3 (70%)
Eng ko'p yo'qotilgan: MP2 — 68%
Vaqt: o'rtacha 3 daq 20 s
Ishlatilgan: 10-A HW3 (2026-05), 11-B Mock (2026-03)
```

---

## 4. Vazifa yaratish

### 4.1 Qadamlar

```
1. Sinf va nom      → sinf, sarlavha, ko'rsatma
2. Savol tanlash    → qo'lda | avto-generator
3. Sozlash          → rejim, deadline, vaqt cheklovi, ball chiqarish siyosati
4. Ko'rib chiqish   → tarkib, jami ball, taxminiy vaqt, ogohlantirishlar
```

### 4.2 Avto-generator

```
┌──────────────────────────────────────────────┐
│ Jami ball        [25]                        │
│ Topic            [4 Processor] [8 Databases] │
│ AO nisbati       AO1 [40%] AO2 [45%] AO3[15%]│
│ Command mix      ○ Aralash  ○ Faqat Explain+ │
│ Yil oralig'i     [2021] — [2025]             │
│ Qiyinlik         ○ Oson  ● Aralash  ○ Qiyin  │
│ Takrorlash       ☑ Bu sinf ko'rmagan savollar│
│ Diagrammali      ☐ Chiqarib tashlash         │
│                                              │
│              [Yaratish]                      │
└──────────────────────────────────────────────┘
```

**Algoritm** (`src/features/assignments/generate.ts` — sof funksiya):
```
1. Filtrlarga mos savollar hovuzi (status='approved')
2. Sinf ko'rgan savollarni chiqarib tashlash (agar belgilangan bo'lsa)
3. Ball maqsadiga greedy + backtracking:
   - AO nisbatiga eng ko'p yaqinlashtiradigan savolni tanlash
   - to'liq mos kelmasa ±2 ball toleransiya
4. Bitta savolning barcha sub-part'lari birga olinadi (ota kontekst kerak)
5. Natija ko'rsatiladi + "almashtirish" tugmasi har bir savolda
```

**Muhim:** ota savol tanlansa, barcha bolalari kiradi. Q3(a) ni Q3(b) siz berish
mumkin emas — kontekst yo'qoladi.

### 4.3 Ko'rib chiqish ogohlantirishlari

```
⚠ Jami 27 ball, maqsad 25 edi
⚠ AO3 3% (maqsad 15%) — bu topic'da AO3 savoli kam
⚠ Q7 diagramma talab qiladi — onlayn rejimda o'quvchi chizolmaydi,
   PDF rejimini tanlang yoki rasm yuklashga ruxsat bering
⚠ Taxminiy vaqt 38 daqiqa (1.5 daq/ball)
```

---

## 5. Baholash navbati

### 5.1 Ikki rejim

**Savol bo'yicha (default, tavsiya etiladi)**
```
Q3(b) → Aziz → Malika → Bobur → ... (30 javob)
```
O'qituvchi mark scheme'ni bir marta o'qiydi va 30 javobni tez ko'radi.
**3× tezroq** va **izchilroq** — bir xil mezon bilan baholanadi.

**O'quvchi bo'yicha**
```
Aziz → Q1, Q2, Q3, ... (8 javob)
```
Feedback yozayotganda foydali.

### 5.2 Navbat filtrlari

```
[Hammasi] [AI ishonchi past] [Flagged] [Apellyatsiya] [Baholanmagan]
Saralash: [Ishonch ↑] [Topshirilgan vaqt] [O'quvchi]
```

Default: **ishonch bo'yicha o'sish tartibida** — eng shubhali javoblar birinchi.

### 5.3 Ekran

`04-ai-grading.md` §10 ga qarang.

### 5.4 Progress

Yuqorida doim: `12 / 30 baholandi · ~8 daqiqa qoldi`
Vaqt bahosi oxirgi 5 ta javobning o'rtacha vaqtidan.

---

## 6. Import (owner)

### 6.1 Yuklash

Drag-and-drop, ko'p fayl. Fayl nomidan metadata avtomatik:
```
9618_s23_qp_12.pdf → 9618, May/June 2023, QP, Paper 1 Variant 2
9618_w22_ms_23.pdf → 9618, Oct/Nov 2022, MS, Paper 2 Variant 3
```
Aniqlanmasa — qo'lda tanlash. QP va MS **juftlik** sifatida bog'lanadi.

### 6.2 Holat jadvali

```
Paper              Bosqich         Savol  Flagged  Holat
9618/12/M/J/23     ✓ tugadi        14     2        [Review →]
9618/22/M/J/23     ⏳ EXTRACT_MS    —      —        62%
9618/12/O/N/22     ✗ xato          —      —        [Log] [Qayta]
```

### 6.3 Review queue

`03-ingestion.md` §9 ga qarang. Bu ekranning tezligi butun loyihaning tezligi.

---

## 7. Analitika

### 7.1 Sinf heatmap

```
                T1   T2   T3   T4   T5   T6   T7   T8
Aziz K.         ██   ██   ▓▓   ░░   ██   ▓▓   ██   ██
Malika R.       ██   ▓▓   ██   ░░   ▓▓   ██   ██   ▓▓
Bobur T.        ▓▓   ░░   ░░   ░░   ░░   ▓▓   ▓▓   ░░
...
Sinf o'rtacha   82%  71%  68%  41%  74%  79%  85%  77%
                               ↑
                        Topic 4 — sinf muammosi
```

Katakka bosilsa: o'sha o'quvchining o'sha topic'dagi barcha javoblari.

### 7.2 Mark point tahlili

**Eng qimmatli ekran.** "Sinf nimani bilmaydi" — MP darajasida:

```
Eng ko'p yo'qotilgan mark point'lar (oxirgi 30 kun)

MP2 · Q3(b) · "Enforces entity integrity"          73% yo'qotdi  (22/30)
MP1 · Q5(a) · "Cache reduces memory access time"   68% yo'qotdi  (19/28)
MP3 · Q2(c) · "Interrupt saves register contents"  61% yo'qotdi  (17/28)
```

Bu to'g'ridan-to'g'ri dars rejasiga aylanadi: ertaga entity integrity qayta tushuntiriladi.

### 7.3 Command word tahlili

```
State      91%   ████████████████████
Describe   74%   ███████████████
Explain    58%   ████████████            ← tizimli muammo
Evaluate   43%   █████████
```

Bu **bilim muammosi emas, imtihon texnikasi muammosi**. O'quvchilar mavzuni biladi,
lekin "Explain" savoliga "State" darajasida javob yozadi. Buni bilish qimmatli.

### 7.4 AI sifati (owner)

```
Prompt v2 · claude-sonnet-4-6 · 247 ta baholangan javob

Mark point agreement      89.2%   ▲ +4.1 (v1 ga nisbatan)
Ball aynan mos            76.5%
±1 ball ichida            94.8%
False positive             2.4%   ✓ chegara 3%
False negative             4.1%

Command word bo'yicha:
  State 96%  Describe 90%  Explain 83%  Evaluate 62%

Xulosa: State/Give/Name uchun autopilot yoqish mumkin.
        Explain uchun few-shot qo'shish tavsiya etiladi.
```

### 7.5 Xarajat (owner)

```
Bu oy: $18.40 / $50

Baholash        $12.10   (960 chaqiruv)
Ingestion        $4.80   (bir martalik)
Kontent          $1.20
OCR              $0.30
```

---

## 8. Dizayn tizimi

### 8.1 Yondashuv

Bu **ish quroli**, marketing sahifasi emas. O'qituvchi bu ekranlarda haftasiga
4–6 soat o'tkazadi. Shuning uchun: zichlik, tezlik, past kontrastli fon,
diqqatni tortmaydigan interfeys.

Bitta e'tibor markazi: **baholash ekrani**. Qolgan hamma narsa jim.

### 8.2 Ranglar

```css
/* Fon — sof oq emas, uzoq ishlashda ko'z charchamasin */
--bg:            #FBFAF8;
--surface:       #FFFFFF;
--border:        #E5E2DC;
--border-strong: #CBC6BC;

/* Matn */
--text:          #1A1815;
--text-muted:    #6B655C;

/* Aksent — chuqur siyoh ko'k. Terakota/acid yashil emas. */
--accent:        #1E3A5F;
--accent-soft:   #EBF0F6;

/* Semantik — baholashda ma'no tashiydi, dekoratsiya emas */
--awarded:       #2D7D5A;   /* ball berildi */
--awarded-bg:    #EAF5EF;
--missed:        #A63D40;   /* ball berilmadi */
--missed-bg:     #FBEEEE;
--uncertain:     #B8860B;   /* AI ishonchi past */
--uncertain-bg:  #FBF4E4;
```

Yashil/qizil **faqat** mark point holatini bildiradi. Boshqa hech joyda ishlatilmaydi.
Bu o'qituvchining ko'zini ekranda o'qitadi: yashil = olindi, qizil = yo'q.

### 8.3 Tipografika

```css
--font-ui:    'Inter', system-ui, sans-serif;        /* interfeys */
--font-read:  'Source Serif 4', Georgia, serif;      /* savol va javob matni */
--font-mono:  'JetBrains Mono', ui-monospace;        /* kod, pseudocode */
```

**Savol va o'quvchi javobi serif bilan.** Bu qasddan: bular *o'qiladigan matn*,
interfeys elementi emas. Serif uzun matnda oson o'qiladi va ekranda savol matnini
tugma va yorliqlardan vizual ajratadi — o'qituvchi ko'zi darrov to'g'ri joyga tushadi.

Pseudocode uchun 9618 kalit so'zlari (`DECLARE`, `FOR`, `NEXT`, `PROCEDURE`,
`ENDPROCEDURE`, `WHILE`, `ENDWHILE`, `IF`, `THEN`, `ELSE`, `ENDIF`, `CASE OF`,
`OTHERWISE`, `ENDCASE`, `REPEAT`, `UNTIL`, `FUNCTION`, `RETURN`) uchun
maxsus syntax highlight — CodeMirror 6 legacy mode.

### 8.4 Zichlik

```css
--space-1: 4px;  --space-2: 8px;   --space-3: 12px;
--space-4: 16px; --space-6: 24px;  --space-8: 32px;
--radius:  6px;
--radius-lg: 10px;
```

Jadval qatori balandligi 36 px. Ro'yxatlarda kartochka emas, jadval —
kartochkalar joyni behuda sarflaydi va ma'lumot zichligini pasaytiradi.

### 8.5 Signature element

**Mark point ustuni.** Baholash ekranida o'ng tomonda vertikal MP ro'yxati:
har biri yashil yoki qizil chap chegara chizig'i bilan. Bosilganda holat almashadi
va ball tepada real vaqtda o'zgaradi.

Bu butun mahsulotning g'oyasini bitta vizual elementda ifodalaydi:
**baho — bu bitta raqam emas, qaror zanjiri.** Har qadam ko'rinadi va o'zgartiriladi.

### 8.6 Klaviatura (majburiy)

| Ekran | Klavishlar |
|---|---|
| Global | `⌘K` qidiruv, `G` `then` `B` baholash, `?` yordam |
| Baholash | `1`–`9` MP toggle, `Enter` tasdiqla, `J`/`K` navigatsiya, `F` feedback |
| Review queue | `A` tasdiqla, `E` tahrirla, `S` o'tkaz, `←`/`→` |
| Savol banki | `/` qidiruv, `Space` tanlash, `Enter` ochish |

Har bir ekranda `?` klaviatura xaritasini ko'rsatadi.

### 8.7 Sifat pol darajasi

- Mobil: o'qituvchi paneli 768px dan yuqori mo'ljallangan; baholash ekrani
  telefonda ham ishlasin (o'qituvchi yo'lda tekshirishi mumkin)
- Klaviatura fokusi doim ko'rinadi
- `prefers-reduced-motion` hurmat qilinadi
- Bo'sh holat = harakatga taklif, "Ma'lumot yo'q" emas
- Xato xabari nima bo'lgani va nima qilish kerakligini aytadi, kechirim so'ramaydi
