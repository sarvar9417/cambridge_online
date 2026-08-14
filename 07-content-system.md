# 07 — Kontent tizimi

> Kontent UI `frontend/` da, generatsiya, validatsiya va PostgreSQL yozuvlari
> `backend/` da bo'ladi. Frontend Claude API'ni hech qachon to'g'ridan-to'g'ri chaqirmaydi.

## 1. Har bir subtopic uchun to'plam

```
Subtopic 8.2 — Normalisation
├─ notes          Yozma bayon (o'zbekcha, inglizcha atamalar bilan)
├─ glossary       Cambridge ta'riflari (inglizcha, o'zgartirilmaydi) + o'zbekcha izoh
├─ worked_example 1–2 ta to'liq yechilgan past paper savoli
├─ flashcard_deck 10–20 karta (SM-2)
├─ quiz           8–12 MCQ
├─ slides         Dars uchun (ixtiyoriy, faqat asosiy topiclarda)
└─ game           Term match / Sequence / Spot the gap
```

**Manbalar ustuvorligi:**
1. Rasmiy sillabus PDF — "Notes and guidance" bo'limi
2. **Mark scheme'lar** — eng qimmatli manba (quyida)
3. Examiner report'lar — o'quvchilarning odatiy xatolari
4. Darslik

---

## 2. Mark scheme'lardan kontent generatsiyasi

Bu yondashuv rejangda yo'q edi, lekin eng samarali.

Mark scheme aynan **imtihonda ball beradigan mazmunni** o'z ichiga oladi.
Darslik esa ko'p narsani o'rgatadi, lekin qaysi biri ball berishini aytmaydi.

```sql
-- Subtopic 8.2 bo'yicha barcha mark point'lar
select msp.text, msp.accept, msp.reject, q.command_word, q.display_ref
from mark_scheme_points msp
join mark_schemes ms on ms.id = msp.mark_scheme_id
join questions q on q.id = ms.question_id
join question_subtopics qs on qs.question_id = q.id
where qs.subtopic_id = $1 and qs.is_primary
order by q.display_ref;
```

Bu ro'yxat — **o'sha subtopic bo'yicha imtihonda so'raladigan hamma narsa**,
Cambridge'ning o'z so'zlari bilan, so'nggi 5 yil bo'yicha.

Undan chiqadi:
- **Notes** — mazmun va urg'u (nima ko'p so'raladi)
- **Glossary** — mark scheme'da takrorlanadigan atamalar
- **Flashcards** — har bir tez-tez uchraydigan MP dan bitta karta
- **`accept` ro'yxati** — muqobil to'g'ri ifodalar, o'quvchiga juda foydali
- **`reject` ro'yxati** — ★ oltin. Bu Cambridge'ning "bu javob ball olmaydi"
  ro'yxati. Aynan shu odatiy xatolar. Notes'da alohida blok:
  *"Bu javob ball olmaydi: ..."*

---

## 3. Notes generatsiyasi

```markdown
Write study notes in Uzbek for a Cambridge 9618 subtopic.

## Subtopic
{code} {title}

## Learning objectives (from the official syllabus)
{learning_objectives}

## Syllabus notes and guidance
{syllabus_guidance}

## What examiners actually award (from mark schemes, 2021–2025)
{mark_point_list}

## What examiners explicitly reject
{reject_list}

## Rules

1. Write in Uzbek. Keep every technical term in English, with the Uzbek
   explanation after it on first use:
   "**Primary key** — jadvaldagi har bir yozuvni yagona tarzda aniqlaydigan maydon."
   Never translate a technical term into Uzbek and then use the Uzbek version.
   The exam is in English; the student must recognise the English term.

2. Structure:
   - Nima o'rganamiz (learning objectives, plain language)
   - Asosiy tushunchalar (each with definition, then explanation, then example)
   - Imtihonda qanday so'raladi  ← use real command words and real question refs
   - Ball olmaydigan javoblar   ← from the reject list, this is the differentiator
   - Tekshir o'zingni (3–5 savol, javoblari yashirin)

3. Length: 600–1200 words. This is a study aid, not a textbook chapter.

4. Every claim must be traceable to the syllabus or a mark scheme above.
   Do not add material that is interesting but not examinable.
   If you are unsure whether something is in the 9618 syllabus, leave it out.

5. Use concrete examples from the student's world where it helps
   (a school database, a shop stock system) rather than abstract ones.

6. No motivational filler. No "Bu juda muhim mavzu!" openings.

Output markdown only.
```

