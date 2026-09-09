# Darslar bo‘limi uchun professional dizayn taklifi

## 1. Vazifa va tahlil chegarasi

Ushbu hujjat loyiha ichidagi hozirgi uchta darsni o‘qituvchi dars paytida taqdimot sifatida ishlata oladigan, o‘quvchi esa mustaqil ravishda aniq o‘rganadigan tizimga aylantirish uchun yozildi.

Tahlilda PDF fayllari faqat o‘quv manbasi sifatida ishlatildi. PDF ichidagi ko‘rsatmalar tizim topshirig‘i sifatida qabul qilinmadi.

Loyihada hozir faol bo‘lgan uch bob:

1. Chapter 1 — Information representation
2. Chapter 7 — Algorithm design and problem-solving
3. Chapter 13 — Data representation

Foydalanuvchi Chapter 17 deb yozgan, ammo hozirgi kod va dars katalogida uchinchi dars Chapter 13 hisoblanadi. Quyidagi taklif mavjud Chapter 1, 7 va 13 uchun tuzildi. Agar keyin Chapter 17 ham qo‘shilsa, ayni tizim undan ham foydalanadi.

---

## 2. Asosiy xulosa

Hozirgi muammo rang yoki kartochka shaklida emas. Asosiy muammo dars mazmuni, taqdimot, mustaqil o‘qish va manba auditi bitta uzun ekranga aralashib ketganida.

Professional yechim bitta tekshirilgan mazmun bazasidan uchta alohida ko‘rinish yaratishi kerak:

1. **O‘qish rejimi** — o‘quvchi va o‘qituvchi uchun bobning to‘liq, ketma-ket mazmuni.
2. **Taqdimot rejimi** — sinfda proyektor orqali tushuntirish uchun, har ekranda bitta aniq fikr.
3. **Past Papers rejimi** — ortiqcha interfeyssiz, savolning asl tuzilishi va baholash ma’lumotlari bilan.

Manba to‘liqligi, PDF sahifasi, ichki tekshiruv soni va texnik ID kabi ma’lumotlar alohida **Manba auditi** paneliga ko‘chiriladi. Ular sinf ekranida ko‘rinmaydi.

---

## 3. Hozirgi holat bo‘yicha audit

### 3.1. Mazmun ko‘p, lekin dars shakliga to‘liq aylantirilmagan

Hozirgi ma’lumotlar hajmi katta:

| Bob | Manba hajmi | Asosiy elementlar |
|---|---:|---|
| Chapter 1 | 26 PDF sahifa | 8 worked example, 9 activity, 4 extension activity, 9 figure, 9 table, 6 yakuniy savol |
| Chapter 7 | 41 kitob sahifasi | 7 example, 20 activity, 1 extension, 22 figure, 6 table, 7 Find out more, 9 exam-style question |
| Chapter 13 | 24 PDF sahifa | 9 example, 9 activity, 6 extension activity, 16 figure, 2 table, 5 yakuniy savol |

Loyihada jami 126 sahifalik dars oqimi bor. Ulardan 15 tasi Past Paper, 3 tasi overview, qolganlari mavzu sahifalari. 62 ta sahifa hali asosan manba matniga tayangan va to‘liq pedagogik dars bloklariga aylantirilmagan.

Bu shuni anglatadi: tizim manbani qamrab olganini ko‘rsatishi mumkin, lekin o‘quvchi uchun mazmunning tushunarli, bosqichma-bosqich va sinfda namoyish qilishga tayyor ekanini hali kafolatlamaydi.

### 3.2. “Board mode” taqdimot emas, uzun o‘qish sahifasi

Tekshirilgan Chapter 1 ekranida ko‘rinadigan maydon balandligi 775 piksel bo‘lsa, sahifa mazmuni 6588 pikselga cho‘zilgan. Bu taxminan 8,5 ekranlik vertikal scroll degani.

Sinf taqdimotida o‘qituvchi bir fikrni ko‘rsatishi, tushuntirishi va keyingi fikrga o‘tishi kerak. Hozir esa o‘qituvchi uzun sahifa ichida kerakli joyni qidiradi. Bu dars ritmini buzadi va o‘quvchining e’tiborini bir vaqtning o‘zida juda ko‘p matnga tarqatadi.

### 3.3. Interfeys darsdan ko‘ra ichki auditni ko‘proq ko‘rsatadi

Hozirgi toolbar ichida quyidagiga o‘xshash texnik belgilar ko‘rinadi:

