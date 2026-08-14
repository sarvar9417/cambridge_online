# 02 — Ma'lumotlar modeli

PostgreSQL 16, `node-postgres` (`pg`). Barcha jadvallarda `id uuid default gen_random_uuid()`,
`created_at timestamptz default now()`, kerak joyda `updated_at` trigger bilan.

Sxemaning yagona bajariladigan nusxasi `packages/db/migrations/` dagi oddiy
SQL fayllardir. Quyidagi SQL ularning aniq shartnomasi bo'lishi kerak.

Migration tartibi: `0001_enums` → `0002_syllabus` → `0003_org` → `0004_questions` →
`0005_markscheme` → `0006_jobs` → `0007_assignments` → `0008_grading` →
`0009_content` → `0010_analytics` → `0011_ops`.

> **v2 eslatma:** RLS yo'q. Ruxsatlar ilova qatlamida (§12). Bu jadval ta'riflari
> o'zgarmadi — ular boshidan sof Postgres edi.

---

## 1. Enum'lar (`0001_enums.sql`)

```sql
create type user_role        as enum ('owner','teacher','student');
create type level_type       as enum ('AS','A2');
create type exam_series      as enum ('MJ','ON','FM');           -- May/June, Oct/Nov, Feb/March
create type paper_kind       as enum ('QP','MS','IN','ER','GT'); -- Q paper, mark scheme, insert, examiner report, grade thresholds
create type ao_type          as enum ('AO1','AO2','AO3');
create type review_status    as enum ('draft','needs_review','approved','rejected','archived');
create type scheme_type      as enum ('all_required','any_n_from_m','levels_of_response',
                                      'exact_match','code_output','manual_only');
create type command_word     as enum ('State','Give','Name','Identify','Define','Describe',
                                      'Explain','Compare','Calculate','Complete','Draw',
                                      'Write','Evaluate','Justify','Suggest','Show','Other');
create type assignment_mode  as enum ('online','pdf','mock','practice');
create type submission_status as enum ('not_started','in_progress','submitted','grading',
                                       'graded','released','late');
create type grading_status   as enum ('queued','ai_done','needs_teacher','teacher_done','released','failed');
create type answer_kind      as enum ('text','pseudocode','code','image','table','diagram');
create type content_kind     as enum ('notes','slides','glossary','flashcard_deck','quiz','game','worked_example');
create type job_status       as enum ('queued','running','succeeded','failed','cancelled');
create type finding_severity as enum ('info','warning','error');
```

---

## 2. Sillabus (`0002_syllabus.sql`)

```sql
create table syllabi (
  id            uuid primary key default gen_random_uuid(),
  code          text not null,                    -- '9618'
  subject       text not null,                    -- 'Computer Science'
  version_label text not null,                    -- '2026-2028'
  valid_from    int  not null,                    -- 2026
  valid_to      int  not null,                    -- 2028
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (code, version_label)
);

create table components (                          -- Paper 1..4
  id            uuid primary key default gen_random_uuid(),
  syllabus_id   uuid not null references syllabi on delete cascade,
  number        int  not null check (number between 1 and 4),
  name          text not null,                    -- 'Theory Fundamentals'
  level         level_type not null,
  duration_min  int  not null,
  total_marks   int  not null,
  weight_pct    numeric(5,2),
  unique (syllabus_id, number)
);

create table topics (
  id            uuid primary key default gen_random_uuid(),
  syllabus_id   uuid not null references syllabi on delete cascade,
  number        int  not null,                    -- 1..20
  title         text not null,
  level         level_type not null,
  component_id  uuid references components,
  sort_order    int  not null,
  unique (syllabus_id, number)
);

create table subtopics (
  id            uuid primary key default gen_random_uuid(),
  topic_id      uuid not null references topics on delete cascade,
  code          text not null,                    -- '1.1'
  title         text not null,
  sort_order    int  not null,
  unique (topic_id, code)
);

create table learning_objectives (
  id            uuid primary key default gen_random_uuid(),
  subtopic_id   uuid not null references subtopics on delete cascade,
  code          text not null,                    -- '1.1.1'
  text          text not null,
  sort_order    int  not null,
  unique (subtopic_id, code)
);
```

**Nega uch daraja:** savolni topic'ga bog'lash juda qo'pol (Topic 1 da 40 ta savol bo'ladi).
Learning objective'ga bog'lash esa juda nozik va AI ko'p xato qiladi. **Subtopic — to'g'ri daraja.**
LO bog'lanishi ixtiyoriy, ishonch past bo'lsa bo'sh qoldiriladi.

---

## 3. Tashkilot va foydalanuvchilar (`0003_org.sql`)

