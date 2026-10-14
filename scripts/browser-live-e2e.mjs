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
  // Full-schema SQL acceptance: execute both Automatic Fixed and Balanced
  // against the real approved question pool. The abbreviated lifecycle
  // fixture deliberately omits source_papers, hence cannot execute this SQL.
  const orderModes=await teacher.page.evaluate(async(classId)=>{
    const {api}=await import('/src/lib/api.ts');
    const result=[];
    for(const mode of ['fixed','balanced']){
      const created=await api('/live-exams',{
        method:'POST',
        headers:{'Idempotency-Key':crypto.randomUUID()},
        body:JSON.stringify({
          classId,title:`Ordering ${mode} acceptance`,
          topicIds:[],subtopicIds:[],coursebookSectionCodes:['1.1','2.1'],
          questionCount:1,markingMode:'teacher',includeDiagrams:true,
          excludeSeen:false,questionOrder:mode,
        }),
      });
      const saved=await api(`/live-exams/${created.id}`);
      result.push({
        mode,questionCount:saved.session.questionCount,
        refs:saved.questions.map(row=>row.displayRef),
        questionOrder:saved.session.settings.questionOrder,
      });
      await api(`/live-exams/${created.id}/cancel`,{
        method:'POST',
        headers:{'Idempotency-Key':crypto.randomUUID()},
        body:JSON.stringify({expectedVersion:saved.session.version}),
      });
    }
    return result;
  },classId);
  await qa.check('Live E2E: full-schema Balanced and Fixed creation SQL executes with frozen source question',
    orderModes.length===2 && orderModes.every(row=>
      row.questionCount===1 && row.refs.includes(targetRef) && row.mode===row.questionOrder),
    orderModes);

  await teacher.page.waitForSelector('.live-lobby-order-preview ol li',{timeout:30000});
  const savedOrder=await teacher.page.evaluate(async sessionId=>{
    const {api}=await import('/src/lib/api.ts');
    const payload=await api(`/live-exams/${sessionId}`);
    return {server:payload.questions.map(item=>item.displayRef),
      browser:[...document.querySelectorAll('.live-lobby-order-preview ol li strong')]
        .map(node=>node.textContent?.trim())};
  },id);
  await qa.check('Live E2E: teacher lobby previews exactly the frozen saved question order',
    savedOrder.server.length===1&&JSON.stringify(savedOrder.server)===JSON.stringify(savedOrder.browser)
      &&savedOrder.server.includes(targetRef),savedOrder);
  await qa.screenshot(teacher.page,'00-teacher-saved-order-before-start');

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
  await qa.check('Live E2E: projector never receives teacher-only saved question order',
    await projector.evaluate(()=>!document.querySelector('.live-lobby-order-preview')));

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

  await qa.check('Live E2E: active join code remains visible to teacher',
    await teacher.page.$eval('.live-active-join strong',el=>el.textContent?.trim())===code);
  await qa.check('Live E2E: active join code remains visible on projector',
    await projector.$eval('.live-projector-join strong',el=>el.textContent?.trim())===code);
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
  const projectorPayload = await teacher.page.evaluate(async (sessionId) => {
    const { api } = await import('/src/lib/api.ts');
    return api(`/live-exams/${sessionId}/projector`);
  }, id);
  await qa.check(
    'Live E2E: projector snapshot omits learner roster, answers, reviews and report payloads',
    Array.isArray(projectorPayload.participants) && projectorPayload.participants.length === 0
      && Array.isArray(projectorPayload.teacherAnswers) && projectorPayload.teacherAnswers.length === 0
      && projectorPayload.ownAnswer === null
      && projectorPayload.review === null
      && projectorPayload.report === null,
    {
      participants: projectorPayload.participants?.length,
      teacherAnswers: projectorPayload.teacherAnswers?.length,
      hasOwnAnswer: projectorPayload.ownAnswer !== null,
      hasReview: projectorPayload.review !== null,
      hasReport: projectorPayload.report !== null,
    },
  );
  await qa.check(
    'Live E2E: projector snapshot does not expose the database session UUID',
    projectorPayload.session?.id !== id && !JSON.stringify(projectorPayload).includes(id),
    { projectorSessionId: projectorPayload.session?.id },
  );
  await qa.screenshot(projector, '02-projector-question');
  await qa.screenshot(students[0].page, '03-student-mobile-question');

  // LG-P1-04: keep a learner's draft durable when answer autosave is
  // temporarily unreachable, recover it after reload, and fail visibly when a
  // second tab edits the same answer.
  const firstStudent = students[0];
  const blockedAutosave = (request) => {
    const url = new URL(request.url());
    if (request.method() === 'PUT' && url.pathname === `/api/v1/live-exams/${id}/answer`) {
      void request.abort('failed');
      return;
    }
    void request.continue();
  };
  await firstStudent.page.setRequestInterception(true);
  firstStudent.page.on('request', blockedAutosave);
  const firstTabAnswer = 'Uses base 2 and digits 0 and 1. QA learner 1 offline draft.';
  await qa.fill(firstStudent.page, '#live-answer', firstTabAnswer);
  await firstStudent.page.waitForFunction((sessionId) =>
    Object.entries(localStorage).some(([key, raw]) => {
      if (!key.startsWith('campath:live-draft:v1:') || !key.includes(`:${sessionId}:`)) return false;
      try { return JSON.parse(raw).text === 'Uses base 2 and digits 0 and 1. QA learner 1 offline draft.'; } catch { return false; }
    }), { timeout: 10000 }, id);
  const localDraft = await firstStudent.page.evaluate((sessionId) => {
    const entries = Object.entries(localStorage)
      .filter(([key]) => key.startsWith('campath:live-draft:v1:') && key.includes(`:${sessionId}:`));
    return entries.map(([key, raw]) => ({ key, value: JSON.parse(raw) }));
  }, id);
  await qa.check(
    'Live E2E: failed autosave leaves one versioned per-user/session/question draft',
    localDraft.length === 1 && localDraft[0]?.value?.version === 1 && localDraft[0]?.value?.text === firstTabAnswer,
    localDraft,
  );

  await firstStudent.page.reload({ waitUntil: 'networkidle2' });
  await firstStudent.page.waitForSelector('#live-answer', { timeout: 45000 });
  await qa.check(
    'Live E2E: local draft survives reload before server acknowledgement',
    await firstStudent.page.$eval('#live-answer', (el) => el.value) === firstTabAnswer,
  );

  const secondTab = await firstStudent.context.newPage();
  observe(secondTab, 'Student 1 second tab');
  await secondTab.setRequestInterception(true);
  secondTab.on('request', blockedAutosave);
  await secondTab.goto(baseUrl, { waitUntil: 'networkidle2' });
  await secondTab.waitForSelector('.shell', { timeout: 45000 });
  await qa.go(secondTab, `oquvchi/live?id=${id}`);
  await secondTab.waitForSelector('#live-answer', { timeout: 45000 });
  await qa.check(
    'Live E2E: second tab sees the same pending local draft',
    await secondTab.$eval('#live-answer', (el) => el.value) === firstTabAnswer,
  );
  await qa.fill(secondTab, '#live-answer', `${firstTabAnswer} changed in tab B`);
  await qa.waitText(firstStudent.page, 'Ikki tabdagi javob farq qiladi');
  await qa.check(
    'Live E2E: unresolved two-tab conflict blocks submit and preserves tab A text',
    await firstStudent.page.$eval('#live-answer', (el) => el.value) === firstTabAnswer
      && await firstStudent.page.$eval('.live-answer-box button', (el) => el.disabled),
  );

  secondTab.off('request', blockedAutosave);
  await secondTab.setRequestInterception(false);
  await secondTab.close();
  firstStudent.page.off('request', blockedAutosave);
  await firstStudent.page.setRequestInterception(false);
  await qa.clickText(firstStudent.page, 'Bu tabdagi javobni saqlash');
  await qa.waitText(firstStudent.page, '✓ Sinxronlandi');
  const recoveredServerAnswer = await firstStudent.page.evaluate(async (sessionId) => {
    const { api } = await import('/src/lib/api.ts');
    const snap = await api(`/live-exams/${sessionId}`);
    return snap.ownAnswer?.text ?? '';
  }, id);
  await qa.check(
    'Live E2E: explicit conflict resolution persists the chosen tab A answer',
    recoveredServerAnswer === firstTabAnswer,
    { recoveredServerAnswer },
  );

  await qa.clickText(firstStudent.page, 'Javobni topshirish');
  await qa.waitText(firstStudent.page, 'Topshirildi ✓');
  for (const [index, student] of students.slice(1).entries()) {
    await qa.fill(student.page, '#live-answer', `Uses base 2 and digits 0 and 1. QA learner ${index + 2}.`);
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