- `879/879 book completeness checks`
- `26/26 uploaded-source pages`
- `Page source evidence`
- sahifa raqami va Board mode boshqaruvlari

Bu ma’lumotlar kontent muharriri uchun foydali. O‘quvchi va sinf uchun esa ular sarlavha maydonini siqadi, diqqatni mazmundan oladi va interfeysni tugallanmagan texnik mahsulotga o‘xshatadi.

### 3.4. Navigatsiya manba sahifalariga juda bog‘langan

`Coursebook page 5`, `Coursebook page 6` kabi nomlar o‘quvchiga shu sahifada nimani o‘rganishini aytmaydi. Fizik PDF sahifasi manba izini saqlash uchun kerak, lekin dars navigatsiyasining asosiy birligi bo‘la olmaydi.

Masalan:

- `Coursebook page 5` o‘rniga `Binary sonni denaryga aylantirish`
- `Coursebook page 11` o‘rniga `Hexadecimal va xotira manzillari`
- `Coursebook page 331` o‘rniga `Floating-point sonni normallashtirish`

PDF sahifa raqami kichik manba yozuvi sifatida qoladi.

### 3.5. Xom transcript o‘quv materialiga aralashgan

Ba’zi “Prior knowledge” qismlarida `Exact source transcript` ko‘rinishidagi PDF parser matni chiqadi. Ikki ustunli kitob sahifalarida parser matn tartibini aralashtirishi mumkin. Bu audit dalili sifatida saqlanishi mumkin, ammo o‘quvchiga tayyor dars sifatida ko‘rsatilmasligi kerak.

### 3.6. Til va vizual ierarxiya bir xil emas

Navigatsiyaning bir qismi o‘zbekcha, sarlavha va topshiriqlarning bir qismi inglizcha, texnik audit matnlari esa yana boshqa uslubda. Ba’zi kichik yorliqlar 12–13 piksel atrofida bo‘lib, proyektorda orqa qatordan o‘qish qiyin.

Atamalar inglizcha qolishi mumkin, chunki imtihon tili inglizcha. Ammo interfeys buyruqlari va tushuntirish tizimi bir xil qoida bilan yozilishi kerak.

### 3.7. Kod qatlamlari dizaynni boshqarishni qiyinlashtirgan

`LessonStudio.tsx` 22 ta CSS faylini import qiladi. `teaching` papkasida 34 ta CSS fayl, 6507 qatordan ortiq stil va 512 ta `!important` ishlatilgan. Bundan tashqari, yettita modul `MutationObserver` va DOM o‘zgartirishlari orqali sahifaga keyinchalik boshqaruv elementlari qo‘shadi.

Natijada:

- bir o‘zgarish boshqa ekranni buzishi mumkin;
- mobil va projector holatlarini barqaror saqlash qiyin;
- React holati bilan haqiqiy DOM holati farqlanishi mumkin;
- eski va yangi dizayn qoidalari bir-birini bosadi.

### 3.8. Aniqlangan kontent xatolari

- Chapter 7 ichida takroriy `h1` sarlavhalar bor.
- Chapter 13, Topic 13.3 ichidagi bir sahifa `File organisation` deb nomlangan; u floating-point mavzusiga noto‘g‘ri biriktirilgan.
- Manba fayllarini tekshiruvchi ikki manifest ayrim fayllar uchun turli SHA qiymatlarini saqlagan. Bitta rasmiy manba-versiya registri kerak.
- Chapter 1 kitobida `MPEG-3 (MP3)` yozuvi bor. Texnik jihatdan MP3 “MPEG Audio Layer III” atamasidan keladi. Manbadagi matnni yashirincha o‘zgartirish o‘rniga, manba iqtibosi yoniga qisqa aniqlik izohi berilishi kerak.

### 3.9. Mobil ko‘rinish to‘liq qayta oqmaydi

390 × 844 o‘lchamda umumiy navigatsiya katta joy egallaydi, dars mazmuni esa chap tomondan siqilgan yoki qirqilgandek ko‘rinadi. Jadval, kod va formula bloklari uchun alohida mobil strategiya yo‘q.

### 3.10. Past Paper holati to‘liq tekshirilmagan qism

Mahalliy audit sessiyasida savollar autentifikatsiya yoki API xatosi sabab yuklanmadi. Shu sabab haqiqiy savol matnining vizual ko‘rinishi to‘liq baholanmadi.

