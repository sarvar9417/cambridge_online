# 03 — Ingestion pipeline (PDF → strukturalangan savol)

## 0. Asosiy g'oya

900 savolni odam tekshirsa — 15 soat va oxirida diqqat pasayadi.
Shuning uchun **tekshiruvni miqyoslaymiz, tekshiruvchini emas.**

```
900 savol
   ↓ deterministik validatsiya (18 qoida)   →  ~110 flagged
   ↓ ikkinchi model cross-check              →  ~60 qo'shimcha flagged
   ↓ birlashtirish, dublikatlarni olib tashlash → ~120 savol odam ko'radi
```

Owner 120 ta savolni ko'radi, 900 tasini emas. Sifat ham yaxshiroq — diqqat tarqamaydi.

---

## 1. Bosqichlar

```
1. UPLOAD      Backend upload → private storage, sha256, source_papers yozuvi
2. PREPARE     sahifa → PNG (200 dpi) + text layer (pdftotext -layout)
3. SEGMENT     sahifalarni savol chegaralari bo'yicha bo'lish
4. EXTRACT_QP  Claude vision → savol daraxti JSON
5. EXTRACT_MS  Claude → mark scheme JSON
6. MATCH       QP ↔ MS ni display_ref bo'yicha bog'lash
7. ASSETS      diagrammalarni crop (sharp) → private storage
8. CLASSIFY    subtopic + AO + command word aniqlash
9. VALIDATE    18 deterministik qoida
10. CROSSCHECK ikkinchi model o'tishi
11. PERSIST    DB ga yozish, status = approved | needs_review
```

Har bir bosqich `jobs` jadvalida saqlanadi va `backend/src/jobs/runner.ts` navbatdagi
bosqichni `FOR UPDATE SKIP LOCKED` bilan oladi. Biri tugagach keyingisi queued bo'ladi.
Process to'xtasa `locked_at` timeoutidan keyin o'sha bosqich qayta olinadi.

**Nega job runnerda:** `pdftoppm` va `sharp` tizim binary'lari, bitta paper
~5–10 daqiqa ishlaydi va ~200 MB xotira oladi. Dastlab runner backend processida;
yuk oshganda ayni entrypoint alohida process sifatida ishga tushiriladi.

---

## 2. PREPARE

```bash
pdftoppm -png -r 200 input.pdf page      # sahifa rasmlari
pdftotext -layout input.pdf out.txt      # matn qatlami (agar bor bo'lsa)
```

