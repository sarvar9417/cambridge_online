// Run against dedicated QA accounts/classes only. Supply authenticated contexts
// from browser-qa.mjs; no credentials or existing assessment IDs are stored here.
export async function snapshot(page, id, projector = false) {
  return page.evaluate(async ({ id, projector }) => {
    const { api } = await import('/src/lib/api.ts');
    return api(`/live-exams/${id}${projector ? '/projector' : ''}`);
  }, { id, projector });
}

export async function markVisibleAnswer(qa, page, scope, feedback) {
  await page.bringToFront();
  const band = await page.$(`${scope} select`);
  if (band) {
    const value = await band.evaluate(el => el.options[el.options.length - 1].value);
    await band.select(value);
  }
  for (const box of await page.$$(`${scope} input[type="checkbox"]`)) {
    if (!await box.evaluate(el => el.checked)) await box.click();
  }
  const number = await page.$(`${scope} input[type="number"]`);
  if (number) await qa.fill(page, `${scope} input[type="number"]`, await number.evaluate(el => el.max));
  await qa.fill(page, `${scope} textarea`, feedback);
  await qa.clickText(page, scope === '.live-teacher-marker' ? 'Bahoni tasdiqlash' : 'Baholashni yuborish', `${scope} button`);
}

export async function finishRound(qa, teacher, students, id, mode, beforeFinish) {
  if (mode === 'teacher') {
    for (let i = 1; i <= students.length; i++) {
      await markVisibleAnswer(qa, teacher.page, '.live-teacher-marker', `QA teacher review ${i}`);
      await qa.waitText(teacher.page, `${i}/${students.length} ta tugadi`);
    }
  } else {
    for (const [i, student] of students.entries()) {
      await markVisibleAnswer(qa, student.page, '.live-review-card', `QA ${mode} review ${i + 1}`);
      await qa.waitText(student.page, 'Baholash yuborildi');
    }
  }
  await qa.waitText(teacher.page, `${students.length}/${students.length} ta tugadi`);
  await qa.clickText(teacher.page, 'Natijalarni ochish');
  await qa.waitText(teacher.page, 'SAVOL YAKUNI');
  await Promise.all(students.map(s => qa.waitText(s.page, 'SAVOL NATIJASI')));
  const marked = await snapshot(teacher.page, id);
  await qa.check(`Live ${mode}: all reviews completed and scores capped`,
    marked.teacherAnswers.length === students.length && marked.teacherAnswers.every(a => a.score >= 0 && a.score <= marked.question.marks));
  if (beforeFinish) await beforeFinish(marked);
  await qa.screenshot(teacher.page, `live-${mode}-review`);
  await qa.clickText(teacher.page, 'Sessiyani yakunlash');
  await Promise.all([teacher, ...students].map(s => qa.waitText(s.page, 'SESSIYA YAKUNLANDI')));
  const final = await snapshot(teacher.page, id);
  const learnerReports = await Promise.all(students.map(s => snapshot(s.page, id)));
  await qa.check(`Live ${mode}: final class total equals learner totals`,
    final.report.earned === learnerReports.reduce((sum, s) => sum + s.report.earned, 0)
      && final.report.possible === learnerReports.reduce((sum, s) => sum + s.report.possible, 0));
  await students[0].page.reload({ waitUntil: 'networkidle2' });
  await qa.waitText(students[0].page, 'SESSIYA YAKUNLANDI');
  await qa.check(`Live ${mode}: finished report survives reload`, true);
  return final;
}

export async function createRound(qa, teacher, students, { classId, mode, title }) {
  await qa.go(teacher.page, 'oqitish/live');
  await teacher.page.waitForSelector('input[name="title"]');
  await teacher.page.select('select[name="classId"]', classId);
  await qa.fill(teacher.page, 'input[name="title"]', title);
  await teacher.page.locator('.live-topic-grid fieldset:first-child input[type="checkbox"]').click();
  await qa.fill(teacher.page, 'input[name="questionCount"]', '1');
  await teacher.page.select('select[name="timeLimit"]', '');
  await teacher.page.select('select[name="markingMode"]', mode);
  await qa.clickText(teacher.page, 'Xonani yaratish');
  await qa.waitText(teacher.page, 'JOIN CODE');
  const id = new URLSearchParams(teacher.page.url().split('?')[1]).get('id');
  const code = await teacher.page.$eval('.live-code-card strong', el => el.textContent);
  qa.report.fixtures.push({ type: 'live', id, mode, title });
  qa.save();
  for (const student of students) {
    await qa.go(student.page, 'oquvchi/live');
    await qa.fill(student.page, 'input[aria-label="Xona kodi"]', code);
    await qa.clickText(student.page, 'Qo‘shilish');
    await qa.waitText(student.page, 'XONAGA QO‘SHILDINGIZ');
  }
  await qa.waitText(teacher.page, `${students.length} qo‘shildi`);
  await qa.clickText(teacher.page, 'O‘yinni boshlash');
  await qa.waitText(teacher.page, 'Savol ochiq');
  for (const [i, student] of students.entries()) {
    await qa.fill(student.page, '#live-answer', `QA ${mode} answer ${i + 1}`);
    await qa.clickText(student.page, 'Javobni topshirish');
    await qa.waitText(student.page, 'Topshirildi ✓');
  }
  await teacher.page.waitForFunction(count => document.querySelector('.live-submit-stat progress')?.value === count, { polling: 100 }, students.length);
  await qa.check(`Live ${mode}: all answers submitted`, true);
  await qa.clickText(teacher.page, 'Javoblarni yopish va MSni ochish');
  await qa.waitText(teacher.page, 'BAHOLASH');
  if (mode === 'peer') {
    for (const [i, student] of students.entries()) {
      await qa.waitText(student.page, 'ANONIM JAVOB');
      const view = await snapshot(student.page, id);
      await qa.check(`Live peer: learner ${i + 1} receives another anonymous answer`,
        view.review.kind === 'peer' && view.review.answerText !== `QA peer answer ${i + 1}`
          && !view.review.studentId && !view.review.studentName && !view.review.reviewerId
          && view.teacherAnswers.length === 0 && view.participants.length === 0);
    }
  }
  return id;
}
