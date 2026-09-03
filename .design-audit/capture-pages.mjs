import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT_DIR = process.argv[2] ?? '.design-audit/before';
mkdirSync(OUT_DIR, { recursive: true });

const now = (daysAgo = 0) => new Date(Date.now() - daysAgo * 86400000).toISOString();

const CLASSES = () => ({ data: [
  { id: 'a', name: '9618/1A', grade: 11, level: 'AS', academicYear: '2026/2027', studentCount: 18 },
  { id: 'b', name: '9618/1B', grade: 11, level: 'AS', academicYear: '2026/2027', studentCount: 17 },
  { id: 'c', name: '9618/2A', grade: 12, level: 'A2', academicYear: '2026/2027', studentCount: 16 },
  { id: 'd', name: '9618/2B', grade: 12, level: 'A2', academicYear: '2026/2027', studentCount: 15 },
] });

const ASSIGNMENTS = () => ({ data: [
  { id: 'as1', classId: 'a', title: 'Topic 3 — Hardware asoslari', mode: 'online', className: '9618/1A', totalMarks: 24, opensAt: now(5), dueAt: now(-2), timeLimitMin: 40, publishedAt: now(5), submissionStatus: 'submitted', classSize: 18, submittedCount: 14, pendingGrading: 3 },
  { id: 'as2', classId: 'b', title: 'Paper 2 — Algoritm mashqlari', mode: 'mock', className: '9618/1B', totalMarks: 75, opensAt: now(3), dueAt: now(-6), timeLimitMin: 90, publishedAt: now(3), submissionStatus: 'in_progress', classSize: 17, submittedCount: 5, pendingGrading: 0 },
  { id: 'as3', classId: 'a', title: '1.1 Information representation', mode: 'pdf', className: '9618/1A', totalMarks: 12, opensAt: now(1), dueAt: now(-3), timeLimitMin: null, publishedAt: now(1), submissionStatus: 'not_started', classSize: 18, submittedCount: 0, pendingGrading: 0 },
] });

const RESULTS = () => ({ data: [
  { id: 'r1', title: 'Topic 3 — Hardware asoslari', className: '9618/1A', studentName: 'S. Haydarov', totalScore: 18, totalMax: 24, percentage: 75, grade: 'B', releasedAt: now(1) },
  { id: 'r2', title: '1.1 Information representation', className: '9618/1A', studentName: 'S. Haydarov', totalScore: 9, totalMax: 12, percentage: 75, grade: 'B', releasedAt: now(2) },
] });

const MASTERY = () => ({ data: [
  { subtopic_id: '1.1.1', code: '1.1.1', title: 'Binary va hexadecimal', score: 0.82, attempts: 4, marksEarned: 28, marksPossible: 34, practiceReady: true, practiceQuestionCount: 8 },
  { subtopic_id: '1.1.2', code: '1.1.2', title: 'Data storage units', score: 0.55, attempts: 2, marksEarned: 11, marksPossible: 20, compatibilityMapped: true, practiceReady: true, practiceQuestionCount: 6 },
  { subtopic_id: '1.2.3', code: '1.2.3', title: 'Rasm va ovoz fayllari', score: 0.9, attempts: 6, marksEarned: 45, marksPossible: 50 },
] });

const COMMAND_WORDS = () => ({ data: [
  { commandWord: 'Explain', percentage: 62, sampleSize: 14 },
  { commandWord: 'Describe', percentage: 78, sampleSize: 11 },
  { commandWord: 'State', percentage: 91, sampleSize: 23 },
  { commandWord: 'Calculate', percentage: 70, sampleSize: 9 },
] });

const FLASHCARDS = () => ({ data: [
  { flashcard_id: 'f1', front_md: '**Bit** nima?', back_md: 'Eng kichik ma\'lumot birligi — 0 yoki 1 qiymat.', hint_md: 'Binary digit' },
  { flashcard_id: 'f2', front_md: '1 **byte** nechta bit?', back_md: '8 bit.', hint_md: null },
] });