**Ikkalasi ham kerak.** Text layer aniq (OCR xatosi yo'q), rasm esa diagramma va
tartibni ko'rsatadi. Modelga **ikkalasi birga** beriladi:
> "Quyida sahifa rasmi va undan chiqarilgan matn qatlami. Matn qatlamiga ustunlik ber,
> rasmni tartib va diagrammalarni tushunish uchun ishlat."

Bu yolg'iz vision'dan sezilarli aniqroq va arzonroq.

**Sahifa batch'lari:** bir chaqiruvga 2–3 sahifa. Sabab: savol sahifa oxirida bo'linadi.
Batch'lar 1 sahifa overlap bilan ketadi (`[1,2,3], [3,4,5], [5,6,7]`), keyin
`display_ref` bo'yicha deduplikatsiya.

---

## 3. EXTRACT_QP prompt (`prompts/extract-question.v1.md`)

```markdown
You are extracting exam questions from a Cambridge International AS & A Level
Computer Science 9618 question paper.

## Input
- Page image(s) at 200 dpi
- Text layer extracted from the same pages
- Paper metadata: {syllabus} {component} {year} {series} {variant}
- Questions already extracted from the previous batch: {prior_refs}

## Task
Extract every question and sub-question as a tree.

## Rules
1. Preserve the exact hierarchy: 3 → 3(b) → 3(b)(ii). Never flatten.
2. A parent that carries no marks of its own has "marks": null. Only leaves carry marks.
3. Shared scenario text (a table, a program listing, a description used by several
   sub-parts) goes in the PARENT's "context_md", never duplicated into each child.
4. "marks" comes from the bracketed number at the right margin, e.g. [3].
5. "command_word" is the FIRST imperative verb of the question stem.
   Use exactly one of: State, Give, Name, Identify, Define, Describe, Explain,
   Compare, Calculate, Complete, Draw, Write, Evaluate, Justify, Suggest, Show, Other.
6. If the question contains a diagram, table, or code listing, do NOT transcribe it
   into stem_md. Instead add an entry to "assets" with a bounding box and a description.
   Tables and code MAY be transcribed into asset.content_md as markdown; diagrams may not.
7. "answer_lines": count the ruled answer lines printed under the question.
   Use 0 if the answer space is a box, table, or diagram.
8. "answer_kind": text | pseudocode | code | table | diagram | image
9. Do not invent, complete, or correct anything. If text is unreadable, put the
   readable part in stem_md and add "unreadable" to the "issues" array.
10. If a question continues past the last page of this batch, set "truncated": true.

## Output
Return ONLY a JSON object. No preamble, no markdown fences.

{
  "questions": [
    {
      "path": "3",
      "label": "3",
      "parent_path": null,
      "stem_md": "A company stores customer records...",
      "context_md": null,
      "command_word": null,
      "marks": null,
      "answer_kind": "text",
      "answer_lines": 0,
      "source_pages": [4],
      "assets": [
        { "kind": "table", "content_md": "| Field | Type |\n|---|---|\n...",
          "alt_text": "Customer table structure", "bbox": [120, 340, 480, 520], "page": 4 }
      ],
      "issues": [],
      "confidence": 0.96
    },
    {
      "path": "3.b",
      "label": "b",
      "parent_path": "3",
      "stem_md": "Explain why a primary key is required.",
      "command_word": "Explain",
      "marks": 3,
      "answer_kind": "text",
      "answer_lines": 6,
      "source_pages": [4],
      "assets": [],
      "issues": [],
      "confidence": 0.98
    }
  ],
  "truncated": false,
  "page_total_marks": 12
}
```

**`page_total_marks`** — model o'zi sahifadagi ballarni qo'shib beradi.
Bu bizga bepul tekshiruv beradi (V02).

---

## 4. EXTRACT_MS prompt (`prompts/extract-markscheme.v1.md`)

Bu eng nozik qism. Mark scheme'ni noto'g'ri o'qish = butun yil noto'g'ri baholash.

```markdown
You are extracting a mark scheme from a Cambridge 9618 mark scheme document.

## Task
For each question reference, produce a machine-readable marking structure.

## scheme_type — choose exactly one

- "all_required"      Every mark point must be present. Marks = sum of matched points.
- "any_n_from_m"      "Any three from:" — award up to n points from a list of m.
                      Create a group with n_required = n.
- "levels_of_response" Banded descriptors (Level 1/2/3). Common for Evaluate questions.
- "exact_match"       A specific value, calculation result, or completed table cell.
- "code_output"       Program code judged by behaviour, not wording.
- "manual_only"       Cannot be reliably decomposed. Teacher marks by hand.

⚠ When unsure between two types, choose "manual_only" and set confidence < 0.6.
A wrong scheme_type causes silent mis-marking for every future student.
Choosing manual_only costs the teacher two minutes. Choosing wrong costs a year.

## Mark point rules
1. One awardable idea = one mark point. Do not merge two ideas into one point.
2. "accept": alternative wordings the mark scheme explicitly allows
   (look for "accept", "allow", "or", "OR", "//").
   The "//" symbol in Cambridge mark schemes separates acceptable alternatives.
3. "reject": wordings explicitly disallowed ("do not accept", "not", "NOT").
4. "requires": if a point is only awarded when another is present
   ("only if MP1 given"), list the codes.
5. "is_bod": true if the scheme says "benefit of doubt" or similar.
6. Preserve Cambridge's exact technical wording in "text". Do not paraphrase,
   simplify, or translate. Examiners award on specific terminology.
7. Any general guidance ("Max 2 if no example given") goes in guidance_md, not into points.

## Output — JSON only

{
  "schemes": [
    {
      "question_ref": "3(b)",
      "path": "3.b",
      "scheme_type": "any_n_from_m",
      "max_marks": 3,
      "guidance_md": "Max 2 marks if no example is given.",
      "groups": [
        { "label": "Any three from:", "n_required": 3, "marks_per_point": 1, "max_marks": 3 }
      ],
      "points": [
        { "code": "MP1", "group_label": "Any three from:", "marks": 1,
          "text": "Uniquely identifies each record",
          "accept": ["no two records have the same value"],
          "reject": ["makes searching faster"],
          "requires": [], "is_bod": false },
        { "code": "MP2", "group_label": "Any three from:", "marks": 1,
          "text": "Used to enforce entity integrity",
          "accept": ["prevents duplicate records"], "reject": [],
          "requires": [], "is_bod": false }
      ],
      "levels": [],
      "confidence": 0.91,
      "issues": []
    }
  ]
}
```

---

## 5. Validatsiya qoidalari

**Deterministik. AI emas. Har biri sof funksiya, unit test bilan qoplangan.**
Fayl: `backend/src/lib/validation/rules.ts`

| Kod | Darajа | Tekshiruv | Nega |
|---|---|---|---|
| **V01** | error | `sum(mark_scheme_points.marks)` ≥ `max_marks` (all_required'da `=`) | MS ekstraksiyasi to'liq emas |
| **V02** | error | Paperdagi barcha barg `marks` yig'indisi = `component.total_marks` | Savol tushib qolgan |
| **V03** | error | Har bir barg savolda `mark_schemes` yozuvi bor | MS moslanmagan |
| **V04** | error | Har bir MS ning `question_id` mavjud savolga tegishli | Yetim MS |
| **V05** | error | `any_n_from_m` da `count(points) > n_required` | Guruh noto'g'ri o'qilgan |
| **V06** | error | `any_n_from_m` da `group.max_marks ≤ scheme.max_marks` | Ball oshib ketadi |
| **V07** | error | Barg savolda `marks not null`; ota savolda `marks is null` | Daraxt buzilgan |
| **V08** | error | `path` uzluksiz: 3.a bor bo'lsa 3 ham bor | Ota yo'qolgan |
| **V09** | warning | Savol raqamlari uzluksiz: Q1..Qn, sakrash yo'q | Savol o'tkazib yuborilgan |
| **V10** | error | `answer_kind='diagram'` bo'lsa kamida 1 ta asset bor | Diagramma yo'qolgan |
| **V11** | error | Har bir asset `storage_path` mavjud va fayl hajmi > 2 KB | Bo'sh crop |
| **V12** | warning | `command_word` enum'da va `null` emas | Ekstraksiya to'liq emas |
| **V13** | warning | `marks` va `command_word` mos: `State`→1–2, `Explain`→2–4, `Evaluate`→4+ | Odatiy ekstraksiya xatosi |
| **V14** | warning | `marks` va `answer_lines` mos: `answer_lines ≥ marks` (matnli savollarda) | Marks noto'g'ri o'qilgan |
| **V15** | error | Kamida 1 ta `question_subtopics` yozuvi | Filtrlanmaydi |
| **V16** | warning | `question_subtopics.confidence ≥ 0.7` | Zaif klassifikatsiya |
| **V17** | warning | `stem_md` uzunligi 10–3000 belgi | Bo'sh yoki oqib ketgan |
| **V18** | error | `extract_confidence ≥ 0.80` (aks holda avtomatik flag) | Model o'zi ishonmayapti |
| **V19** | warning | Dublikat: bir `stem_md` boshqa yilda ham bor (fuzzy ≥ 0.95) | Repeat savol — bu foydali, xato emas |
| **V20** | error | `scheme_type='levels_of_response'` bo'lsa `mark_scheme_levels` bo'sh emas | Bandlar yo'qolgan |

**Qoida:** kamida bitta `error` bo'lsa → `status = 'needs_review'`.
Faqat `warning` bo'lsa → `needs_review`, lekin navbatda past prioritet.
Hech narsa bo'lmasa **va** cross-check rozi bo'lsa → `approved`.

### V13 jadvali (kod uchun)

```ts
const MARK_RANGES: Record<CommandWord, [number, number]> = {
  State: [1, 2], Give: [1, 2], Name: [1, 2], Identify: [1, 2],
  Define: [1, 3], Describe: [2, 5], Explain: [2, 5], Compare: [2, 6],
  Calculate: [1, 5], Complete: [1, 6], Draw: [1, 5], Write: [3, 15],
  Evaluate: [4, 12], Justify: [1, 5], Suggest: [1, 5], Show: [1, 5],
  Other: [1, 20],
};
```

---

## 6. Cross-check (ikkinchi model o'tishi)

Boshqa **prompt** bilan (ideal holatda boshqa yondashuv), bir xil model.

```markdown
You are auditing an automated extraction. You did not perform it.

Given: the page image, and a JSON extraction claimed to describe it.

For each of the following, answer strictly from the image:
1. Does the question text in the JSON match the printed question?
2. Is the mark allocation in the JSON the same as the bracketed number on the page?
3. Does the mark scheme correspond to THIS question number, not a neighbouring one?
4. Is the scheme_type correct? In particular, does the page say "Any N from"?
5. Are all diagrams/tables/code listings on the page represented in "assets"?

Return JSON:
{
  "agrees": false,
  "disagreements": [
    { "field": "marks", "extracted": 3, "observed": 4, "confidence": 0.9,
      "note": "The bracket reads [4]" }
  ],
  "confidence": 0.88
}

Do not fix anything. Report only.
```

**"Do not fix anything"** muhim. Tuzatishga ruxsat bersang, ikkinchi model birinchisining
xatosini o'z xatosi bilan almashtiradi va sen buni bilmay qolasan.

Kelishmovchilik → `cross_checks` jadvali → `validation_findings` (severity `error`).

**Narx nazorati:** cross-check faqat quyidagilarda ishlaydi:
- `extract_confidence < 0.95`, yoki
- savolda diagramma bor, yoki
- `scheme_type != 'all_required'`, yoki
- tasodifiy 10% namuna (sifat monitoringi uchun)

Bu ~40% savolni qamrab oladi, 100% emas.

---

## 7. Sillabus importi

Savollardan oldin bajariladi. Rasmiy 9618 sillabus PDF'idan:

```
Sillabus PDF → topic/subtopic/LO daraxti → topics, subtopics, learning_objectives
```

**Bu qo'lda tekshiriladi, to'liq.** ~20 topic, ~80 subtopic, ~400 LO — 1 soatlik ish.
Chunki bu butun tizimning skeleti; bu yerda xato bo'lsa hamma narsa qiyshiq bo'ladi.

Sillabus PDF'ida savol banki uchun kerak bo'lgan hamma narsa bor:
- Topic va subtopic kodlari
- LO matnlari ("Candidates should be able to…")
- Notes and guidance — kontent generatsiyasi uchun oltin manba
- Glossary of command words

---

## 8. CLASSIFY — subtopic aniqlash

```markdown
Classify this 9618 exam question against the syllabus.

Question: {stem_md}
Command word: {command_word}, Marks: {marks}
Paper: {component_name} ({level})
Mark scheme points: {ms_points_text}

Available subtopics for this component:
{subtopic_list_with_learning_objectives}

Rules:
- The mark scheme is stronger evidence than the question stem. What the examiner
  rewards tells you what is actually being tested.
- Return 1 primary subtopic, plus up to 2 secondary ones if the question genuinely
  spans them. Most questions have exactly one.
- Only propose a learning objective if the mark points map onto it directly.
- Do not force a match. If nothing fits above 0.6 confidence, return an empty array.

Output:
{ "subtopics": [ {"code":"1.2","is_primary":true,"confidence":0.93,"reason":"..."} ],
  "learning_objectives": [ {"code":"1.2.3","confidence":0.85} ],
  "ao": "AO2", "ao_confidence": 0.8 }
```

**Mark scheme'ni prompt'ga kiritish** klassifikatsiya aniqligini sezilarli oshiradi.
Savol matni ko'pincha kontekstga to'la ("A hospital stores patient data…") va model
mavzuni noto'g'ri taxmin qiladi. Mark scheme esa aynan nima baholanayotganini ko'rsatadi.

---

## 9. Review queue UI talablari

Bu ekran ingestion'ning muvaffaqiyatini belgilaydi. Sekin bo'lsa — baza to'lmaydi.

**Maket (split view):**

```
┌──────────────────────────────┬─────────────────────────────────┐
│ Original PDF sahifasi        │ Ajratilgan ma'lumot (tahrirlanadi)│
│ (savol joyi ajratib          │                                   │
│  ko'rsatilgan, zoom bor)     │ Ref     9618/12/M/J/23 Q3(b)     │
│                              │ Marks   [3]  ⚠ V13: Explain      │
│                              │ Command [Explain ▾]               │
│                              │ Stem    [tahrirlanadigan matn]    │
│                              │ Subtopic[8.2 Databases ▾] 0.91   │
│                              │ ─── Mark scheme ────────────────  │
│                              │ any 3 from 5                      │
│                              │ MP1 Uniquely identifies...        │
│                              │ MP2 Enforces entity integrity...  │
│                              │                                   │
│                              │ 🔴 V01: MP yig'indisi 5, max 3   │
│                              │ 🟡 V14: 6 chiziq, 3 ball          │
└──────────────────────────────┴─────────────────────────────────┘
   [A] Tasdiqla   [E] Tahrirla   [S] Keyinroq   [R] Rad et   [←][→]
```

**Majburiy talablar:**
1. **Klaviatura** — `A` tasdiqlash, `E` tahrirlash, `S` o'tkazish, `←/→` navigatsiya.
   Sichqoncha bilan 900 savol — imkonsiz.
2. **Prefetch** — keyingi 3 savol oldindan yuklanadi. Kutish bo'lmaydi.
3. **Finding'lar tepada** — nima uchun bu savol navbatda ekani birinchi ko'rinsin.
4. **Guruhlash rejimi** — "V13 buzilgan barcha savollar" ni ketma-ket ko'rish.
   Bir xil xato turini ketma-ket tuzatish 3 barobar tez.
5. **Bulk approve** — bir xil finding'li savollarni ko'rib chiqqach, qolganini
   birdaniga tasdiqlash (masalan V14 warning'ni "false_positive" deb yopish).
6. **Undo** — oxirgi 10 amal qaytariladi.

**Maqsad ko'rsatkich:** bitta savol ≤ 20 soniya. 120 savol ≈ 40 daqiqa.

---

## 10. Xarajat bahosi

| Bosqich | Chaqiruv | Token (in/out) | Narx |
|---|---|---|---|
| EXTRACT_QP | ~350 (2–3 sahifa batch) | 4k / 2k | ~$8 |
| EXTRACT_MS | ~250 | 5k / 2.5k | ~$7 |
| CLASSIFY | ~900 | 2k / 0.3k | ~$6 |
| CROSSCHECK | ~380 (40%) | 4k / 0.5k | ~$6 |
| **Jami (60 paper, ~900 savol)** | | | **≈ $27** |

Prompt caching bilan (sillabus ro'yxati, ko'rsatmalar) ~40% arzonlashadi → **≈ $17**.

Bir martalik xarajat. `ai_calls` jadvalidan real qiymat kuzatiladi.
