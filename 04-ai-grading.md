# 04 — AI baholash

## 1. Asosiy tamoyil

> **Model dalil topadi. Tizim ball hisoblaydi.**

Modelga "bu javobga necha ball?" deb so'ralmaydi. Hech qachon. Sabab:

| Model ball bersa | Model dalil topsa |
|---|---|
| Nega 2 ball ekanini bilmaysan | Qaysi MP olindi, qaysi yo'q — ko'rinadi |
| Tuzatib bo'lmaydi | Bitta MP ni ✗ qilasan, ball avtomatik o'zgaradi |
| Sifatni o'lchab bo'lmaydi | MP darajasida agreement o'lchanadi |
| `any 3 from 5` da chalkashadi | Guruh mantiqi kodda, xatosiz |
| O'quvchiga "nega" deb ayta olmaysan | Har MP uchun aniq sabab bor |

Bu qaror qaytarilmaydi (`00-README.md` R4).

---

## 2. Oqim

```
answers.submitted  →  POST /submissions/:id/submit
   ↓
PostgreSQL `jobs` navbati (`idempotency_key = grade:{answerId}:{promptVersion}`)
   ↓  apps/worker grade-answer processor
   ↓
1. Kontekst yig'ish: savol + kontekst + MS points + command word + AO
2. Javob tayyorlash: text | code | OCR(image)
3. Claude chaqiruvi → matched points + evidence + confidence
4. Chiqishni validatsiya (§5)
5. marking.ts → ball hisoblash (deterministik)
6. gradings + grading_points yozish
   ↓
┌─ autopilot ON va confidence ≥ threshold va risk yo'q → status: ai_done, avto-release
└─ aks holda ─────────────────────────────────────────→ status: needs_teacher
   ↓
Teacher review → teacher_matched → qayta hisoblash → final_score
   ↓
released_at → o'quvchi ko'radi + mastery/error_patterns yangilanadi
```

---

## 3. Grading prompt (`prompts/grade-answer.v1.md`)

```markdown
You are assisting a Cambridge International examiner marking AS & A Level
Computer Science 9618. You do NOT assign a score. You determine, for each mark
point, whether the candidate's answer earns it, and you cite the exact words that
earn it.

## Question
Reference: {display_ref}
Command word: {command_word}
Marks available: {marks}
Assessment objective: {ao}

{context_md ? "Shared context:\n" + context_md : ""}

Question text:
{stem_md}

{assets_description}

## Mark scheme
Type: {scheme_type}
{guidance_md ? "Examiner guidance: " + guidance_md : ""}

{mark_points_block}
<!-- Format:
MP1 [1 mark] Uniquely identifies each record
     accept: "no two records share this value"
     reject: "makes searching faster"
MP2 [1 mark] ...
-->

## Candidate's answer
<candidate_answer>
{answer_text}
</candidate_answer>
{ocr_note}

## How to decide

**The command word sets the bar.**
- State / Give / Name / Identify — a correct term alone is enough.
- Describe — the candidate must say what happens, not just name it.
- Explain — the candidate must give a reason or consequence. A restatement of the
  question, or a bare term, does not earn the mark.
- Compare — the point must address both things, not one in isolation.
- Evaluate / Justify — a claim with supporting reasoning.

**Mark positively.** Award the point if the candidate's meaning matches the mark
point, even when the wording differs, unless the mark scheme explicitly rejects
that wording. Cambridge examiners reward understanding, not vocabulary matching.

**But do not be generous with vagueness.** "It is faster" does not earn a point
about cache reducing memory access time. If the candidate has not demonstrated the
specific idea, the point is not earned.

**Ignore everything not in the mark scheme.** Extra correct material earns nothing.
Extra incorrect material does not lose marks — UNLESS it directly contradicts a
point the candidate otherwise earned, in which case that point is not awarded.

**Handle "requires".** If MP3 lists requires: ["MP1"], you may only match MP3 when
MP1 is also matched.

**Evidence must be verbatim.** Quote the candidate's own words exactly, from the
answer above. If you cannot quote it, the point is not matched. Never paraphrase
into the evidence field, and never write evidence for an unmatched point.

**Confidence.** Report your confidence per point:
- ≥0.9 the answer is clearly on or clearly off the point
- 0.7–0.9 requires interpretation but you are reasonably sure
- <0.7 genuinely ambiguous — a human examiner could reasonably disagree
Be honest. Low confidence routes this to a teacher, which is the correct outcome
for a genuinely borderline answer.

**Blank or off-topic answers.** If the answer is empty, whitespace, "idk",
or unrelated to the question, mark every point false and set
"answer_quality": "blank" or "off_topic".

## Output
Return ONLY this JSON object. No preamble, no markdown fences.

{
  "points": [
    { "code": "MP1", "matched": true,
      "evidence": "a primary key means each record can be told apart",
      "reason": "Candidate expresses unique identification in own words",
      "confidence": 0.94 },
    { "code": "MP2", "matched": false,
      "evidence": null,
      "reason": "Candidate names entity integrity but does not say what it prevents; Explain requires a consequence",
      "confidence": 0.81 }
  ],
  "answer_quality": "normal",
  "overall_confidence": 0.87,
  "feedback_uz": "Birinchi ball olindi — yagona identifikatsiyani to'g'ri tushuntirding. Ikkinchi ballda 'entity integrity' atamasini yozgansan, lekin u nimani oldini olishini aytmagansan. 'Explain' savolida atama yetarli emas, natijasini ham yozish kerak.",
  "flags": []
}

"flags" may contain: "possible_ms_error", "answer_in_wrong_language",
"suspected_copy", "illegible", "answers_different_question".
```