const GAMES = () => ({ data: {
  termMatch: [
    { id: 't1', term: 'Volatile memory', definition: 'Quvvat uzilganda ma\'lumot yo\'qoladigan xotira' },
    { id: 't2', term: 'Cache', definition: 'Tez-tez ishlatiladigan ma\'lumotni saqlovchi tezkor xotira' },
  ],
  sequence: [
    { id: 's1', code: 'Fetch', text: 'Buyruq xotiradan olinadi' },
    { id: 's2', code: 'Decode', text: 'Buyruq tahlil qilinadi' },
    { id: 's3', code: 'Execute', text: 'Buyruq bajariladi' },
  ],
  spotTheGap: [
    { id: 'g1', prompt: 'CPU ichidagi tezkor kichik xotira ______ deb ataladi.', answer: 'cache' },
  ],
} });

const OVERVIEW = () => ({
  waiting: { pendingUsers: 3, reviewQueue: 12, openAppeals: 5 },
  corpus: {
    ingestedPapers: 168, totalPapers: 192, questions: 1846, markSchemes: 168, markPoints: 6420,
    recent: [
      { label: 'May/June 2025 · Paper 22', questions: 12, marks: 75, status: 'reviewed' },
      { label: 'May/June 2025 · Paper 42', questions: 15, marks: 75, status: 'needs_review' },
    ],
  },
  syllabus: { topics: 12, subtopics: 64, objectives: 214, coverage: [
    { band: 'AS', percent: 86, subtopics: 31 },
    { band: 'A2', percent: 74, subtopics: 33 },
  ] },
  spend: { monthUsd: 18.42, calls: 2840, unpriced: 0 },
  blockers: [],
});

const CORPUS = () => ({
  papers: [
    { id: 'p1', label: '2025 M/J · Paper 21', year: 2025, series: 'M/J', component: 2, variant: 1, hasMarkScheme: true, questions: 12, leaves: 15, needsReview: 0, state: 'reviewed', error: null },
    { id: 'p2', label: '2025 M/J · Paper 22', year: 2025, series: 'M/J', component: 2, variant: 2, hasMarkScheme: true, questions: 12, leaves: 14, needsReview: 2, state: 'needs_review', error: null },
    { id: 'p3', label: '2024 O/N · Paper 41', year: 2024, series: 'O/N', component: 4, variant: 1, hasMarkScheme: false, questions: 0, leaves: 0, needsReview: 0, state: 'running', error: null },
    { id: 'p4', label: '2023 M/J · Paper 12', year: 2023, series: 'M/J', component: 1, variant: 2, hasMarkScheme: true, questions: 14, leaves: 18, needsReview: 0, state: 'reviewed', error: null },
    { id: 'p5', label: '2022 O/N · Paper 43', year: 2022, series: 'O/N', component: 4, variant: 3, hasMarkScheme: false, questions: 0, leaves: 0, needsReview: 0, state: 'failed', error: 'PDF sahifasi topilmadi' },
  ],
  totals: { reviewed: 140, needs_review: 18, running: 3, failed: 2, queued: 5, not_started: 24 },
  findings: [
    { code: 'V14', severity: 'high', open: 7 },
    { code: 'V06', severity: 'medium', open: 3 },
  ],
});

const REVIEW_QUEUE = () => ({ data: [
  {
    id: 'q1', display_ref: '2025 M/J · Paper 22 · Q4(b)', stem_md: 'Explain why a **router** is needed when a local network connects to the internet.',
    context_md: null, marks: 2, command_word: 'Explain', answer_kind: 'text', answer_lines: 4,
    extract_confidence: 0.76, storage_path: '9618/2025/mj/22/qp/q4.png',
    findings: [{ id: 'f1', code: 'V14', severity: 'high', message: 'Stem oxirida ball tokeni yo‘q' }],
  },
] });