```sql
create table schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  city       text,
  created_at timestamptz not null default now()
);

create table users (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid references schools on delete set null,
  role          user_role not null default 'student',
  full_name     text not null,
  email         text unique,
  username      text unique,              -- emaili yo'q o'quvchilar uchun
  password_hash text not null,            -- argon2id
  token_version int not null default 1,   -- barcha access tokenlarni bekor qilish uchun
  locale        text not null default 'uz',
  avatar_url    text,
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (email is not null or username is not null)
);

create table refresh_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users on delete cascade,
  token_hash  text not null unique,       -- sha256, xom token saqlanmaydi
  device_label text,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index on refresh_tokens (user_id) where revoked_at is null;

create table classes (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools on delete cascade,
  name        text not null,                      -- '10-A CS'
  grade       int,                                -- 10, 11
  level       level_type not null,
  syllabus_id uuid not null references syllabi,
  academic_year text not null,                    -- '2026/2027'
  owner_id    uuid not null references users,  -- asosiy o'qituvchi
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

create table class_teachers (                      -- ko-teacher
  class_id   uuid not null references classes on delete cascade,
  teacher_id uuid not null references users on delete cascade,
  primary key (class_id, teacher_id)
);

create table enrollments (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes on delete cascade,
  student_id uuid not null references users on delete cascade,
  joined_at  timestamptz not null default now(),
  left_at    timestamptz,
  unique (class_id, student_id)
);

-- ochiq ro'yxatdan o'tish yo'q; faqat taklif kodi bilan
create table invites (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes on delete cascade,
  code       text not null unique,                -- 8 belgi
  role       user_role not null default 'student',
  max_uses   int not null default 30,
  used_count int not null default 0,
  expires_at timestamptz not null,
  created_by uuid not null references users,
  created_at timestamptz not null default now()
);
```

---

## 4. Savollar (`0004_questions.sql`)

```sql
create table source_papers (
  id           uuid primary key default gen_random_uuid(),
  syllabus_id  uuid not null references syllabi,
  component_id uuid not null references components,
  year         int  not null,
  series       exam_series not null,
  variant      int  not null,                     -- 1,2,3
  kind         paper_kind not null,
  storage_path text not null,                     -- S3 kaliti
  sha256       text not null unique,              -- idempotentlik kaliti
  page_count   int,
  uploaded_by  uuid references users,
  created_at   timestamptz not null default now(),
  unique (syllabus_id, component_id, year, series, variant, kind)
);

create table questions (
  id            uuid primary key default gen_random_uuid(),
  source_paper_id uuid not null references source_papers on delete cascade,
  component_id  uuid not null references components,
  parent_id     uuid references questions on delete cascade,   -- Q3 → Q3(b) → Q3(b)(ii)
  label         text not null,                   -- '3', 'b', 'ii'
  path          text not null,                   -- '3.b.ii'  — qidiruv uchun
  display_ref   text not null,                   -- '9618/12/M/J/23 Q3(b)(ii)'
  depth         int  not null default 0,
  sort_order    int  not null,

  stem_md       text,                            -- savol matni (markdown)
  context_md    text,                            -- ota savoldagi umumiy kontekst/stsenariy
  command_word  command_word,
  marks         int  check (marks >= 0),         -- barg savollarda not null
  ao            ao_type,
  answer_kind   answer_kind not null default 'text',
  answer_lines  int,                             -- PDF eksportida javob chiziqlari soni

  status        review_status not null default 'needs_review',
  extract_confidence numeric(3,2),
  prompt_version text,
  reviewed_by   uuid references users,
  reviewed_at   timestamptz,
  notes         text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (source_paper_id, path)
);

create index on questions (source_paper_id);
create index on questions (parent_id);
create index on questions (status);
create index on questions (command_word);
create index on questions using gin (to_tsvector('english', coalesce(stem_md,'')));

create table question_assets (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references questions on delete cascade,
  kind         answer_kind not null,             -- 'image','table','diagram','code'
  storage_path text,                             -- rasm
  content_md   text,                             -- jadval/kod matn ko'rinishida
  alt_text     text not null default '',
  sort_order   int not null default 0,
  source_page  int
);

create table question_subtopics (
  question_id uuid not null references questions on delete cascade,
  subtopic_id uuid not null references subtopics on delete cascade,
  is_primary  boolean not null default false,
  weight      numeric(3,2) not null default 1.0,
  confidence  numeric(3,2),
  set_by      text not null default 'ai',        -- 'ai' | 'teacher'
  primary key (question_id, subtopic_id)
);

create index on question_subtopics (subtopic_id);

create table question_learning_objectives (
  question_id uuid not null references questions on delete cascade,
  lo_id       uuid not null references learning_objectives on delete cascade,
  confidence  numeric(3,2),
  primary key (question_id, lo_id)
);
```

**Daraxt strukturasi:** `parent_id` + `path`. Ota savol (`Q3`) o'zi ball tutmaydi
(`marks is null`), faqat kontekst saqlaydi. Ball faqat barglarda.

