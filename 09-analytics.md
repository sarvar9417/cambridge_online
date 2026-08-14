# 09 — Analitika

> SQL hisoblash va materialized view yangilash `backend/` da; grafik va heatmaplar
> `frontend/` da. Frontend PostgreSQL bilan bevosita gaplashmaydi.

## 1. Tamoyil

Analitikaning maqsadi — chiroyli grafik emas, **harakat**.

Har bir ko'rsatkich uchun savol: *"Buni ko'rgan o'qituvchi nima qiladi?"*
Javob yo'q bo'lsa — ko'rsatkich chiqarilmaydi.

| Ko'rsatkich | Harakat |
|---|---|
| Sinf Topic 4 da 41% | Ertaga Topic 4 ni qayta tushuntirish |
| Q3(b) MP2 ni 73% yo'qotdi | Aynan entity integrity ni tushuntirish |
| Explain savollarida 58% | Imtihon texnikasi darsi |
| Aziz 3 hafta faol emas | Bilan gaplashish |
| ❌ "Jami 1,247 javob berildi" | Hech narsa. Chiqarilmaydi. |

---

## 2. Mastery modeli

### 2.1 Formula

```
mastery(student, subtopic) = w_recency × ratio_recent + (1 - w_recency) × ratio_all

ratio_all    = marks_earned / marks_possible                 (barcha vaqt)
ratio_recent = oxirgi 5 urinishning marks_earned/possible
w_recency    = 0.6
```

**Nima uchun yaqinlikka og'irlik:** o'quvchi 2 oy oldin 40% olgan bo'lsa va
hozir 80% olayotgan bo'lsa, uning hozirgi darajasi 80% ga yaqinroq.
O'rtacha esa 60% ko'rsatadi — bu noto'g'ri va o'quvchini demotivatsiya qiladi.

### 2.2 Ishonch

```
confidence = min(1, marks_possible / 15)
```

15 balldan kam ma'lumot bo'lsa, mastery ko'rsatiladi lekin `≈` belgisi bilan:
```
Topic 4  ≈41%  (kam ma'lumot)
```

Bu muhim — 3 balllik bitta savoldan "Topic 4 da 33%" degan xulosa chiqarish
noto'g'ri va o'quvchini adashtirdi.

### 2.3 Topic darajasi

```
mastery(topic) = Σ(mastery(sub) × marks_possible(sub)) / Σ(marks_possible(sub))
```

Ballga vaznlangan, oddiy o'rtacha emas. Katta subtopic ko'proq ta'sir qiladi.

### 2.4 Yangilash

`gradings.released_at` o'rnatilganda — **DB trigger emas, servis metodi**
(`GradingService.release()` ichida, bitta tranzaksiyada):
```sql
-- 1. question_subtopics orqali tegishli subtopiclarni topish
-- 2. har biriga weight bo'yicha ball taqsimlash
-- 3. mastery upsert
-- 4. grading_points bo'yicha error_patterns yangilash
```

Vazn `assignments.mastery_weight` dan olinadi: nazorat ostidagi mock 1.0, mustaqil mashq **0.5** — bu real baholash emas.

---

## 3. Sinf heatmap

```sql
select p.full_name, t.number as topic, avg(m.score) as mastery,
       sum(m.marks_possible) as evidence
from mastery m
join subtopics s on s.id = m.subtopic_id
join topics t on t.id = s.topic_id
join enrollments e on e.student_id = m.student_id
join profiles p on p.id = m.student_id
where e.class_id = $1 and e.left_at is null
group by p.full_name, t.number
order by p.full_name, t.number;
```

Ranglar: `< 50%` qizil, `50–75%` sariq, `> 75%` yashil.
`evidence < 15` bo'lsa — kulrang shtrix (ma'lumot yetarli emas).

**Kulrang kataklar muhim.** Ular "bu o'quvchi bu mavzuda hali sinalmagan"
degani — bu ham qimmatli ma'lumot ("Topic 6 ni hech kim yechmagan").

---

## 4. Mark point tahlili

**Eng qimmatli so'rov.**

```sql
select msp.text, q.display_ref, q.command_word,
       count(*) filter (where gp.final_matched = false) as missed,
       count(*) as total,
       round(100.0 * count(*) filter (where gp.final_matched = false) / count(*), 1) as miss_pct
from grading_points gp
join mark_scheme_points msp on msp.id = gp.mark_scheme_point_id
join mark_schemes ms on ms.id = msp.mark_scheme_id
join questions q on q.id = ms.question_id
join gradings g on g.id = gp.grading_id
join answers a on a.id = g.answer_id
join submissions sub on sub.id = a.submission_id
join assignments asg on asg.id = sub.assignment_id
where asg.class_id = $1 and g.released_at > now() - interval '60 days'
group by msp.id, msp.text, q.display_ref, q.command_word
having count(*) >= 8                        -- statistik ma'noga ega minimum
order by miss_pct desc
limit 15;
```

Chiqish to'g'ridan-to'g'ri dars rejasi:
```
73%  MP2 Q3(b) Explain   "Enforces entity integrity"
68%  MP1 Q5(a) Explain   "Cache reduces memory access time"
61%  MP3 Q2(c) Describe  "Interrupt saves register contents"
```

**`having count(*) >= 8`** muhim: 2 ta o'quvchi yo'qotgan MP dan xulosa chiqarib
bo'lmaydi.

---