const QUALITY = () => ({
  extraction: {
    meanConfidence: 0.913, lowConfidence: 6, total: 1846,
    crossChecks: { total: 210, agreed: 196, disagreed: 14, agreementPct: 93 },
    disagreements: [
      { field: 'marks', severity: 'medium', count: 6 },
      { field: 'command_word', severity: 'low', count: 8 },
    ],
  },
  grading: {
    evaluations: [{
      promptVersion: 'grade-answer.v3', model: 'claude-sonnet', sampleSize: 64,
      pointAgreementPct: 88, falsePositivePct: 4, falseNegativePct: 8, computedAt: now(2),
    }],
    teacherCheckedPoints: 312,
  },
  promptVersions: [
    { purpose: 'grade-answer', promptVersion: 'grade-answer.v3', calls: 1280, failed: 12 },
    { purpose: 'extract-qp', promptVersion: 'extract-question.v4', calls: 340, failed: 0 },
  ],
});

const SYSTEM = () => ({
  settings: [
    { key: 'ai.monthly_budget_usd', value: 40, updatedAt: now(4) },
    { key: 'grading.autopilot_enabled', value: false, updatedAt: now(6) },
    { key: 'grading.confidence_threshold', value: 0.85, updatedAt: now(6) },
    { key: 'grading.model', value: 'claude-sonnet-4-5', updatedAt: now(9) },
  ],
  budget: { monthlyUsd: 40, spentUsd: 18.42, remainingUsd: 21.58, percentUsed: 46 },
  spendByPurpose: [
    { purpose: 'baholash', calls: 1280, usd: 9.85, failed: 12, unpriced: 0 },
    { purpose: 'ekstraksiya', calls: 340, usd: 3.1, failed: 0, unpriced: 0 },
    { purpose: 'cross-check', calls: 210, usd: 2.4, failed: 1, unpriced: 0 },
  ],
  recentFailures: [],
  audit: [
    { id: 'au1', action: 'settings.update', refTable: 'settings', createdAt: now(4), actor: 'owner@example.com' },
    { id: 'au2', action: 'grading.recompute', refTable: 'grading', createdAt: now(2), actor: 'owner@example.com' },
  ],
});

const APPS = { classes: CLASSES, assignments: ASSIGNMENTS, results: RESULTS, mastery: MASTERY, 'command-words': COMMAND_WORDS };

/** Route targets: which signed-in role + which route to open, and whether auth should succeed. */
const TARGETS = [
  { name: '01-login', role: 'none', route: '', theme: 'light' },
  { name: '02-dashboard-light', role: 'owner', route: '#boshqaruv/holat', theme: 'light' },
  { name: '03-dashboard-dark', role: 'owner', route: '#boshqaruv/holat', theme: 'dark' },
  { name: '04-corpus', role: 'owner', route: '#boshqaruv/korpus', theme: 'light' },
  { name: '05-quality', role: 'owner', route: '#boshqaruv/sifat', theme: 'light' },
  { name: '06-system', role: 'owner', route: '#boshqaruv/tizim', theme: 'dark' },
  { name: '07-lessons', role: 'teacher', route: '#oqitish/darslar', theme: 'light' },
  { name: '08-student-home', role: 'student', route: '#oquvchi/uy', theme: 'light' },
  { name: '09-student-results', role: 'student', route: '#oquvchi/natijalar', theme: 'dark' },
  { name: '10-dashboard-mobile', role: 'owner', route: '#boshqaruv/holat', theme: 'light', mobile: true },
  { name: '11-student-home-mobile', role: 'student', route: '#oquvchi/uy', theme: 'light', mobile: true },
];

const USER = {
  owner: { id: 'owner-1', fullName: 'S. Haydarov', role: 'owner', schoolId: 'school-1' },
  teacher: { id: 'teacher-1', fullName: 'D. Yusupova', role: 'teacher', schoolId: 'school-1' },
  student: { id: 'student-1', fullName: 'A. Karimov', role: 'student', schoolId: 'school-1' },
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run', '--disable-gpu'] });
const page = await browser.newPage();
const errors = [];
page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));