**Constraint:**
```sql
alter table questions add constraint leaf_has_marks
  check ( (marks is not null) or exists_child );  -- trigger bilan tekshiriladi, quyida
```
Amalda bu `check` SQL'da yozilmaydi — deferred trigger `validate_question_tree()` bajaradi
va buzilganda `validation_findings` ga yozadi (`03-ingestion.md` V07).

---

## 5. Mark scheme (`0005_markscheme.sql`)

```sql
create table mark_schemes (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null unique references questions on delete cascade,
  source_paper_id uuid references source_papers,   -- qaysi MS PDF'dan
  scheme_type  scheme_type not null,
  max_marks    int not null check (max_marks > 0),
  guidance_md  text,                               -- 'Accept any valid alternative...'
  status       review_status not null default 'needs_review',
  extract_confidence numeric(3,2),
  prompt_version text,
  reviewed_by  uuid references users,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 'any 3 from 5' kabi guruhlar uchun
create table mark_scheme_groups (
  id             uuid primary key default gen_random_uuid(),
  mark_scheme_id uuid not null references mark_schemes on delete cascade,
  label          text,                            -- 'Any three from:'
  n_required     int not null,                    -- 3
  marks_per_point int not null default 1,
  max_marks      int not null,                    -- guruh cheklovi
  sort_order     int not null default 0
);

create table mark_scheme_points (
  id             uuid primary key default gen_random_uuid(),
  mark_scheme_id uuid not null references mark_schemes on delete cascade,
  group_id       uuid references mark_scheme_groups on delete cascade,
  code           text not null,                   -- 'MP1'
  text           text not null,                   -- ball beriladigan mazmun
  marks          int  not null default 1,
  accept         jsonb not null default '[]',     -- ["cache", "cache memory"]
  reject         jsonb not null default '[]',     -- ["faster" alone]
  requires       jsonb not null default '[]',     -- ["MP1"] — MP2 faqat MP1 bilan
  is_bod         boolean not null default false,  -- benefit of doubt
  sort_order     int not null default 0,
  unique (mark_scheme_id, code)
);

-- levels_of_response (Evaluate savollari uchun)
create table mark_scheme_levels (
  id             uuid primary key default gen_random_uuid(),
  mark_scheme_id uuid not null references mark_schemes on delete cascade,
  level_number   int not null,                    -- 1,2,3
  min_marks      int not null,
  max_marks      int not null,
  descriptor_md  text not null,
  indicative_content_md text
);
```

**Nega bu murakkablik kerak:** Cambridge mark scheme'lari bir xil emas.
`marking.ts` shu strukturadan deterministik ball hisoblaydi — batafsil `04-ai-grading.md` §4.

---

## 6. Job auditi va validatsiya (`0006_jobs.sql`)

> `jobs` jadvali MVP navbati ham, audit tarixi hamdir. Runner `FOR UPDATE SKIP LOCKED`
> bilan bitta queued jobni oladi. Shu sabab Redis yoki alohida queue servisi kerak emas.

```sql
create table jobs (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,                     -- 'ingest_qp','ingest_ms','grade','gen_content','export_pdf'
  ref_table    text,
  ref_id       uuid,
  status       job_status not null default 'queued',
  priority     int not null default 100,
  attempts     int not null default 0,
  max_attempts int not null default 3,
  payload      jsonb not null default '{}',
  idempotency_key text not null unique,
  result       jsonb,
  error        text,
  locked_at    timestamptz,
  locked_by    text,
  scheduled_at timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index on jobs (status, scheduled_at) where status = 'queued';
create index on jobs (ref_table, ref_id);

create table validation_findings (
  id          uuid primary key default gen_random_uuid(),
  rule_code   text not null,                      -- 'V03'
  severity    finding_severity not null,
  ref_table   text not null,                      -- 'questions'
  ref_id      uuid not null,
  message     text not null,
  details     jsonb,
  resolved_at timestamptz,
  resolved_by uuid references users,
  resolution  text,                               -- 'fixed' | 'accepted' | 'false_positive'
  created_at  timestamptz not null default now()
);
create index on validation_findings (ref_table, ref_id) where resolved_at is null;
create index on validation_findings (rule_code, severity) where resolved_at is null;

-- ikkinchi model o'tishi natijasi
create table cross_checks (
  id          uuid primary key default gen_random_uuid(),
  ref_table   text not null,
  ref_id      uuid not null,
  checker_prompt_version text not null,
  agrees      boolean not null,
  disagreement jsonb,                             -- qaysi maydonlarda farq
  confidence  numeric(3,2),
  created_at  timestamptz not null default now()
);
```

---

## 7. Vazifalar (`0007_assignments.sql`)