Kod tahlilida esa o‘qituvchi tomonda savollar yil bo‘yicha kartochkalarga ajratilib, keyin DOM orqali dialog ochilishi; o‘quvchi tomonda esa ko‘pincha checkpoint xulosasi va boshqa sahifaga yo‘naltirish borligi ko‘rindi. Bir xil savol uchun o‘qituvchi va o‘quvchi tajribasi ajralib ketgan.

---

## 4. Yangi axborot arxitekturasi

### 4.1. Kontent birligi

Darsni PDF sahifalariga emas, o‘rganish mantiqiga bo‘lish kerak:

`Kurs → Chapter → Topic → Lesson → Teaching beat`

**Teaching beat** — o‘qituvchi bitta kichik bosqichda tushuntira oladigan mazmun birligi. Uning turlari:

- dars maqsadi;
- oldingi bilimni tekshirish;
- yangi tushuncha;
- aniq ta’rif;
- diagramma yoki jadval;
- worked example bosqichi;
- o‘qituvchi bilan mashq;
- mustaqil mashq;
- tezkor tushunish tekshiruvi;
- xulosa;
- imtihon savoli.

Har bir teaching beat quyidagi ma’lumotlarni saqlaydi:

```ts
type TeachingBeat = {
  id: string
  type: BeatType
  title: string
  studentContent: ContentBlock[]
  teacherNote?: string
  sourceRefs: SourceReference[]
  presentationSteps?: PresentationStep[]
  assets?: LessonAsset[]
  accuracyNote?: AccuracyNote
}
```

Bitta kontent modeli uch xil rejimda turlicha ko‘rsatiladi. Shu bilan o‘qituvchi va o‘quvchi bir xil mazmun, bir xil tartib va bir xil misollardan foydalanadi.

### 4.2. To‘rtta aniq vazifa

| Ko‘rinish | Kim uchun | Asosiy vazifa |
|---|---|---|
| Darslar katalogi | O‘qituvchi va o‘quvchi | Bobni topish va kerakli rejimni ochish |
| O‘qish | O‘qituvchi va o‘quvchi | To‘liq mazmunni ketma-ket o‘rganish |
| Taqdimot | O‘qituvchi | Sinfda mazmunni bosqichma-bosqich tushuntirish |
| Past Papers | Ikkalasi | Savolni yechish, javobni tekshirish va tahlil qilish |

Manba auditi beshinchi, ichki vosita bo‘ladi. U darsning asosiy navigatsiyasiga kirmaydi.

---

## 5. Darslar katalogi qanday ko‘rinishi kerak

Hozirgi katta marketing hero qismi olib tashlanadi. Sahifa yuqorisida oddiy `Darslar` sarlavhasi, qidiruv va kurs filtri bo‘ladi.

Boblar kurs bo‘yicha aniq ajratiladi:

- **Cambridge International AS & A Level Computer Science 9618**
- **Cambridge IGCSE / O Level Computer Science 0478**

Bu muhim, chunki loyiha brendi hozir 9618 deb ko‘rinsa ham Chapter 7 boshqa kurs manbasidan kelgan.

Har bir bob qatori quyidagilarni beradi:

- kurs kodi;
- chapter raqami va nomi;
- 2–4 qatorlik mavzu ro‘yxati;
- o‘quvchi progressi;
- `O‘qishni davom ettirish` tugmasi;
- o‘qituvchi uchun `Taqdimotni ochish` tugmasi.

`879/879 checks`, PDF hash va source coverage kabi belgilar katalogda ko‘rinmaydi.

---

## 6. O‘qish rejimi

### 6.1. Desktop tuzilishi

Chapda 240–280 piksel kenglikdagi mazmun xaritasi bo‘ladi. Markazdagi asosiy matn ustuni 760–900 piksel bilan cheklanadi. O‘ng tomonda doimiy panel bo‘lmaydi.

Mazmun xaritasi:

- Topic nomlarini ko‘rsatadi;
- ichida ma’noli Lesson sarlavhalari bo‘ladi;
- tugallangan bosqichni belgilaydi;
- hozirgi joyni aniq ko‘rsatadi;
- yopib qo‘yilishi mumkin.

### 6.2. Dars ichidagi tartib

Har bir kichik dars bir xil pedagogik tartibdan foydalanadi:

1. **Bugun nimani o‘rganamiz?** — 1–3 ta aniq natija.
2. **Oldingi bilim** — bitta qisqa savol yoki eslatma.
3. **Tushuncha** — asosiy ta’rif va tushuntirish.
4. **Ko‘rsatish** — diagramma, jadval yoki konkret misol.
5. **Worked example** — masala, qadamlar, javob va sabab.
6. **Birgalikda bajaramiz** — boshqariladigan mashq.
7. **Mustaqil bajarish** — Activity yoki exam-style task.
8. **Tekshirish** — javob yoki mark scheme dastlab yopiq.
9. **Xulosa** — 3–5 ta asosiy fikr.
10. **Checkpoint** — dars yakuni uchun qisqa baholash.

Bu tartib har bir sahifada hamma blok bo‘lishi shart degani emas. Mazmunga kerak bo‘lgan bloklar tanlanadi, ammo tanlangan bloklarning vizual ma’nosi hamma bobda bir xil qoladi.

### 6.3. Mazmun bloklarining ko‘rinishi

**Ta’rif** oddiy rangli fon va chap chegara bilan ajraladi. Ichida bitta termin va uning izohi bo‘ladi.

**Worked example** quyidagi to‘rt qismdan iborat bo‘ladi:

- Problem
- Steps
- Answer
- Why this works

**Activity** topshiriq, kerakli material, vaqt va javobni ochish tugmasini ko‘rsatadi.

**Exam tip** faqat imtihonda haqiqatan foydali bo‘lgan xatolik yoki command word haqida ma’lumot beradi.

**Source note** kichik, sokin footer bo‘ladi: masalan, `Source: Coursebook p. 331, Fig. 13.14`. U asosiy mazmundan ustun kelmaydi.

### 6.4. Progress qoidasi

Progress PDF sahifasi ochilganiga qarab emas, Lesson va Teaching beat bajarilganiga qarab hisoblanadi.

Dars tugallangan deb hisoblanishi uchun:

- talab qilinadigan tushuncha bloklari ko‘rilgan;
- kerakli activity bajarilgan yoki o‘qituvchi tomonidan o‘tilgan deb belgilangan;
- yakuniy checkpoint topshirilgan;
- o‘quvchi xohlasa `Darsni tugatdim` orqali holatini tasdiqlagan bo‘lishi kerak.

Tizim oxirgi o‘qilgan joyni saqlaydi va qaytishda shu yerga olib keladi.

---

## 7. Taqdimot rejimi

Bu rejim aynan sinf uchun ishlab chiqiladi. U o‘qish sahifasini fullscreen qilish bilan cheklanmaydi.

### 7.1. Ekran tuzilishi

Yuqorida taxminan 56 piksel balandlikdagi sokin panel:

- chapda Chapter va Topic;
- markazda joriy teaching beat nomi;
- o‘ngda `3 / 12`, outline va chiqish tugmasi.

Asosiy maydonda:

- bitta aniq sarlavha;
- bitta tushuncha, diagramma, savol yoki example;
- kerak bo‘lsa bosqichma-bosqich ochiladigan qismlar;
- eng pastda kichik manba yozuvi.

Doimiy chap sidebar bo‘lmaydi. Outline tugmasi bosilganda vaqtincha panel ochiladi.

### 7.2. O‘lcham va sig‘im qoidalari

- asosiy sarlavha: 48–60 px;
- asosiy matn: 28–32 px;
- izoh va metadata: kamida 18–20 px;
- bir ekranda ko‘pi bilan 4 ta asosiy fikr;
- satr uzunligi taxminan 65–75 belgidan oshmaydi;
- bitta ekran 16:9 proyektorda vertikal scroll talab qilmaydi;
- katta jadval bitta kichraytirilgan rasmga aylantirilmaydi, mantiqiy qismlarga bo‘linadi;
- kod va binary qiymatlar monospace shriftda ko‘rsatiladi.

### 7.3. Boshqaruv

- `←` va `→` — oldingi/keyingi beat;
- `Space` — keyingi reveal yoki beat;
- `Esc` — taqdimotdan chiqish;
- progress chizig‘i emas, aniq `3 / 12` ko‘rsatkichi;
- sichqonchasiz to‘liq boshqarish;
- `Prefers reduced motion` yoqilgan bo‘lsa animatsiyasiz o‘tish.

### 7.4. Worked example taqdimoti

Misol birdaniga to‘liq ko‘rinmaydi:

1. masala va berilgan qiymatlar;
2. birinchi qadam;
3. keyingi qadamlar;
4. yakuniy javob;
5. nima sababdan shu yechim to‘g‘ri ekani;
6. o‘quvchiga o‘xshash tezkor savol.

