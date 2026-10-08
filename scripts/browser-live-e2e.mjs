import process from 'node:process';
import { createBrowserQA } from './browser-qa.mjs';
import { createLobby, finishRound, joinLobby } from './browser-live-qa.mjs';

const required = [
  'SEED_OWNER_USERNAME',
  'SEED_OWNER_PASSWORD',
  'SEED_STUDENT_PASSWORD',
  'CHROME_EXECUTABLE_PATH',
];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} is required for Live browser E2E`);
}

const baseUrl = process.env.LIVE_E2E_BASE_URL ?? 'http://localhost:5173';
const outputDir = process.env.LIVE_E2E_OUTPUT_DIR ?? 'output/live-browser-e2e';
const targetRef = '9618/11/M/J/26 Q1(a)';

const qa = await createBrowserQA({
  baseUrl,
  executablePath: process.env.CHROME_EXECUTABLE_PATH,
  outputDir,
});

function observe(page, label) {
  page.on('pageerror', (error) => {
    qa.report.pageErrors.push({ label, error: error.message, route: new URL(page.url()).hash });
    qa.save();
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().includes('/api/')) {
      qa.report.httpErrors.push({
        label,
        path: new URL(response.url()).pathname,
        status: response.status(),
      });
      qa.save();
    }
  });
}

try {
  const teacher = await qa.login(
    process.env.SEED_OWNER_USERNAME,
    process.env.SEED_OWNER_PASSWORD,
    'Teacher',
  );
  const students = [];
  for (const index of [1, 2, 3]) {
    students.push(await qa.login(
      `student${String(index).padStart(2, '0')}`,
      process.env.SEED_STUDENT_PASSWORD,
      `Student ${index}`,
    ));
  }

  await students[0].page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });

  const classes = await teacher.page.evaluate(async () => {
    const { api } = await import('/src/lib/api.ts');
    return api('/classes');
  });
  const classId = classes.data.find((item) => item.name === '10-A CS')?.id ?? classes.data[0]?.id;
  await qa.check('Live E2E: seeded class is visible to teacher', Boolean(classId));

  const eligibility = await teacher.page.evaluate(async ({ classId }) => {
    const { api } = await import('/src/lib/api.ts');
    const options = await api('/questions/filter-options');
    const topic = options.topics.find((item) =>
      item.syllabus_code === '9618' && Number(item.topic_number) === 1);
    if (!topic) return { topicId: null, refs: [], count: 0 };
    const params = new URLSearchParams({
      classId,
      topicIds: topic.topic_id,
      subtopicIds: '',
      includeDiagrams: 'true',
      excludeSeen: 'false',
      limit: '30',
    });
    const result = await api(`/live-exams/eligible-questions?${params}`);
    return {
      topicId: topic.topic_id,
      refs: result.data.map((item) => item.displayRef),
      count: result.data.length,
    };
  }, { classId });
  console.log('Live E2E eligible refs:', eligibility.refs.join(', ') || '(empty)');
  await qa.check(
    `Live E2E: eligible pool contains ${targetRef}`,
    eligibility.refs.includes(targetRef),
    eligibility,
  );

  const title = `Live browser E2E ${Date.now()}`;
  const { id, code } = await createLobby(qa, teacher, {
    classId,
    mode: 'teacher',
    title,
    questionCount: 1,
    timeLimit: '',
    displayRef: targetRef,
    excludeSeen: false,
  });
  await qa.check('Live E2E: session and join code created', Boolean(id) && /^\d{6}$/.test(code ?? ''));

  const projector = await teacher.context.newPage();
  observe(projector, 'Projector');
  await projector.goto(baseUrl, { waitUntil: 'networkidle2' });
  await projector.waitForSelector('.shell', { timeout: 45000 });
  await qa.go(projector, `oqitish/live?id=${id}&projector=1`);
  await qa.waitText(projector, 'JOIN CODE');
  await qa.waitText(projector, code);
  await qa.check(
    'Live E2E: projector lobby shows the session join code',
    await projector.evaluate((expected) => document.body.innerText.includes(expected), code),
  );

  for (const student of students) {
    await joinLobby(qa, student, code);
    await qa.waitText(student.page, 'XONAGA QO‘SHILDINGIZ');
  }
  await qa.waitText(teacher.page, '3 qo‘shildi');
  await qa.waitText(projector, '3 o‘quvchi qo‘shildi');
  await qa.screenshot(projector, '01-projector-lobby');

  await qa.clickText(teacher.page, 'O‘yinni boshlash');
  await qa.waitText(teacher.page, 'Savol ochiq');
  await qa.waitText(projector, targetRef);
  await qa.waitText(projector, 'Define the term binary number system.');
  for (const student of students) {
    await qa.waitText(student.page, targetRef);
    await qa.waitText(student.page, 'Define the term binary number system.');
  }

  await qa.check(
    'Live E2E: projector question fits the page without document-level horizontal overflow',
    await projector.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
  );
  await qa.check(
    'Live E2E: mobile student question fits the page without document-level horizontal overflow',
    await students[0].page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
  );
  await qa.check(
    'Live E2E: canonical source failure banner is absent for ready fixture',
    await projector.evaluate(() => !document.querySelector('.structured-question-invalid')),
  );
  await qa.screenshot(projector, '02-projector-question');
  await qa.screenshot(students[0].page, '03-student-mobile-question');

  for (const [index, student] of students.entries()) {
    await qa.fill(student.page, '#live-answer', `Uses base 2 and digits 0 and 1. QA learner ${index + 1}.`);
    await qa.clickText(student.page, 'Javobni topshirish');
    await qa.waitText(student.page, 'Topshirildi ✓');
  }
  await teacher.page.waitForFunction(
    (count) => document.querySelector('.live-submit-stat progress')?.value === count,
    { polling: 100 },
    students.length,
  );
  await qa.check('Live E2E: all three learner answers reached the teacher', true);

  await qa.clickText(teacher.page, 'Javoblarni yopish va MSni ochish');
  await qa.waitText(teacher.page, 'BAHOLASH');
  await qa.waitText(projector, 'OFFICIAL MARK SCHEME');
  await qa.screenshot(projector, '04-projector-mark-scheme');

  const final = await finishRound(qa, teacher, students, id, 'teacher', async () => {
    await projector.waitForSelector('.live-projector-overlay', { timeout: 45000 });
    await qa.screenshot(projector, '05-projector-review');
  });

  await qa.waitText(projector, 'Sessiya yakunlandi');
  await qa.screenshot(projector, '06-projector-finished');
  await qa.check(
    'Live E2E: final report contains three learner rows',
    final.report.rows.length === students.length,
    { rows: final.report.rows.length },
  );

  const unexpectedHttpErrors = qa.report.httpErrors.filter(
    (entry) => !(entry.path === '/api/v1/auth/refresh' && entry.status === 401),
  );
  await qa.check(
    'Live E2E: no browser page errors',
    qa.report.pageErrors.length === 0,
    { errors: qa.report.pageErrors },
  );
  await qa.check(
    'Live E2E: no unexpected API HTTP errors',
    unexpectedHttpErrors.length === 0,
    { errors: unexpectedHttpErrors },
  );
} finally {
  await qa.finish();
}