```sql
create table assignments (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references classes on delete cascade,
  created_by    uuid not null references users,
  title         text not null,
  instructions_md text,
  mode          assignment_mode not null default 'online',
  total_marks   int not null default 0,           -- trigger bilan hisoblanadi
  opens_at      timestamptz,
  due_at        timestamptz,
  time_limit_min int,                             -- mock rejim

  -- mock rejim: nazorat ostidami yoki uydan
  proctored     boolean not null default false,
  session_code  text,                             -- 6 raqam, sinfda o'qituvchi aytadi
  session_opened_at timestamptz,                  -- null bo'lsa attempt boshlanmaydi
  counts_towards_grade boolean not null default true,
  mastery_weight numeric(3,2) not null default 1.0,

  release_policy text not null default 'after_grading',
                -- 'immediate' | 'after_grading' | 'after_due' | 'manual'
  released_at   timestamptz,
  shuffle_questions boolean not null default false,
  allow_late    boolean not null default true,
  published_at  timestamptz,
  archived_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index on assignments (class_id, due_at);

create table assignment_questions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments on delete cascade,
  question_id   uuid not null references questions,
  sort_order    int not null,
  marks_override int,
  unique (assignment_id, question_id)
);

create table submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments on delete cascade,
  student_id    uuid not null references users on delete cascade,
  status        submission_status not null default 'not_started',
  started_at    timestamptz,                      -- ★ FAQAT server yozadi (RPC)
  submitted_at  timestamptz,
  time_spent_s  int not null default 0,

  -- mock rejim nazorati
  active_session_id uuid,                         -- bir vaqtda bitta qurilma
  time_extension_min int not null default 0,      -- o'qituvchi qo'shgan vaqt
  auto_submitted boolean not null default false,  -- cron yopganmi
  integrity_flags jsonb not null default '[]',    -- signal, ayblov emas

  total_score   numeric(6,2),
  total_max     int,
  percentage    numeric(5,2),
  grade         text,                             -- grade_boundaries'dan
  released_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (assignment_id, student_id)
);
create index on submissions (student_id, status);

create table answers (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions on delete cascade,
  question_id   uuid not null references questions,
  kind          answer_kind not null default 'text',
  text          text,
  code          text,
  language      text,                             -- 'python','vbnet','java','pseudocode'
  image_paths   text[] not null default '{}',
  ocr_text      text,
  ocr_confidence numeric(3,2),
  word_count    int,
  updated_at    timestamptz not null default now(),
  unique (submission_id, question_id)
);
```

---

## 8. Baholash (`0008_grading.sql`) — **loyihaning yuragi**

```sql
create table gradings (
  id             uuid primary key default gen_random_uuid(),
  answer_id      uuid not null references answers on delete cascade,
  status         grading_status not null default 'queued',

  -- AI natijasi
  ai_score       numeric(5,2),
  ai_confidence  numeric(3,2),
  ai_feedback_md text,
  ai_raw         jsonb,                           -- to'liq model javobi (debug)
  prompt_version text,
  model          text,
  graded_at_ai   timestamptz,

  -- O'qituvchi
  teacher_score  numeric(5,2),
  teacher_feedback_md text,
  graded_by      uuid references users,
  graded_at      timestamptz,
  override_reason text,

  -- Yakuniy
  final_score    numeric(5,2),
  max_marks      int not null,
  released_at    timestamptz,

  created_at     timestamptz not null default now(),
  unique (answer_id)
);
create index on gradings (status);

-- ★ KALIBRLASH DATASETI ★
create table grading_points (
  id              uuid primary key default gen_random_uuid(),
  grading_id      uuid not null references gradings on delete cascade,
  mark_scheme_point_id uuid not null references mark_scheme_points on delete cascade,

  ai_matched      boolean,
  ai_evidence     text,                           -- o'quvchi javobidan aniq parcha
  ai_reason       text,                           -- nega mos kelmadi
  ai_confidence   numeric(3,2),

  teacher_matched boolean,                        -- o'qituvchi tuzatgan bo'lsa
  changed_by_teacher boolean generated always as
    (teacher_matched is not null and teacher_matched is distinct from ai_matched) stored,

  final_matched   boolean,                        -- coalesce(teacher, ai)
  awarded_marks   numeric(4,2) not null default 0,

  created_at      timestamptz not null default now(),
  unique (grading_id, mark_scheme_point_id)
);
create index on grading_points (mark_scheme_point_id) where final_matched = false;
create index on grading_points (changed_by_teacher) where changed_by_teacher = true;
```

> `grading_points` — bu jadval loyihaning eng qimmatli aktivi. U bir vaqtning o'zida:
> (a) AI sifatini o'lchash dataseti, (b) few-shot misollar manbai,
> (c) o'quvchi feedback'i, (d) "sinf qaysi mark point'ni yo'qotmoqda" analitikasi.
> Uni hech qachon o'chirma yoki qayta yozma — faqat qo'sh.

```sql
-- prompt versiyalari o'rtasida sifatni solishtirish uchun
create table grading_evaluations (
  id             uuid primary key default gen_random_uuid(),
  prompt_version text not null,
  model          text not null,
  sample_size    int not null,
  point_agreement_pct   numeric(5,2),             -- MP darajasidagi mos kelish
  score_exact_pct       numeric(5,2),             -- ball aynan mos
  score_within_1_pct    numeric(5,2),
  mean_abs_error        numeric(4,2),
  false_positive_pct    numeric(5,2),             -- AI ball berdi, o'qituvchi bermadi
  false_negative_pct    numeric(5,2),
  by_command_word jsonb,
  by_topic        jsonb,
  computed_at    timestamptz not null default now()
);
```