## 5. Command word tahlili

```sql
select q.command_word,
       sum(g.final_score) / nullif(sum(g.max_marks), 0) * 100 as pct,
       count(*) as n
from gradings g
join answers a on a.id = g.answer_id
join questions q on q.id = a.question_id
join submissions s on s.id = a.submission_id
join assignments asg on asg.id = s.assignment_id
where asg.class_id = $1 and g.released_at is not null
group by q.command_word
having count(*) >= 10
order by pct;
```

Bu **bilim emas, ko'nikma** o'lchovi. Agar o'quvchi Topic 8 ni yaxshi biladi
(State savollarida 90%) lekin Explain savollarida 55% olsa — muammo bilimda emas,
javob yozish texnikasida. Bu butunlay boshqa aralashuvni talab qiladi.

---

## 6. O'quvchi darajasidagi tavsiyalar

O'quvchiga max **2 ta** tavsiya. Ko'p bo'lsa hech biri bajarilmaydi.

```
1. Eng past mastery'li subtopic (evidence ≥ 15 bo'lganlar orasidan)
2. Eng past command word (n ≥ 10)
```

Har biriga aniq harakat:
```
Topic 8.2 Normalisation · 41%
  → [Notes o'qish] [12 kartochka] [5 savol mashqi]

"Explain" savollari · 58%
  → [Explain texnikasi darsi] [10 ta Explain savoli]
```

---

## 7. AI sifati paneli (owner)

`04-ai-grading.md` §6.3 dagi metrikalar. Hisoblash:

```sql
-- Point agreement (faqat o'qituvchi ko'rgan baholar)
select
  count(*) filter (where gp.teacher_matched is not distinct from gp.ai_matched)::numeric
    / nullif(count(*), 0) * 100 as point_agreement,
  count(*) filter (where gp.ai_matched = true  and gp.teacher_matched = false)::numeric
    / nullif(count(*), 0) * 100 as false_positive,
  count(*) filter (where gp.ai_matched = false and gp.teacher_matched = true)::numeric
    / nullif(count(*), 0) * 100 as false_negative
from grading_points gp
join gradings g on g.id = gp.grading_id
where gp.teacher_matched is not null
  and g.prompt_version = $1
  and g.graded_at > $2;
```

**Muhim shart:** `teacher_matched is not null` — ya'ni faqat o'qituvchi
haqiqatan ko'rgan baholar. Autopilot o'tkazgan baholar bu hisobga kirmaydi
(aks holda o'zini o'zi tasdiqlaydi).

Shuning uchun **autopilot yoqilgandan keyin ham 10% tasodifiy namuna
o'qituvchiga yuboriladi** — sifat monitoringi uchun. Buni to'xtatib bo'lmaydi.

---

## 8. Materialized view'lar

Og'ir so'rovlar uchun. Har kecha 03:00 da `backend/src/jobs` scheduleri yangilaydi.
PostgreSQL advisory lock bir nechta backend nusxasi bir xil ishni bajarishiga yo'l
qo'ymaydi; xato `jobs` jadvalida saqlanadi va qayta uriniladi.

```sql
create materialized view mv_class_topic_mastery as ...;
create materialized view mv_question_difficulty as ...;
create materialized view mv_mark_point_miss_rates as ...;

// backend/src/jobs/refresh-analytics.processor.ts
// backend scheduler: every day at 03:00
for (const v of ['mv_class_topic_mastery','mv_question_difficulty','mv_mark_point_miss_rates']) {
  await db.execute(sql.raw(`refresh materialized view concurrently ${v}`));
}
```

`concurrently` — yangilanish paytida so'rovlar bloklanmasin
(unique indeks talab qiladi, har bir view'da bo'lishi shart).

Kunlik yangilanish yetarli — bu ko'rsatkichlar soatlik o'zgarmaydi.
Faqat baholash navbati va vazifa progressi real vaqtda.

---

## 9. Savol qiyinligi

Qo'lda belgilanmaydi — **real natijalardan hisoblanadi**:

```sql
create materialized view mv_question_difficulty as
select q.id,
       sum(g.final_score) / nullif(sum(g.max_marks), 0) as facility,  -- 0..1
       count(*) as attempts
from questions q
join answers a on a.question_id = q.id
join gradings g on g.answer_id = a.id
where g.released_at is not null
group by q.id
having count(*) >= 15;
```

`facility` (Cambridge atamasi): yuqori = oson.
```
facility > 0.75  → oson
0.45–0.75        → o'rta
< 0.45           → qiyin
```

15 urinishdan kam bo'lsa — qiyinlik `null`, filtr ishlamaydi.
Boshlang'ich davrda ko'p savolda `null` bo'ladi, bu normal.

---

## 10. Nimani o'lchamaymiz

Bu ro'yxat ham muhim:

- ❌ Platformada o'tkazilgan vaqt — uzoq o'tirish o'rganish emas
- ❌ Kirish soni — faollik natija emas
- ❌ O'quvchilar reytingi — zarar keltiradi (`06-student-ui.md` §8)
- ❌ Javob yozish tezligi — sekin yozuvchi yomon o'quvchi degani emas
- ❌ Streak uzunligi ko'rsatkich sifatida (o'quvchiga motivatsiya uchun ko'rsatiladi,
  lekin o'qituvchi analitikasiga kirmaydi)

Bularning hech biri **harakat** hosil qilmaydi.