Bu o‘qituvchiga javobni oldindan ochib qo‘ymasdan sinf bilan fikrlash imkonini beradi.

### 7.5. O‘qituvchi eslatmalari

Teacher note proyektorda ko‘rinmaydi. O‘qituvchi uni alohida drawer yoki presenter view ichida ko‘radi:

- qaysi joyda savol berish;
- keng tarqalgan xato;
- taxminiy vaqt;
- qo‘shimcha tushuntirish;
- keyingi beatga o‘tish belgisi.

---

## 8. Past Papers rejimi

Past Papers bob oxiridagi yana bir uzun “page” bo‘lmaydi. U alohida, toza mashq muhiti bo‘ladi.

### 8.1. Savol tanlash

Boshlang‘ich panelda quyidagi filtrlar bo‘ladi:

- Topic;
- paper va variant;
- year va session;
- mark miqdori;
- command word;
- javob berilgan/berilmagan holati.

Savol ochilgandan keyin filtr paneli yopiladi va ekranga xalaqit bermaydi.

### 8.2. Savol ko‘rinishi

Bitta viewportda bitta asosiy savol ko‘rsatiladi. Yuqori satr sodda bo‘ladi:

`9618/32/M/J/24 · Q1(a) · 3 marks`

Keyin:

- kerakli umumiy stem;
- savol matni;
- diagramma yoki jadval;
- o‘quvchi javob maydoni;
- `Javobni tekshirish` yoki o‘qituvchi uchun `Mark scheme’ni ochish`.

Savol kartochka ichidagi boshqa kartochkalarga bo‘linmaydi. Learning objective ID, ichki checkpoint ID va texnik source key asosiy savol yuzasida ko‘rinmaydi.

### 8.3. Mark scheme

Mark scheme dastlab yopiq turadi. Ochilganda:

- har bir mark point alohida qatorda;
- o‘quvchi javobi bilan yonma-yon solishtirish imkoniyati;
- alternative answer yoki examiner note aniq ajratilgan;
- `Men nechta mark oldim?` boshqaruvi;
- keyingi urinish uchun qisqa xulosa.

### 8.4. Exam fidelity talablari

- savol mazmuni qisqartirilmaydi va qayta yozib yuborilmaydi;
- dependent part uchun zarur oldingi stem saqlanadi;
- diagramma o‘lchami va label’lari o‘qiladigan bo‘ladi;
- bo‘sh javob satrlari kerak bo‘lsa saqlanadi;
- paper code, session, year, question number va marks doim ko‘rinadi;
- mark scheme aynan shu savol versiyasi bilan bog‘lanadi.

### 8.5. Xato holati

Foydalanuvchiga `Failed to fetch` kabi texnik matn ko‘rsatilmaydi. Uning o‘rniga:

> Savol hozir yuklanmadi. Internet yoki login holatini tekshirib, qayta urinib ko‘ring.

Pastda `Qayta urinish` va kerak bo‘lsa `Kirish` tugmasi bo‘ladi.

---

## 9. Uch bob uchun konkret kontent rejasi

### 9.1. Chapter 1 — Information representation

Tavsiya etilgan katta darslar:

1. Binary va denary sanoq tizimi
2. Binary arifmetika va overflow
3. Hexadecimal va amaliy qo‘llanish
4. Text representation va character sets
5. Images: pixels, resolution va colour depth
6. Sound: sampling rate va sample resolution
7. Data storage units
8. Compression: lossless va lossy
9. Chapter review va Past Papers

Muhim metodik talablar:

- har bir conversion worked example bosqichma-bosqich ochiladi;
- bit place-value qatori yirik va bir xil tekislikda bo‘ladi;
- image va sound hisoblari formula → substitution → unit → answer tartibida;
- overflow faqat ta’rif emas, register kengligi bilan vizual ko‘rsatiladi;
- MP3 atamasi uchun manba matni va accuracy note ajratiladi.

### 9.2. Chapter 7 — Algorithm design and problem-solving

Tavsiya etilgan katta darslar:

1. Program development life cycle
2. Decomposition
3. Structure diagrams, flowcharts va pseudocode
4. Algorithmsni tushuntirish
5. Standard methods: totals, counting, maximum, minimum, average
6. Validation va verification
7. Test data turlari
8. Trace table va dry run
9. Syntax, logic va runtime errors
10. Algorithm yozish va tuzatish
11. Stack va queue extension
12. Chapter review va Past Papers