---

## 9. Kontent (`0009_content.sql`)

```sql
create table content_items (
  id          uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references subtopics on delete cascade,
  kind        content_kind not null,
  title       text not null,
  body_md     text,
  locale      text not null default 'uz',
  status      review_status not null default 'needs_review',
  version     int not null default 1,
  generated_by text,                              -- 'ai' | 'human'
  prompt_version text,
  reviewed_by uuid references users,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on content_items (subtopic_id, kind, locale);

create table glossary_terms (
  id            uuid primary key default gen_random_uuid(),
  subtopic_id   uuid not null references subtopics on delete cascade,
  term          text not null,
  definition_en text not null,                    -- Cambridge formulasi — o'zgartirilmaydi
  definition_uz text,
  example_md    text,
  source_ref    text,                             -- 'Syllabus 1.1.2' yoki 'MS 9618/12/M/J/23 Q1'
  status        review_status not null default 'needs_review',
  unique (subtopic_id, term)
);

create table flashcard_decks (
  id          uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references subtopics on delete cascade,
  title       text not null,
  locale      text not null default 'uz',
  status      review_status not null default 'needs_review'
);

create table flashcards (
  id          uuid primary key default gen_random_uuid(),
  deck_id     uuid not null references flashcard_decks on delete cascade,
  front_md    text not null,
  back_md     text not null,
  hint_md     text,
  glossary_term_id uuid references glossary_terms,
  source_question_id uuid references questions,   -- past paper'dan olingan bo'lsa
  sort_order  int not null default 0
);

-- SM-2 (EnglishPath'dan qayta ishlatiladi)
create table flashcard_reviews (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users on delete cascade,
  flashcard_id  uuid not null references flashcards on delete cascade,
  ease_factor   numeric(4,2) not null default 2.5,
  interval_days int not null default 0,
  repetitions   int not null default 0,
  lapses        int not null default 0,
  due_at        timestamptz not null default now(),
  last_grade    int,                              -- 0..5
  last_reviewed_at timestamptz,
  unique (user_id, flashcard_id)
);
create index on flashcard_reviews (user_id, due_at);

create table quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items on delete cascade,
  stem_md        text not null,
  options        jsonb not null,                  -- [{"id":"A","text":"..."}]
  correct_ids    text[] not null,
  explanation_md text,
  difficulty     numeric(3,2),                    -- real natijalardan hisoblanadi
  sort_order     int not null default 0
);

create table quiz_attempts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users on delete cascade,
  content_item_id uuid not null references content_items on delete cascade,
  answers        jsonb not null,                  -- {"q1":["A"]}
  score          int not null,
  max_score      int not null,
  duration_s     int,
  created_at     timestamptz not null default now()
);
```

---

## 10. Analitika (`0010_analytics.sql`)

```sql
create table mastery (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references users on delete cascade,
  subtopic_id uuid not null references subtopics on delete cascade,
  score       numeric(4,3) not null default 0,    -- 0..1
  attempts    int not null default 0,
  marks_earned numeric(8,2) not null default 0,
  marks_possible numeric(8,2) not null default 0,
  last_activity_at timestamptz,
  updated_at  timestamptz not null default now(),
  unique (student_id, subtopic_id)
);

-- o'quvchi qaysi MP'ni takror yo'qotmoqda
create table error_patterns (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references users on delete cascade,
  mark_scheme_point_id uuid not null references mark_scheme_points on delete cascade,
  miss_count  int not null default 0,
  hit_count   int not null default 0,
  last_seen_at timestamptz,
  unique (student_id, mark_scheme_point_id)
);

create table grade_boundaries (
  id           uuid primary key default gen_random_uuid(),
  component_id uuid not null references components,
  year         int not null,
  series       exam_series not null,
  grade        text not null,                     -- 'A*','A','B','C','D','E'
  min_mark     int not null,
  unique (component_id, year, series, grade)
);
```

`mastery` va `error_patterns` — `gradings.released_at` o'rnatilganda trigger bilan yangilanadi.
Formula: `09-analytics.md` §2.

---

## 11. Operatsion (`0011_ops.sql`)