**Kalit qoida 4:** "Do not add material that is interesting but not examinable."
Modellar sillabusdan tashqariga chiqishga moyil va o'quvchi vaqtini yo'qotadi.

---

## 4. Glossary

**Cambridge ta'riflari o'zgartirilmaydi.** 9618 da ta'rifni "o'z so'zi bilan"
aytish ko'pincha ball olmaydi — imtihonchi aniq formulani kutadi.

```
term:            "Primary key"
definition_en:   "A field that uniquely identifies each record in a table."
definition_uz:   "Jadvaldagi har bir yozuvni yagona tarzda aniqlaydigan maydon."
example_md:      "student_id — har bir o'quvchi uchun takrorlanmas."
source_ref:      "Syllabus 8.1.2 / MS 9618/12/M/J/23 Q3(b)"
```

**`source_ref` majburiy.** Ta'rif qayerdan olingani yozilmasa, keyinchalik uni
tekshirib bo'lmaydi. Manbasiz ta'rif — ishonchsiz ta'rif.

`definition_en` ni AI generatsiya qilmaydi — u sillabus yoki mark scheme matnidan
**ko'chiriladi**. AI faqat `definition_uz` va `example_md` yozadi.

---

## 5. Flashcard generatsiyasi

```markdown
Create flashcards from this 9618 subtopic material.

## Card types (produce a mix)
- term → definition          (recall the Cambridge definition)
- definition → term          (reverse recognition)
- scenario → correct concept ("A shop wants... which normal form?")
- command-word drill         ("Explain why X. Name the two things your answer needs.")

## Rules
1. One idea per card. If the back needs "and", split it into two cards.
2. The back of a definition card is the Cambridge wording, verbatim.
3. Front must be answerable without seeing other cards.
4. No trivia. Every card maps to a learning objective or a mark point.
5. 10–20 cards for this subtopic. Fewer good cards beat more weak ones.
6. Front in English (exam language). Explanatory hint may be in Uzbek.

Output JSON: [{ "front_md": "...", "back_md": "...", "hint_md": "...",
                "type": "term_to_def", "source_mp": "MP2 of Q3(b)" }]
```

**4-turdagi karta (command-word drill) muhim.** Bu bilim emas, imtihon texnikasini
o'rgatadi — `06-student-ui.md` §5.3 dagi ma'lumot aynan shu zaiflikni ko'rsatadi.

### Xatodan kartochka

O'quvchi MP ni yo'qotganda avtomatik:
```
error_patterns.miss_count += 1
   ↓ miss_count >= 2 bo'lsa
o'sha MP dan shaxsiy kartochka yaratiladi
   ↓
flashcard_reviews ga 3 kunlik interval bilan qo'shiladi
```

Bu platformani "vazifa berish vositasi"dan "o'rganish tizimi"ga aylantiradigan narsa.

---

## 6. Quiz

MCQ, 8–12 savol. **Past paper savollarini takrorlamaydi** — ular alohida bo'limda.

```markdown
Rules:
1. 4 options. One correct unless stated.
2. Distractors must be plausible and must come from real student errors —
   use the "reject" list from the mark schemes above. A distractor nobody
   would choose teaches nothing.
3. Every question has an explanation that says why the correct answer is
   correct AND why the most tempting distractor is wrong.
4. Cover the learning objectives evenly. Do not cluster on one.
```