Muhim metodik talablar:

- bitta algoritm flowchart, pseudocode va trace table orasida izchil ID bilan bog‘lanadi;
- code blokida line number bo‘ladi;
- trace table kichiklashtirilmaydi, har iteration reveal orqali to‘ldiriladi;
- syntax/logic/runtime error bir xil misolning uch varianti orqali solishtiriladi;
- 20 ta activity dars oqimiga tarqatiladi, bitta uzun sahifaga yig‘ilmaydi.

### 9.3. Chapter 13 — Data representation

Tavsiya etilgan katta darslar:

1. User-defined data types
2. Records va structured data
3. Sequential, random va serial file access
4. Hashing va collision
5. Floating-point mantissa va exponent
6. Denarydan floating pointga o‘tkazish
7. Floating pointdan denaryga o‘tkazish
8. Normalisation
9. Rounding, precision va range
10. Overflow va underflow
11. Chapter review va Past Papers

Muhim metodik talablar:

- `File organisation` sahifasi Topic 13.2 ga qaytariladi;
- mantissa, binary point va exponent rang bilan emas, label va joylashuv bilan ham farqlanadi;
- conversion bir ekranda bitta transformatsiya sifatida ko‘rsatiladi;
- normalisation uchun to‘g‘ri/noto‘g‘ri misollar yonma-yon solishtiriladi;
- range va precision bir xil formatdagi ikkita aniq son bilan tushuntiriladi.

Chapter 13.3 yangi tizim uchun eng yaxshi birinchi pilot hisoblanadi. U formula, jadval, binary qiymat, worked example va ketma-ket reveal kabi eng qiyin holatlarni birgalikda tekshiradi.

---

## 10. Vizual tizim

### 10.1. Ranglar

Rang chapter bezagi uchun tasodifiy almashmaydi. Har bir rang doim bir xil vazifani anglatadi:

| Rang roli | Ishlatilishi |
|---|---|
| Ko‘k | navigatsiya, aktiv holat, fokus |
| Sariq/amber | worked example va muhim qadam |
| Yashil | bajarildi, to‘g‘ri javob, muvaffaqiyat |
| Binafsha | exam practice va Past Paper |
| Qizil | xato, misconception yoki ogohlantirish |
| Oqartirilgan kulrang | sahifa foni va ikkilamchi metadata |

Rang ma’noni yolg‘iz o‘zi yetkazmaydi; icon, sarlavha va label ham ishlatiladi.

### 10.2. Tipografiya

- UI va asosiy matn: `Inter` yoki mavjud sifatli sans-serif;
- code, binary va pseudocode: `JetBrains Mono` yoki shunga teng monospace;
- uzun manba iqtibosi kerak bo‘lsa serif ishlatilishi mumkin;
- all-caps faqat juda qisqa metadata uchun;
- projector rejimida 18 px dan kichik matn bo‘lmaydi.

### 10.3. Shakl va bo‘shliq

- har bir matn alohida kartochkaga solinmaydi;
- asosiy guruhlash uchun bo‘shliq, sarlavha va ingichka divider ishlatiladi;
- radius 6–10 px oralig‘ida;
- shadow faqat overlay yoki faol dialogda;
- pill shakli faqat status va qisqa filter uchun;
- bir sahifada bitta asosiy CTA bo‘ladi.

---

## 11. Til siyosati

Interfeys tili to‘liq o‘zbekcha bo‘ladi:

- `Keyingi`
- `Oldingi`
- `Javobni ochish`
- `Taqdimotni boshlash`
- `Mundarija`
- `Darsni tugatdim`

Cambridge syllabus terminlari inglizcha shaklda saqlanadi va birinchi uchraganda o‘zbekcha izoh beriladi:

> **Validation** — kiritilgan ma’lumot belgilangan qoidalarga mosligini tekshirish.

Savol va mark scheme asl inglizcha shaklda qoladi. Zarur bo‘lsa, o‘qituvchi rejimida alohida `Izoh` ochiladi; asl savol matniga tarjima aralashtirilmaydi.

---

## 12. Accessibility va responsive talablar

Minimal qabul talablari:

- oddiy matn kontrasti kamida 4.5:1;
- klaviatura fokus holati aniq ko‘rinadi;
- interaktiv target kamida 24 × 24 CSS piksel;
- interfeys 320 CSS piksel kenglikda mazmun yo‘qotmasdan qayta oqadi;
- jadvalning o‘zi kerak bo‘lsa lokal gorizontal scroll oladi, butun sahifa emas;
- dialog fokusni ichida ushlab turadi va `Esc` bilan yopiladi;
- semantic heading tartibi saqlanadi;
- rasm va diagrammalarda mazmunli alt yoki matnli izoh bo‘ladi;
- animatsiya kamaytirish sozlamasi qo‘llab-quvvatlanadi;
- rang ko‘rish cheklovida ham statuslar tushunarli qoladi.

Bu talablar WCAG 2.2 kontrast, target size va reflow mezonlariga mos tekshiriladi.

---

## 13. O‘qituvchi va o‘quvchi tajribasi

Ikkala rol bir xil dars mazmunidan foydalanadi. Farq qo‘shimcha boshqaruvlarda bo‘ladi.

O‘qituvchi ko‘radi:

- presenter mode;
- teacher note;
- javob va mark scheme reveal;
- sinf uchun activity timing;
- dars oldidan source audit.

O‘quvchi ko‘radi:

- ayni tushuncha, example va activity tartibi;
- o‘z progressi;
- javob yozish maydoni;
- topshirgandan keyin feedback;
- ayni Past Paper viewer.

O‘quvchiga faqat LO kodlari yoki boshqa sahifaga havola berish yetarli emas. U dars ichidan savolni ochishi, yechishi va tekshirishi kerak.

---

## 14. Kontent to‘liqligini tekshirish

Hozirgi string va fingerprint tekshiruvlari saqlanadi, ammo ular yakka o‘zi “dars tayyor” degan status bermaydi. Oltita alohida sifat darvozasi bo‘ladi:

1. **Source coverage** — barcha kerakli PDF sahifa va elementlar xaritada bor.
2. **Semantic coverage** — definition, example, activity, figure, table va yakuniy savollar to‘liq ko‘chirilgan.
3. **Pedagogical quality** — tushuncha izoh, misol va tekshiruv bilan berilgan.
4. **Presentation fit** — 1920×1080 va 1366×768 da hech bir beat scroll talab qilmaydi.
5. **Exam fidelity** — savol, diagramma, mark va mark scheme versiyasi aynan mos.
6. **Accessibility** — keyboard, contrast, reflow va screen-reader tekshiruvlaridan o‘tgan.

Bob yakuniy qabulida manbadagi barcha element soni hisobga olinadi. Masalan, Chapter 7 tayyor deb belgilanishi uchun 22 figure va 20 activity shunchaki mavjud bo‘lishi emas, kerakli dars ichiga joylashtirilgan va o‘qiladigan holatda bo‘lishi kerak.

---

## 15. Texnik qayta qurish taklifi

### 15.1. Yangi komponentlar

- `LessonLibrary`
- `LessonMap`
- `LessonReader`
- `PresentationPlayer`
- `PastPaperViewer`
- `TeacherNotesPanel`
- `SourceAuditPanel`

### 15.2. Stil tuzilishi

Ko‘plab patch CSS fayllari o‘rniga umumiy tokenlar va vazifaga qarab ajratilgan to‘rtta asosiy stil qatlamidan foydalanish kerak:

- `lesson-shell.css`
- `lesson-reader.css`
- `lesson-presenter.css`
- `past-paper-viewer.css`

`!important` faqat tashqi komponent bilan majburiy konflikt bo‘lsa ishlatiladi. Runtime’da DOM qidirib element qo‘shadigan MutationObserver modullari React komponentlari va aniq state bilan almashtiriladi.

### 15.3. Manba versiyasi

Har bir manba uchun bitta rasmiy registr bo‘ladi:

```ts
type SourceEdition = {
  sourceId: string
  courseCode: string
  title: string
  edition: string
  fileSha256: string
  pageRange: string
  importedAt: string
}
```

Barcha fidelity va completeness tekshiruvlari shu registrga murojaat qiladi. Turli manifestlarda boshqa-boshqa hash saqlanmaydi.

---

## 16. Amalga oshirish ketma-ketligi

### 0-bosqich — aniqlik va barqarorlik

- Chapter 13.3 ichidagi `File organisation` noto‘g‘ri yo‘nalishini tuzatish;
- duplicate headinglarni olib tashlash;
- kurs kodlarini to‘g‘ri ajratish;
- manba registrini birlashtirish;
- UI til qoidalarini belgilash;
- KaTeX dependency va formula renderingni barqarorlashtirish.

