import { createBrowserQA } from './browser-qa.mjs';
import { joinLobby, snapshot } from './browser-live-qa.mjs';

if (!process.env.QA_PASSWORD) throw new Error('QA_PASSWORD is required for the isolated QA accounts.');
const baseUrl = process.env.QA_BASE_URL || 'http://localhost:5173';
const qa = await createBrowserQA({ baseUrl, outputDir: 'output/qa-2026-10-08/live-join-code' });
let teacher, id;
try {
  teacher = await qa.login('audit2_teacher', process.env.QA_PASSWORD, 'teacher');
  const early = await qa.login('audit2_student1', process.env.QA_PASSWORD, 'early-learner');
  const late = await qa.login('audit2_student2', process.env.QA_PASSWORD, 'late-learner');
  const classId = await teacher.page.evaluate(async () => {
    const { api } = await import('/src/lib/api.ts');
    return (await api('/classes')).data[0]?.id;
  });
  if (!classId) throw new Error('The dedicated QA teacher needs a class.');
  // Set up one isolated room through the real API; exercise start/join in the UI.
  id = await teacher.page.evaluate(async classId => {
    const { api } = await import('/src/lib/api.ts');
    const { randomId } = await import('/src/lib/random-id.ts');
    const options = await api('/questions/filter-options');
    const topic = options.topics.find(item => item.syllabus_code === '9618' && Number(item.topic_number) === 1);
    if (!topic) throw new Error('QA topic is unavailable');
    const room = await api('/live-exams', { method: 'POST', headers: { 'Idempotency-Key': randomId() }, body: JSON.stringify({ classId, title: `QA visible join code ${Date.now()}`, topicIds: [topic.topic_id], questionCount: 1, markingMode: 'teacher', allowLateJoin: true, excludeSeen: false }) });
    return room.id;
  }, classId);
  qa.report.fixtures.push({ type: 'live', id });
  const room = { code: (await snapshot(teacher.page, id)).session.joinCode };
  await qa.go(teacher.page, `oqitish/live?id=${id}`);
  await joinLobby(qa, early, room.code);
  await qa.waitText(early.page, 'XONAGA QO‘SHILDINGIZ');
  await qa.waitText(teacher.page, '1 qo‘shildi');
  await qa.clickText(teacher.page, 'O‘yinni boshlash');
  await teacher.page.waitForSelector('.live-active-join-code');
  await qa.check('Teacher retains the join code after starting', await teacher.page.$eval('.live-active-join-code strong', el => el.textContent) === room.code);
  const projector = await teacher.context.newPage();
  projector.on('pageerror', error => qa.report.pageErrors.push({ label: 'projector', error: error.message }));
  await projector.goto(`${baseUrl}/#oqitish/live?id=${id}&projector=1`, { waitUntil: 'networkidle2' });
  await projector.waitForSelector('.live-projector-session-info .live-active-join-code');
  await qa.check('Projector shows the active join code beside the timer', await projector.$eval('.live-active-join-code strong', el => el.textContent) === room.code);
  await qa.screenshot(projector, 'projector-active-code');
  await joinLobby(qa, late, room.code);
  await late.page.waitForSelector('#live-answer');
  await qa.check('A late learner enters the already started question using that code', (await snapshot(teacher.page, id)).session.participantCount === 2);
  await qa.clickText(teacher.page, 'Pauza');
  await qa.waitText(projector, 'CHALLENGE PAUZADA');
  await qa.check('Code stays visible while paused on both screens', await teacher.page.$('.live-active-join-code') !== null && await projector.$('.live-active-join-code') !== null);
  await projector.setViewport({ width: 390, height: 844 });
  await qa.check('Projector code stays within the narrow viewport', await projector.$eval('.live-active-join-code', el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
  await qa.check('Narrow projector header leaves room for the question', await projector.$eval('.live-projector-overlay>header', el => el.getBoundingClientRect().height < 240));
  await qa.screenshot(projector, 'projector-narrow-code');
  await qa.check('Live join-code flow has no unhandled browser errors', qa.report.pageErrors.length === 0);
} finally {
  if (teacher && id) {
    await teacher.page.evaluate(async id => {
      const { api } = await import('/src/lib/api.ts');
      const current = await api(`/live-exams/${id}`);
      if (!['finished', 'cancelled'].includes(current.session.status)) await api(`/live-exams/${id}/cancel`, { method: 'POST', body: JSON.stringify({ expectedVersion: current.session.version }) });
    }, id).catch(error => { qa.report.fixtures.push({ cleanupError: error.message }); });
  }
  await qa.finish();
}