```sql
create table ai_calls (
  id            uuid primary key default gen_random_uuid(),
  purpose       text not null,                    -- 'grade','extract_qp','ocr','gen_notes'
  model         text not null,
  prompt_version text,
  ref_table     text, ref_id uuid,
  input_tokens  int, output_tokens int,
  cache_read_tokens int, cache_write_tokens int,
  cost_usd      numeric(10,6),
  latency_ms    int,
  ok            boolean not null default true,
  error         text,
  created_at    timestamptz not null default now()
);
create index on ai_calls (created_at desc);
create index on ai_calls (purpose, created_at desc);

create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references users,
  action     text not null,                       -- 'grading.override','question.approve'
  ref_table  text, ref_id uuid,
  before     jsonb, after jsonb,
  ip         inet,
  created_at timestamptz not null default now()
);
create index on audit_log (ref_table, ref_id, created_at desc);

create table app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references users,
  updated_at timestamptz not null default now()
);
-- boshlang'ich qiymatlar:
-- 'grading.autopilot_enabled'   → false
-- 'grading.confidence_threshold'→ 0.85
-- 'grading.model'               → 'claude-sonnet-4-6'
-- 'ai.monthly_budget_usd'       → 50
```

---

## 12. Authorization qatlami

> ★ **Bu bo'lim v1 dagi RLS o'rnini bosadi va loyihaning eng katta xavf nuqtasi.**
> RLS'ni chetlab o'tib bo'lmasdi. Express middleware tartibini buzish esa mumkin. Shuning uchun
> quyidagi uch qatlam **birgalikda** ishlaydi va uchinchisi avtomatik tekshiriladi.

### 12.1 Uch qatlam

```
1. Middleware   Route darajasida: auth, rol va resurs egaligi
2. Repository   SQL darajasida: har bir so'rov actor bo'yicha scoping qiladi
3. Test         Route coverage + 14 ta authz e2e testi
```

Faqat middleware yetarli emas: servis boshqa servisdan chaqirilsa middleware ishlamaydi.
Faqat repository yetarli emas: xato xabari orqali ma'lumot sizib chiqishi mumkin.

### 12.2 Express middleware

```ts
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', publicAuthRouter);  // login, refresh, invite
app.use('/api/v1', requireAuth);            // bundan keyingi hamma route yopiq

app.use('/api/v1/admin', requireRoles('owner'), adminRouter);
app.use('/api/v1/classes/:classId', requireClassAccess, classRouter);
app.use('/api/v1/submissions/:id', requireSubmissionAccess, submissionRouter);
```

**Default rad etish.** Ochiq routerlar global `requireAuth` dan oldin mount qilinadi.
Qolgan hamma route undan keyin. Ochiq endpointlar faqat `/auth/login`,
`/auth/refresh`, `/auth/redeem-invite`, `/health`.

### 12.3 Repository scoping

Har bir repository metodi `actor: Actor` qabul qiladi:

```ts
interface Actor { id: string; role: UserRole; schoolId: string | null }

async findSubmissions(actor: Actor, assignmentId: string) {
  if (actor.role === 'student') {
    return pool.query('select * from submissions where assignment_id = $1 and student_id = $2',
      [assignmentId, actor.id]);
  }
  return pool.query(teacherScopedSubmissionSql, [assignmentId, actor.id]);
}
```

**Qoida:** `actor` parametrisiz repository metodi mavjud emas. Faqat job runner
ichidagi tizim operatsiyalari `SystemActor` ishlatadi va ular route'dan
chaqirilmaydi.

### 12.4 Ruxsat matritsasi

| Resurs | student | teacher | owner |
|---|---|---|---|
| O'z profili | R/W | R/W | R/W |
| Boshqa profillar | — | maktabdagilar: R | R/W |
| `questions` | faqat o'ziga berilgan vazifadagi + approved mashq | R | R/W |
| `mark_schemes` | **faqat baho `released` bo'lgach** | R | R/W |
| `assignments` | o'z sinfidagi, `published_at` bor | o'z sinflari: R/W | R/W |
| `submissions` | faqat o'ziniki | o'z sinflari | R/W |
| `answers` | o'ziniki, attempt oynasi ichida yozadi | o'z sinflari: R | R |
| `gradings` | o'ziniki, `released_at` bor | o'z sinflari: R/W | R/W |
| `content_items` | `approved`: R | R/W | R/W |
| `flashcard_reviews` | faqat o'ziniki | — | — |
| `ai_calls`, `audit_log`, `app_settings` | — | — | R |

### 12.5 ★ Kritik qoidalar (buzilsa jiddiy)

1. **Mark scheme baho chiqmaguncha o'quvchiga ko'rinmaydi.**
   `questions` endpoint'i o'quvchi uchun `markScheme` maydonini **serializer
   darajasida** olib tashlaydi — "frontend ko'rsatmaydi" yetarli emas.
2. **O'quvchi topshirgandan keyin javobni o'zgartira olmaydi** (§12.7).
3. **O'quvchi `role` maydonini o'zgartira olmaydi** — update DTO'da `role` yo'q.
4. **Xato xabarlari ma'lumot sizdirmaydi:** mavjud bo'lmagan va ruxsat yo'q
   resurs ikkalasi ham `404` qaytaradi, `403` emas.

### 12.6 Majburiy testlar (`test/authz.e2e-spec.ts`)