**2-qoida asosiy g'oya:** distraktorlar `reject` ro'yxatidan olinadi.
Bu Cambridge'ning o'zi "bu javob noto'g'ri" degan ro'yxati — ya'ni real
o'quvchilar aynan shunday xato qiladi.

`difficulty` real natijalardan hisoblanadi: `1 - (to'g'ri javoblar / urinishlar)`,
kamida 20 urinishdan keyin.

---

## 7. Kontent sifat nazorati

Savollar kabi: **generatsiya → validatsiya → cross-check → tanlab tekshirish**.

### 7.1 Deterministik tekshiruvlar

| Kod | Tekshiruv |
|---|---|
| C01 | Notes uzunligi 600–1500 so'z |
| C02 | Har bir LO notes'da eslatilgan (kalit so'z bo'yicha) |
| C03 | Glossary atamalari notes'da ishlatilgan |
| C04 | `definition_en` sillabus/MS matnida topiladi (fuzzy ≥ 0.9) |
| C05 | Flashcard soni 8–25 |
| C06 | Flashcard old tomonlari takrorlanmaydi (fuzzy ≥ 0.9) |
| C07 | Quiz'da har bir savolda aynan `correct_ids` soniga mos to'g'ri javob |
| C08 | Quiz distraktorlari takrorlanmaydi |
| C09 | Barcha inglizcha atamalar glossary'da bor |
| C10 | Sillabusdan tashqari atama yo'q (glossary + sillabus lug'atiga qarshi) |

C04 va C10 eng muhim — birinchisi ta'rif to'qib chiqarilmaganini,
ikkinchisi sillabusdan chiqib ketilmaganini tekshiradi.

### 7.2 Cross-check

```markdown
You are reviewing generated study material against the official 9618 syllabus.
You did not write it.

Syllabus learning objectives: {los}
Syllabus guidance: {guidance}
Generated notes: {notes}

Report only:
1. Statements not supported by the syllabus or mark schemes (list them)
2. Learning objectives not covered (list codes)
3. Technical errors (list with correction)
4. Terms translated into Uzbek that should stay in English

{ "beyond_syllabus": [...], "uncovered_los": [...], "errors": [...],
  "translated_terms": [...], "verdict": "ok" | "needs_review" }
```

`verdict != "ok"` → `needs_review`.

### 7.3 Odam tekshiruvi

`approved` bo'lishi uchun **owner** ko'rishi shart. Lekin:
- Deterministik tekshiruvdan o'tgan + cross-check `ok` → tez ko'rish (skim)
- Aks holda → to'liq ko'rish

Baho: ~80 subtopic × 5 kontent turi = 400 element.
Tez ko'rish 1 daqiqa, to'liq 5 daqiqa. ~30% flagged bo'lsa: `280×1 + 120×5 ≈ 14 soat`.

**Bu ish bir marta qilinadi va 3 yil xizmat qiladi** (sillabus 2026–2028).
Fazalarga bo'lish mumkin: avval o'qitilayotgan topiclar, keyin qolganlari.

---

## 8. Versiyalash

Sillabus o'zgarganda (2029) kontent qayta ko'rib chiqiladi.
`content_items.version` va `syllabi.version_label` bog'lanishi buni boshqaradi.

Kontent tahrirlanganda: yangi versiya yaratiladi, eskisi `archived`.
O'quvchi ko'rgan versiya `content_views` da saqlanadi — agar keyin ta'rif
o'zgarsa, o'quvchi eski ta'rifni o'rganganini bilamiz.

---

## 9. Xarajat

| Element | Soni | Token | Narx |
|---|---|---|---|
| Notes | 80 | 8k in / 3k out | ~$12 |
| Glossary | 80 | 4k / 1.5k | ~$5 |
| Flashcards | 80 | 5k / 2k | ~$7 |
| Quiz | 80 | 5k / 2k | ~$7 |
| Cross-check | 320 | 6k / 0.5k | ~$8 |
| **Jami** | | | **≈ $39** |

Prompt caching bilan ~$25. Bir martalik.
