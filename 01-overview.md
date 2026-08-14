# 01 — Mahsulot doirasi

> **Implementatsiya chegarasi:** foydalanuvchi ko'radigan barcha ekranlar
> `apps/web` da, biznes qoidalari va ma'lumotga kirish `apps/api` + `packages/shared` da.
> Frontend PostgreSQL yoki backend ichki fayllariga bevosita ulanmaydi.
> (v4: eski `frontend/`+`backend/` nomlari hujjatning qolganida talab sifatida qoladi;
> haqiqiy tuzilma `IMPLEMENTATION-STATUS.md` da.)

## 1. Muammo

Cambridge 9618 ni o'qitishda o'qituvchining vaqti uch joyda yo'qoladi:

| Ish | Haftasiga | Nima uchun og'ir |
|---|---|---|
| Topic bo'yicha savol topish | 2–3 soat | 60+ PDF, savollar topic bo'yicha indekslanmagan |
| Yozma javoblarni baholash | 4–6 soat | Har javob mark scheme bilan qo'lda solishtiriladi |
| Kim nimani bilmasligini aniqlash | — | Umuman qilinmaydi, chunki ma'lumot yig'ilmaydi |

Uchinchisi eng qimmatli va aynan u qilinmaydi. Ballar daftarda qoladi, lekin
"sinfning 70% i Q4(b) da MP2 ni yo'qotdi" degan ma'lumot hech qachon chiqmaydi.

CamPath shu uchtasini hal qiladi.

## 2. Doiradan tashqari (non-goals)

Bularni **qilmaymiz**. Agar keyinchalik kerak bo'lsa — alohida qaror.

- ❌ Video darslar, live stream
- ❌ To'lov tizimi, obuna
- ❌ Ota-onalar paneli
- ❌ Boshqa fanlar (Physics, Maths) — arxitektura ruxsat beradi, lekin kontent yo'q
- ❌ Mobil ilova (native) — PWA yetarli
- ❌ Ochiq ro'yxatdan o'tish — faqat o'qituvchi taklifi bilan (`11-ops-and-legal.md` ga qarang)
- ❌ Real-time hamkorlik (bir vaqtda tahrirlash)

## 3. Rollar