### 1-bosqich — kontent modeli

- Chapter → Topic → Lesson → Teaching beat modelini yaratish;
- manba reference’larini saqlash;
- xom transcriptni audit qatlamiga chiqarish;
- 62 ta source-only sahifani strukturali dars bloklariga aylantirish uchun migratsiya xaritasini tuzish.

### 2-bosqich — Chapter 13.3 pilot

- O‘qish va Taqdimot rejimini bir xil kontentdan render qilish;
- formula, binary, worked example, jadval va reveal holatlarini tekshirish;
- 1920×1080, 1366×768 va mobile’da sinash.

### 3-bosqich — qolgan boblar

- Chapter 7.7 trace table orqali algoritm va jadval holatini sinash;
- Chapter 1.1 conversion orqali asosiy tushuncha va mashq oqimini sinash;
- qolgan lessonlarni tasdiqlangan pattern asosida ko‘chirish.

### 4-bosqich — Past Papers

- yagona savol modeli;
- student va teacher uchun bitta viewer;
- mark scheme reveal;
- authentication, retry va offline/error holatlari;
- print va fullscreen.

### 5-bosqich — eski qatlamlarni tozalash

- MutationObserver enhancerlarini olib tashlash;
- takroriy CSS patchlarni o‘chirish;
- legacy `LessonStudio` yo‘llarini yangi komponentlarga o‘tkazish;
- visual regression, accessibility va classroom test.

---

## 17. Audit qilingan foydalanuvchi yo‘llari

| # | Foydalanuvchi yo‘li | Holat |
|---:|---|---|
| 1 | Darslar katalogidan bob topish | Qayta soddalashtirish kerak |
| 2 | Bobga kirib dars xaritasini tushunish | Zaif; sahifa raqamiga ortiqcha bog‘langan |
| 3 | O‘qish rejimida mavzuni o‘rganish | Kontent bor, lekin tuzilish bir xil emas |
| 4 | Board mode’da sinfga tushuntirish | Kritik; uzun scroll va mayda boshqaruvlar bor |
| 5 | Past Paper bo‘limiga kirish | Alohida exam workspace sifatida yetarli emas |
| 6 | Savolni ochish va mark scheme ko‘rish | Lokal API/login sabab to‘liq ko‘rilmadi; kod tuzilishi xavfli |
| 7 | Mobil qurilmada dars o‘qish | Kritik; reflow va joylashuv qayta ishlanishi kerak |

---

## 18. Yakuniy qabul mezoni

Yangi dizayn tayyor deb hisoblanishi uchun o‘qituvchi quyidagi ishni qila olishi kerak:

1. katalogdan bobni ikki bosishdan ko‘p bo‘lmagan yo‘l bilan ochish;
2. dars xaritasida nima o‘tilishi va qancha vaqt ketishini tushunish;
3. taqdimotni fullscreen ochib, klaviatura orqali butun darsni scrollsiz olib borish;
4. javoblarni o‘quvchilardan oldin ko‘rsatmaslik;
5. istalgan payt outline orqali kerakli tushunchaga qaytish;
6. dars oxirida ayni mavzuga mos Past Paper savolini ochish;
7. mark scheme’ni kerakli vaqtda ochish.

O‘quvchi esa:

1. qayerda qolganini darhol ko‘rishi;
2. ta’rif, misol va activity’ni farqlashi;
3. darsni kichik mantiqiy bosqichlarda o‘rganishi;
4. haqiqiy Past Paper savolini sahifani tark etmasdan yechishi;
5. javobini mark scheme bilan solishtirishi;
6. qaysi mavzuni qayta ko‘rishi kerakligini tushunishi kerak.

Shu yechim mavjud PDF mazmunini yo‘qotmaydi. Aksincha, har bir elementni o‘z pedagogik vazifasiga joylashtiradi: kitob to‘liq o‘qish rejimida saqlanadi, sinf taqdimotida kichik tushuntirish bosqichlariga aylanadi, imtihon savollari esa alohida toza ish maydonida ko‘rsatiladi.

## 19. Tashqi mezonlar

- [NSW Education — Cognitive load theory in practice](https://education.nsw.gov.au/about-us/education-data-and-research/cese/publications/practical-guides-for-educators/cognitive-load-theory-in-practice.html)
- [W3C — Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C — Contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [W3C — Target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [W3C — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