Bittasi yiqilsa CI to'xtaydi.

1. Student A, Student B javobini o'qiy olmaydi → 404
2. Student topshirmasdan mark scheme'ni ko'ra olmaydi → maydon yo'q
3. Student baho `released` bo'lgunicha `gradings` ni ko'rmaydi → 404
4. Student topshirgandan keyin javobni o'zgartira olmaydi → 409
5. Student attempt muddati tugagach javob yoza olmaydi → 409
6. Teacher B, Teacher A sinfini ko'ra olmaydi → 404
7. Teacher `questions` ni o'zgartira olmaydi → 403
8. Student `ai_calls` ni ko'ra olmaydi → 403
9. Student o'z `role` ini `teacher` ga o'zgartira olmaydi → 400
10. Muddati o'tgan access token rad etiladi → 401
11. Bekor qilingan refresh token rad etiladi → 401
12. Boshqa maktab o'quvchisi sinfga qo'shila olmaydi → 403
13. Student boshqa o'quvchi nomidan submission yarata olmaydi → 403
14. Ishlatilgan taklif kodi qayta ishlamaydi → 410

### 12.7 Route coverage testi

```ts
// backend/src/route-coverage.test.ts
it('faqat ruxsat etilgan public route auth middleware oldidan mount qilingan', () => {
  const routes = discoverAllRoutes(app);
  const unexpectedPublic = routes.filter(r => r.beforeRequireAuth && !PUBLIC_ROUTES.has(r.path));
  expect(unexpectedPublic).toEqual([]);
});
```

Bu unutishning oldini oladigan yagona ishonchli usul. Odam tekshiruviga tayanma.

---

## 12b. Mock imtihon — server-authoritative mantiq

**Tamoyil:** vaqt bilan bog'liq hech narsa mijozga ishonilmaydi. Mijozdagi taymer
faqat *ko'rsatadi*; haqiqat serverda.

### 12b.1 Attempt boshlash — `POST /assignments/:id/attempt`

```ts
async startAttempt(actor: Actor, assignmentId: string, dto: StartAttemptDto) {
  return this.db.transaction(async (tx) => {
    const a = await tx.query.assignments.findFirst(...);
    if (!a?.publishedAt) throw new NotFoundException();
    if (!await this.enrolledIn(actor.id, a.classId)) throw new ForbiddenException();

    // nazorat ostidagi imtihon: o'qituvchi ochmaguncha va kod to'g'ri bo'lmaguncha
    if (a.proctored) {
      if (!a.sessionOpenedAt) throw new ConflictException('session_not_open');
      if (a.sessionCode !== dto.sessionCode) throw new ForbiddenException('bad_session_code');
    }

    // ★ SELECT ... FOR UPDATE — bir vaqtda ikki so'rov ikki attempt yaratmasin
    const existing = await tx.select().from(submissions)
      .where(and(eq(submissions.assignmentId, assignmentId),
                 eq(submissions.studentId, actor.id)))
      .for('update');

    if (existing.length) {
      const s = existing[0];
      if (!['not_started','in_progress'].includes(s.status))
        throw new ConflictException('already_submitted');
      // boshqa qurilmada ochilsa eskisi bekor qilinadi
      if (dto.clientSessionId && s.activeSessionId !== dto.clientSessionId) {
        await tx.update(submissions)
          .set({ activeSessionId: dto.clientSessionId })
          .where(eq(submissions.id, s.id));
        this.events.emit('attempt.session_taken_over', { submissionId: s.id });
      }
      return this.attemptWindow(s, a);       // ★ qayta yangilash YANGI vaqt bermaydi
    }

    const [s] = await tx.insert(submissions).values({
      assignmentId, studentId: actor.id, status: 'in_progress',
      startedAt: sql`now()`,                 // ★ vaqt mijozdan olinmaydi
      activeSessionId: dto.clientSessionId,
    }).returning();
    return this.attemptWindow(s, a);
  });
}
```

Javob: `{ startedAt, deadline, serverNow }`.
`serverNow` — mijoz undan offset hisoblaydi va o'z soatiga tayanmaydi.

### 12b.2 Javob yozish oynasi

Har bir `PUT /submissions/:id/answers/:questionId` da:

```ts
function assertWithinWindow(s: Submission, a: Assignment) {
  if (!['not_started','in_progress'].includes(s.status))
    throw new ConflictException('submission_closed');
  if (a.timeLimitMin == null) return;
  const deadline = addMinutes(s.startedAt, a.timeLimitMin + s.timeExtensionMin);
  if (new Date() > addSeconds(deadline, 10))   // tarmoq kechikishi uchun
    throw new ConflictException('time_expired');
}
```

Mijoz taymerni DevTools'da o'chirsa ham server rad etadi.
**Bu tekshiruv middleware'da emas, servis metodida** — chunki u domen qoidasi.

### 12b.3 Avtomatik yopish — backend scheduler