### Nima uchun `feedback_uz` promptda?

Feedback'ni alohida chaqiruvda generatsiya qilish 2× qimmat va sifatsiz bo'ladi
(model kontekstni qayta o'qishi kerak). Bir chaqiruvda dalil ham, feedback ham chiqadi.

**Feedback qoidalari** (prompt oxiriga qo'shiladi):
```
Write feedback_uz in Uzbek, addressed to the student as "sen".
Name what earned marks first, then what was missing and why.
Do not reveal mark scheme points the student did not reach — describe the gap,
not the answer. Two to four sentences. No praise padding.
```

---

## 4. Ball hisoblash — `packages/shared/marking.ts`

**`packages/shared/marking.ts` — sof funksiya. Tarmoq chaqiruvi yo'q.**

★ Backendning ikki oqimida ishlatiladi: job runner AI natijasini hisoblaganda va
o'qituvchi MP toggle qilganda. Frontend preview ko'rsatishi mumkin, lekin server
javobi har doim yakuniy haqiqat; frontend backend faylini import qilmaydi.

```ts
export interface MatchedPoint {
  code: string;
  matched: boolean;
  confidence: number;
}

export interface Scheme {
  type: SchemeType;
  maxMarks: number;
  points: Array<{
    code: string; marks: number; groupId: string | null; requires: string[];
  }>;
  groups: Array<{ id: string; nRequired: number; marksPerPoint: number; maxMarks: number }>;
  levels: Array<{ level: number; minMarks: number; maxMarks: number }>;
}

export function computeScore(scheme: Scheme, matched: MatchedPoint[]): ScoreResult
```

### Algoritm

```
1. requires filtri
   Har bir matched=true MP uchun: uning requires[] dagi barcha kodlar ham
   matched=true bo'lishi shart. Aks holda matched=false ga tushiriladi
   (va sabab yoziladi: "MP1 olinmagani uchun").
   ⚠ Iterativ: zanjirli bog'liqlikda barqarorlashguncha takrorlanadi.

2. scheme_type bo'yicha:

   all_required:
     score = Σ(marks) matched bo'lganlar bo'yicha

   any_n_from_m:
     har bir guruh uchun alohida:
       g = matched MP soni bu guruhda
       groupScore = min(g, nRequired) × marksPerPoint
       groupScore = min(groupScore, group.maxMarks)
     guruhsiz MP lar all_required kabi qo'shiladi
     score = Σ(groupScore) + Σ(guruhsiz)

   exact_match:
     score = matched ? maxMarks : 0

   levels_of_response:
     ❌ AVTOMATIK BAHOLANMAYDI
     status = 'needs_teacher' majburiy, ai_score = null
     AI faqat indicative content bo'yicha izoh beradi

   code_output:
     ❌ Alohida pipeline (§8). AI bu yerda baholamaydi.

   manual_only:
     ❌ status = 'needs_teacher' majburiy

3. score = min(score, scheme.maxMarks)      ← qattiq shift
4. score = max(score, 0)
5. Butun sonlarga yaxlitlash (9618 da yarim ball yo'q)
```

### Test holatlari (majburiy)

```ts
describe('computeScore', () => {
  it('all_required: 3 dan 2 tasi → 2');
  it('any_3_from_5: 4 tasi mos → 3 (cheklangan)');
  it('any_3_from_5: 2 tasi mos → 2');
  it('requires: MP2 mos lekin MP1 yo\'q → MP2 bekor, 0');
  it('zanjirli requires: MP3→MP2→MP1, MP1 yo\'q → hammasi bekor');
  it('ikki guruh: har biri o\'z cheklovida hisoblanadi');
  it('guruh + guruhsiz MP aralash');
  it('exact_match: matched=false → 0');
  it('levels_of_response: null qaytaradi, needs_teacher bayrog\'i');
  it('score hech qachon maxMarks dan oshmaydi');
  it('bo\'sh matched massiv → 0, xato tashlamaydi');
  it('mark scheme\'da yo\'q MP kodi kelsa → e\'tiborsiz qoldiriladi + finding');
});
```

Oxirgi test muhim: model gallyutsinatsiya qilib `MP9` qaytarsa, tizim yiqilmasligi
va jim qabul qilmasligi kerak.

---

## 5. Model chiqishini validatsiya

`marking.ts` ga bermasdan oldin:

| Tekshiruv | Buzilsa |
|---|---|
| JSON parse bo'ladi | 1 marta qayta urinish, keyin `failed` |
| Barcha MP kodlari mark scheme'da bor | Ortiqcha kodlar tashlanadi + finding |
| Barcha MP kodlari qoplangan (yetishmayotgani yo'q) | Yetishmagani `matched=false` |
| `matched=true` bo'lsa `evidence` bo'sh emas | `matched=false` ga tushiriladi + flag |
| `evidence` javob matnida haqiqatan bor (normallashtirilgan taqqoslash) | flag `fabricated_evidence`, → `needs_teacher` |
| `confidence` 0..1 oralig'ida | qisqartiriladi |
| `feedback_uz` bo'sh emas va < 800 belgi | shablon feedback |

**`fabricated_evidence` tekshiruvi majburiy.** Model ba'zan javobda bo'lmagan
so'zlarni "iqtibos" qiladi. Normallashtirish: kichik harf, tinish belgilarini olib
tashlash, bo'shliqlarni siqish, keyin substring qidirish (yoki ≥0.85 fuzzy).
Topilmasa — bu ball berilmaydi va o'qituvchiga yuboriladi.

---

## 6. Kalibrlash protokoli

### 6.1 Nima uchun kerak

Prompt qanchalik yaxshi bo'lsa ham, u **yaxshi ekanini isbotlash** kerak.
Isbot uchun ground truth kerak: o'qituvchi qo'lda bahogan real javoblar.

Sun'iy javoblar ish bermaydi. Real o'quvchi javoblari:
- qisqartiradi ("CPU tez bo'ladi" — 3 ball kutilgan joyda)
- to'g'ri atamani noto'g'ri kontekstda ishlatadi
- o'zbekcha o'ylab inglizcha yozadi — grammatik g'alati, mazmunan to'g'ri
- boshqa savolga javob beradi
- qo'lyozmada o'qilmaydigan joylar bo'ladi

Bularning hech biri generatsiya qilib bo'lmaydi.

### 6.2 Bosqichlar

| Bosqich | Shart | Rejim |
|---|---|---|
| **Yig'ish** | 0–150 baholangan javob | AI **o'chirilgan**. Faqat qo'lda. |
| **Soya rejimi** | 150–250 | AI ishlaydi, natija **yashirin** saqlanadi. O'qituvchi ko'rmaydi. |
| **Yordamchi** | agreement ≥ 80% | AI taklifi ko'rsatiladi, o'qituvchi hamma narsani tasdiqlaydi |
| **Autopilot (tanlangan)** | agreement ≥ 88% | Faqat `State/Give/Name/Identify` + `confidence ≥ 0.9` avtomatik |
| **Autopilot (keng)** | agreement ≥ 92%, FP < 3% | + `Describe/Explain`. `Evaluate` hech qachon avtomatik emas. |

**Soya rejimi juda muhim.** AI natijasi ko'rinsa, o'qituvchi unga moslashadi
(anchoring bias) va agreement sun'iy yuqori chiqadi. Yashirin rejim toza o'lchov beradi.

### 6.3 Metrikalar (`grading_evaluations`)

```
point_agreement  = ai_matched == teacher_matched bo'lgan MP lar %
score_exact      = ai_score == teacher_score bo'lgan javoblar %
score_within_1   = |ai_score - teacher_score| ≤ 1 bo'lganlar %
MAE              = mean(|ai_score - teacher_score|)
false_positive   = AI ball berdi, o'qituvchi bermadi (% MP)
false_negative   = AI bermadi, o'qituvchi berdi (% MP)
```

**FP > FN dan xavfliroq.** O'quvchi olmagan ballni olsa — bilmaganini bilmaydi va
imtihonda yiqiladi. Ball kam berilsa — o'quvchi shikoyat qiladi va tuzatiladi.
Shuning uchun autopilot chegarasi FP bo'yicha qat'iy: **FP < 3%**.

### 6.4 Kesim bo'yicha tahlil

Umumiy agreement yetarli emas. `by_command_word` va `by_topic` bo'yicha ajrating:

```
Explain     agreement 79%  ← muammo shu yerda
State       agreement 96%
Describe    agreement 88%
Evaluate    agreement 61%  ← hech qachon avtomatik qilmaslik
```

Umumiy 87% "yaxshi" ko'rinadi, lekin `Explain` savollari 79% bo'lsa,
autopilot aynan eng ko'p uchraydigan savol turida xato qiladi.

### 6.5 Prompt versiyalash

Prompt o'zgarganda:
1. Yangi versiya `prompts/grade-answer.v2.md`
2. Saqlangan 200 ta ground truth javobda **offline** ishga tushiriladi
3. `grading_evaluations` ga v1 va v2 solishtiriladi
4. v2 yaxshiroq bo'lsagina `app_settings` da yoqiladi

Bu regression testning o'zi. Promptni "yaxshiladim" deb ishonch bilan
o'zgartirish va sifatni pasaytirish juda oson.

---

## 7. Few-shot misollar

Agreement 88% dan oshmasa, few-shot qo'shiladi. Manba — o'qituvchi tuzatgan holatlar:

```sql
select gp.ai_evidence, gp.ai_matched, gp.teacher_matched, msp.text, a.text as answer
from grading_points gp
join gradings g on g.id = gp.grading_id
join answers a on a.id = g.answer_id
join mark_scheme_points msp on msp.id = gp.mark_scheme_point_id
join questions q on q.id = a.question_id
where gp.changed_by_teacher = true
  and q.command_word = $1        -- command word bo'yicha
order by g.graded_at desc limit 6;
```

Har bir command word uchun 3–6 misol, prompt'ga `<examples>` blokida.
Prompt caching bilan bu deyarli bepul.

**Ehtiyot:** misollar bir xil topic'dan bo'lmasin, aks holda model o'sha topic'ga
overfit bo'ladi. Turli topic, turli xato turi.

---

## 8. Kod savollari (P2/P4)

AI bu yerda baholamaydi. **Kod ishga tushiriladi.**

```
Answer (Python/VB.NET/Java)
   ↓
Statik tekshiruv: sintaksis, xavfli import (os, subprocess, socket, open)
   ↓
Sandbox: izolyatsiya, tarmoqsiz, 5 s CPU, 128 MB, faqat stdin/stdout
   ↓
Test case'lar: mark scheme'dan olingan input/output juftliklari
   ↓
Ball = o'tgan test case'lar bo'yicha rubrika
```

Qo'shimcha AI o'tishi faqat **qisman ball** uchun: "algoritm to'g'ri, lekin
chegara xatosi bor" — bu Cambridge'da ball beradi, test case bermaydi.

`mark_scheme_points` da `code_output` sxemasi uchun:
```json
{ "code": "MP1", "text": "Loop iterates n times",
  "test": { "input": "5\n", "expected_stdout": "15\n", "kind": "exact" } }
```

**Bu Faza 6.** MVP ga kirmaydi. Pseudocode savollari esa oddiy matn sifatida
baholanadi (`all_required` sxemasi bilan) — bu ishlaydi.

---

## 9. Qo'lyozma javoblar (OCR)

Real imtihon qo'lda yoziladi. O'quvchi telefonda rasmga oladi.

```
Rasm → sifat tekshiruvi (o'lcham, kontrast, burchak)
   ↓ past bo'lsa: "Qayta suratga ol" + maslahat
Claude vision OCR → matn
   ↓
ocr_confidence < 0.75 → o'quvchiga ko'rsatiladi: "To'g'ri o'qildimi?"
   ↓ o'quvchi tuzatadi
Baholash odatdagidek
```

**Muhim:** OCR matni o'quvchiga tasdiqlash uchun ko'rsatiladi. OCR xatosi tufayli
ball yo'qotish adolatsiz va o'quvchi ishonchini yo'qotadi.

OCR prompt:
```
Transcribe this handwritten exam answer exactly as written.
Preserve the student's spelling and grammar errors — do not correct them.
Preserve line breaks, bullet points, and numbering.
For genuinely illegible words write [?]. Do not guess.
For diagrams write [DIAGRAM: brief description].
Output the transcription only.
```

"Do not correct them" muhim — model spontan ravishda grammatikani tuzatadi,
bu esa baholashni buzadi (imlo xatosi ba'zi MP larda ahamiyatli).

---

## 10. Teacher review ekrani

```
┌────────────────────────────────────────────────────────────────┐
│ Karimov Aziz · Q3(b) Explain · 3 ball · AI: 2 (ishonch 0.81)   │
├──────────────────────────┬─────────────────────────────────────┤
│ JAVOB                    │ MARK SCHEME (any 3 from 5)          │
│                          │                                     │
│ "A primary key means     │ ✓ MP1 Uniquely identifies record    │
│  each record can be      │   💬 "each record can be told apart"│
│  told apart from the     │   [✓ Roziman] [✗ Rad et]            │
│  others. It also keeps   │                                     │
│  entity integrity."      │ ✗ MP2 Enforces entity integrity     │
│                          │   AI: atama bor, lekin natijasi yo'q│
│                          │   [✓ Ball ber] [✗ Roziman]          │
│                          │                                     │
│                          │ ✗ MP3 Used as foreign key link      │
│                          │ ✗ MP4 ... ✗ MP5 ...                 │
├──────────────────────────┴─────────────────────────────────────┤
│ Ball: [2] / 3        ⌨ 1-5 = MP toggle · Enter = tasdiqla     │
│ Feedback: [AI matni — tahrirlanadi]                            │
│                             [Tasdiqla]  [Keyingi ↓]            │
└────────────────────────────────────────────────────────────────┘
```

**Talablar:**
- Klaviatura: `1`–`9` MP toggle, `Enter` tasdiqlash, `J/K` navigatsiya
- Ball MP toggle'idan **avtomatik** qayta hisoblanadi
- **Savol bo'yicha rejim**: bitta savolning 30 ta javobini ketma-ket ko'rish
  (o'qituvchi mark scheme'ni bir marta yodda tutadi — 3× tezroq)
- AI dalili javob matnida **ajratib ko'rsatiladi** (highlight)
- Har bir toggle `grading_points.teacher_matched` ga yoziladi
- `override_reason` ixtiyoriy, lekin `ai_score` dan 2+ ball farq bo'lsa so'raladi

---

## 11. Xavfsizlik cheklovlari

| Qoida | Sabab |
|---|---|
| `Evaluate` va `levels_of_response` hech qachon avtomatik emas | AI band ajratishda ishonchsiz |
| Yakuniy/mock imtihon hech qachon avtomatik emas | Yuqori ta'sir |
| `flags` bo'sh bo'lmasa → har doim o'qituvchiga | Model o'zi shubha bildirgan |
| `answer_quality != 'normal'` → o'qituvchiga | Bo'sh/mavzudan tashqari javob |
| O'quvchi apellyatsiya qilsa → o'qituvchiga | Har doim odam qarori |
| Oylik AI byudjet oshsa → navbat to'xtaydi, ogohlantirish | Xarajat nazorati |
| Bitta o'quvchining bir vazifadagi barcha javoblari `ai_score = 0` bo'lsa → o'qituvchiga | Tizimli xato belgisi |

**Apellyatsiya oqimi:** o'quvchi `released` bahoda "Rozi emasman" tugmasi bosadi →
`gradings.status = 'needs_teacher'`, sabab bilan → o'qituvchi navbatiga. Bu ham
`grading_points` ga yoziladi va kalibrlashga hissa qo'shadi.

---

## 12. Xarajat

Bitta javob baholash: ~2500 in / ~600 out tokens.
Prompt caching bilan (savol + mark scheme bir sinf uchun bir xil) ~40% arzon.

```
30 o'quvchi × 8 savol × 4 vazifa/oy = 960 baholash/oy
960 × ~$0.012 = ~$12/oy
```

`ai_calls` dan real kuzatiladi. `app_settings['ai.monthly_budget_usd']` = 50.

`ANTHROPIC_API_KEY` **faqat backend muhitida** bo'ladi. Frontend build yoki
`VITE_*` o'zgaruvchilariga hech qachon kiritilmaydi.