| Rol | Kim | Huquqlar |
|---|---|---|
| `owner` | Sarvar | Hammasi + boshqa o'qituvchi qo'shish + AI sozlamalari + xarajat |
| `teacher` | Boshqa CS o'qituvchilar | O'z sinflari, savol banki (o'qish + taklif), baholash |
| `student` | O'quvchi | O'z vazifalari, o'z natijalari, kontent, mashq rejimi |

**Muhim:** `owner` va `teacher` orasidagi farq — savol bankini **tasdiqlash** huquqi.
`teacher` savol tahrirlashni taklif qiladi, `owner` tasdiqlaydi. Bir savoldagi xato
butun maktabga ta'sir qiladi.

## 4. Asosiy oqimlar

### 4.1 Savol bankini to'ldirish (owner)

```
PDF yuklash (QP + MS juftligi)
   ↓
Ingestion job → Claude ekstraksiyasi → savollar + mark scheme JSON
   ↓
Deterministik validatsiya (18 qoida, 03-ingestion.md)
   ↓
Ikkinchi model o'tishi (cross-check)
   ↓
┌─ Toza (≈85%) ──────────→ status: approved
└─ Flagged (≈15%) ──→ Review queue → owner tasdiqlaydi/tuzatadi → approved
```

Owner faqat flagged savollarni ko'radi. Bu 900 savolni ~120 taga qisqartiradi.

### 4.2 Vazifa berish (teacher)

```
Sinf tanlash → Topic/subtopic filtri → savol tanlash
   │                                      ├─ qo'lda tanlash
   │                                      └─ avto-generator (marks, AO nisbati, yil oralig'i)
   ↓
Rejim: online | pdf | mock
   ↓
Deadline, vaqt cheklovi, ball qachon ko'rinadi
   ↓
Yuborish → o'quvchilarga bildirishnoma
```

### 4.3 Javob berish (student)

```
Vazifa ochish → savol-savol javob yozish
   ├─ matn (rich text: bold, list, sub/superscript)
   ├─ pseudocode editor (monospace, 9618 pseudocode highlight)
   ├─ kod (Python/VB.NET/Java — 9618 ruxsat etgan tillar)
   └─ rasm yuklash (qo'lyozma javob) → OCR
   ↓
Avtosaqlash (har 5 s, localStorage + server)
   ↓
Topshirish → status: submitted
```

### 4.4 Baholash (AI + teacher)

```
submitted → grading job navbatga
   ↓
Claude: mark point bo'yicha dalil qidirish → grading_points
   ↓
marking.ts: scheme_type bo'yicha ball hisoblash → ai_score
   ↓
┌─ confidence ≥ 0.85 va sozlamada autopilot yoqilgan → status: ai_approved
└─ aks holda ────────────────────────────────────→ teacher review queue
   ↓
Teacher: mark point'larni ✓/✗ qiladi → final_score
   ↓
released → o'quvchi ko'radi
```

**Teacher'ning har bir o'zgartirishi `grading_points.teacher_matched` ga yoziladi.**
Bu kalibrlash datasetining o'zi. Batafsil: `04-ai-grading.md` §6.

### 4.5 Kontent bilan o'rganish (student)

```
Topic → subtopic → [Notes | Glossary | Flashcards | Quiz | Past questions | O'yin]
                                        ↓
                            SM-2 navbati (kunlik due kartalar)
```

## 5. 9618 sillabus strukturasi

Platformaga kiritiladigan topiclar (2026–2028 sillabusi):

**AS Level**

| # | Topic | Paper |
|---|---|---|
| 1 | Information representation | P1 |
| 2 | Communication | P1 |
| 3 | Hardware | P1 |
| 4 | Processor fundamentals | P1 |
| 5 | System software | P1 |
| 6 | Security, privacy and data integrity | P1 |
| 7 | Ethics and ownership | P1 |
| 8 | Databases | P1 |
| 9 | Algorithm design and problem-solving | P2 |
| 10 | Data types and structures | P2 |
| 11 | Programming | P2 |
| 12 | Software development | P2 |

**A Level**

| # | Topic | Paper |
|---|---|---|
| 13 | Data representation | P3 |
| 14 | Communication and internet technologies | P3 |
| 15 | Hardware and virtual machines | P3 |
| 16 | System software | P3 |
| 17 | Security | P3 |
| 18 | Artificial intelligence (AI) | P3 |
| 19 | Computational thinking and problem solving | P4 |
| 20 | Further programming | P4 |

> ⚠️ Agent: bu ro'yxat seed uchun. Rasmiy sillabus PDF'idan subtopic va learning objective
> kodlari (masalan `1.1.1`) aniq olinadi — qo'lda yozilmaydi, `03-ingestion.md` §7 dagi
> syllabus import oqimi bilan kiritiladi.

## 6. Command word'lar

Cambridge command word'lari baholashning kalitidir. `command_word` enum:

| Command word | Kutilgan javob | Odatiy marks |
|---|---|---|
| `State` / `Give` / `Name` | Bitta fakt, izohsiz | 1 |
| `Identify` | Tanlash yoki ko'rsatish | 1 |
| `Define` | Aniq ta'rif | 1–2 |
| `Describe` | Xususiyatlar, "nima" | 2–4 |
| `Explain` | Sabab/oqibat, "nega" | 2–4 |
| `Compare` | Ikkalasiga tegishli farq/o'xshashlik | 2–6 |
| `Calculate` | Raqamli javob + ish ko'rsatish | 1–4 |
| `Complete` | Jadval/diagramma to'ldirish | 1–5 |
| `Draw` | Diagramma | 2–4 |
| `Write` | Kod/pseudocode/algoritm | 3–12 |
| `Evaluate` | Ijobiy + salbiy + xulosa | 4–8 |
| `Justify` | Dalil bilan asoslash | 2–4 |
| `Suggest` | Kontekstga mos taklif | 2–4 |
| `Show` | Isbotlash/ko'rsatish | 2–4 |

**Nega muhim:** `Describe` savoliga `State` darajasidagi javob ball olmaydi. AI baholash
prompti command word'ni bilishi shart, aks holda tizimli ravishda yuqori ball beradi.

## 7. Glossariy (loyiha atamalari)

| Atama | Ma'no |
|---|---|
| **QP** | Question Paper — savol varaqasi PDF |
| **MS** | Mark Scheme — baholash sxemasi PDF |
| **Mark point (MP)** | Mark scheme'dagi bitta ball beriladigan nuqta |
| **Scheme type** | MP'lardan ball hisoblash qoidasi (`all_required`, `any_n_from_m`, ...) |
| **AO** | Assessment Objective: AO1 bilim, AO2 qo'llash, AO3 tahlil |
| **Ground truth** | O'qituvchi qo'lda bergan baho — AI sifatini o'lchash mezoni |
| **Agreement rate** | AI va o'qituvchi mark point darajasida necha % mos kelgani |
| **Autopilot** | Yuqori ishonchli baholarni o'qituvchisiz o'tkazish rejimi |
| **Review queue** | Odam tekshiruvini kutayotgan yozuvlar navbati |
| **Mastery** | O'quvchining subtopic bo'yicha o'zlashtirish darajasi (0–1) |