Backend ichidagi scheduler har daqiqa ishlaydi. Bir nechta backend nusxasi bo'lsa,
PostgreSQL advisory lock faqat bittasiga ishni bajarishga ruxsat beradi:

```ts
await db.update(submissions).set({
  status: 'submitted', submittedAt: sql`now()`, autoSubmitted: true,
}).from(assignments).where(sql`
  assignments.id = submissions.assignment_id
  and submissions.status = 'in_progress'
  and assignments.time_limit_min is not null
  and now() > submissions.started_at
              + (assignments.time_limit_min || ' minutes')::interval
              + (submissions.time_extension_min || ' minutes')::interval
`);
```

Brauzer yopilsa, tarmoq uzilsa ham attempt yopiladi.
Scheduler to'xtasa ham xavf yo'q — §12b.2 baribir yozishni bloklaydi.

### 12b.4 O'qituvchi endpoint'lari

| Endpoint | Vazifa |
|---|---|
| `POST /assignments/:id/session/open` | 6 raqamli kod generatsiya, `session_opened_at` |
| `POST /assignments/:id/session/close` | Yangi attempt'lar to'xtaydi |
| `POST /submissions/:id/grant` | Kech kelganga qo'lda ruxsat |
| `POST /submissions/:id/extend` | Vaqt qo'shish (tarmoq uzilishi) |

Uchalasi `requireClassAccess` middleware va `audit_log` bilan.

### 12b.5 Ikki rejim

| | `proctored = true` (sinfda) | `proctored = false` (uydan) |
|---|---|---|
| Sessiya kodi | Majburiy | Yo'q |
| Taymer | Server-authoritative | Bir xil |
| Bir sessiya | Majburiy | Majburiy |
| Ball jurnaliga | ✓ | ✗ |
| `mastery_weight` | 1.0 | 0.5 |
| Grade beriladi | ✓ | ✗ (faqat foiz) |
| Natijada belgi | "Nazorat ostida" | "Mustaqil mashq" |

Uydagi mock — **mashq**, baholash emas. Buni ochiq aytish aldash motivatsiyasini
yo'qotadi.

### 12b.6 Integrity signallari — bayroq, ayblov emas

`submissions.integrity_flags` ga yoziladi, **hech narsani bloklamaydi**:

| Kod | Shart |
|---|---|
| `fast_answer` | `marks >= 3` savolga < 15 s |
| `long_gap` | Savollar orasida > 10 daqiqa (mock rejimda) |
| `session_switch` | Attempt davomida qurilma o'zgargan |
| `similar_answer` | Bir vazifada boshqa javob bilan >= 0.9 o'xshashlik |

O'qituvchi panelida jim belgi. Qaror odamniki.

> **Qilinmaydi:** fullscreen majburlash, nusxa ko'chirishni bloklash, tab
> almashishda avtomatik topshirish, kamera. Bularning hammasi aylanib o'tiladi,
> noto'g'ri pozitiv beradi va halol o'quvchini jazolaydi.

---

## 13. Trigger'lar

| Trigger | Jadval | Vazifa |
|---|---|---|
| `set_updated_at` | hammasi | `updated_at = now()` |
| `calc_assignment_marks` | `assignment_questions` | `assignments.total_marks` qayta hisoblash |
| `calc_submission_score` | `gradings` (final_score) | submission jami ball + foiz + grade |
| `update_mastery` | `gradings` (released_at) | `mastery` + `error_patterns` yangilash |
| `audit_grading_override` | `gradings` (teacher_score) | `audit_log` ga yozish |
| `validate_question_tree` | `questions` (deferred) | barg/ota constraint → `validation_findings` |
| `question_path_maintain` | `questions` | `path`, `depth`, `display_ref` avtomatik |

---

## 14. Obyekt saqlash (S3-mos)

Local: `backend/storage/` (gitignore). Prod: S3-compatible private storage.

| Prefiks | Mazmun | Kirish |
|---|---|---|
| `source-papers/{sha256}.pdf` | Original QP/MS | Faqat owner |
| `question-assets/{questionId}/{n}.png` | Diagrammalar | Presigned, 1 soat |
| `submissions/{submissionId}/{answerId}/{n}.jpg` | Qo'lyozma rasmlar | Presigned, 1 soat |
| `exports/{exportId}.pdf` | Generatsiya qilingan PDF | Presigned, 24 soat |
| `content/{contentItemId}/...` | Slides, rasmlar | Presigned, 1 soat |

**Bucket public emas.** Frontend hech qachon to'g'ridan-to'g'ri S3 ga bormaydi —
API `GET /files/:key/url` orqali presigned URL beradi va **shu paytda**
authorization tekshiradi. Presigned URL berish — bu ruxsat qarori.

Yuklash ham presigned PUT orqali: `POST /files/upload-url` → API tekshiradi,
URL beradi, mijoz to'g'ridan-to'g'ri S3 ga yuklaydi. Katta fayl API dan o'tmaydi.