let sessionUser = USER.owner;
const CORS_HEADERS = {
  'access-control-allow-origin': 'http://localhost:5173',
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};
await page.setRequestInterception(true);
page.on('request', (request) => {
  const url = new URL(request.url());
  const path = url.pathname;
  if (!path.startsWith('/api/v1/')) return request.continue();
  const route = path.replace('/api/v1', '');
  let status = 200;
  let body = { data: [] };
  if (route === '/auth/refresh') {
    if (sessionUser === null) {
      status = 401;
      body = { error: { code: 'unauthenticated', message: 'Kirish kerak.' } };
    } else {
      body = { accessToken: 'visual-check-token', user: sessionUser };
    }
  } else if (route === '/classes') body = CLASSES();
  else if (route === '/assignments') body = ASSIGNMENTS();
  else if (route === '/results') body = RESULTS();
  else if (route === '/analytics/mastery') body = MASTERY();
  else if (route === '/analytics/command-words') body = COMMAND_WORDS();
  else if (route === '/content/flashcards/due') body = FLASHCARDS();
  else if (route === '/content/games') body = GAMES();
  else if (route === '/grading/queue' || route === '/grading/appeals' || route === '/exports' || route === '/questions' || route === '/selections') body = { data: [] };
  else if (route === '/admin/overview') body = OVERVIEW();
  else if (route === '/admin/corpus') body = CORPUS();
  else if (route === '/admin/quality') body = QUALITY();
  else if (route === '/admin/system') body = SYSTEM();
  else if (route === '/ingestion/review') body = REVIEW_QUEUE();
  else if (route.startsWith('/lesson-checkpoints')) body = { data: [] };
  else if (route.startsWith('/admin/users') || route.startsWith('/classes/unassigned-students') || route.startsWith('/classes/')) body = { data: [], users: [], students: [] };
  request.respond({ status, contentType: 'application/json', headers: CORS_HEADERS, body: JSON.stringify(body) });
});

const manifest = [];
for (const target of TARGETS) {
  sessionUser = target.role === 'none' ? null : USER[target.role];
  await page.setViewport({ width: target.mobile ? 390 : 1440, height: target.mobile ? 844 : 1024, deviceScaleFactor: 1 });
  await page.evaluate((theme) => {
    try {
      localStorage.setItem('campath:theme', theme);
      document.documentElement.dataset.theme = theme;
    } catch { /* first navigation */ }
  }, target.theme);
  const file = `.design-audit/${OUT_DIR.replace('.design-audit/', '')}/${target.name}.png`;
  const url = `http://localhost:5173/${target.route}`;
  // A hash-only change is a same-document navigation: the app would keep the
  // previous target's session. Always reload so auth re-runs for this target.
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'networkidle0' });
  // Force the theme attribute after navigation as well; React may not own it.
  await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, target.theme);
  try {
    await page.waitForSelector('.shell', { timeout: 8000 });
  } catch {
    // Signed-out login page has no shell; wait for any visible text instead.
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  await new Promise((resolve) => setTimeout(resolve, 700));
  await page.screenshot({ path: file });
  const probe = await page.evaluate(() => ({
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 140),
    shell: Boolean(document.querySelector('.shell')),
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    fonts: [...new Set([...document.fonts].map((f) => f.family))].slice(0, 6),
  }));
  manifest.push({ name: target.name, file, role: target.role, route: target.route, theme: target.theme, mobile: Boolean(target.mobile), ...probe });
  console.log('captured', file);
}

writeFileSync(`${OUT_DIR}-manifest.json`, JSON.stringify(manifest, null, 2));
writeFileSync(`${OUT_DIR}/browser-errors.json`, JSON.stringify(errors, null, 2));
console.log('errors:', errors.length ? JSON.stringify(errors, null, 2) : 'none');
await browser.close();
