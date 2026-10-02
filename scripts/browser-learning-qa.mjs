// Real clicks and keyboard input against an existing QA learner session.
export const paperRoute = 'oquvchi/darslar?course=9618&chapter=1&topic=1.1&page=1&mode=exam';

export async function switchAccount(qa, page, identifier, password) {
  await qa.clickText(page, 'Chiqish');
  await page.waitForSelector('input[name="identifier"]');
  await qa.fill(page, 'input[name="identifier"]', identifier);
  await qa.fill(page, 'input[name="password"]', password);
  await page.locator('.auth-submit').click();
  await page.waitForSelector('.shell');
}

export async function checkPaperDrafts(qa, page, password) {
  const readAnswer = () => page.$eval('.lx-answer textarea', el => el.value);
  const click = async selector => {
    await page.$eval(selector, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.locator(selector).click();
  };
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('.lx-answer textarea');
  await qa.check('Past Papers: ignores legacy drafts with no account owner', await readAnswer() === '');
  await qa.fill(page, '.lx-answer textarea', 'QA third learner first question');
  await qa.clickText(page, 'Reveal mark scheme');
  await click('[aria-label="Next question"]');
  await qa.check('Past Papers: next question has its own empty draft', await readAnswer() === '');
  await qa.check('Past Papers: question change hides the scheme', await page.$('.lx-mark-scheme') === null);
  await qa.fill(page, '.lx-answer textarea', 'QA third learner second question');
  await click('[aria-label="Previous question"]');
  await qa.check('Past Papers: previous question restores its own answer', await readAnswer() === 'QA third learner first question');
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('.lx-answer textarea');
  await qa.check('Past Papers: saved answer survives reload', await readAnswer() === 'QA third learner first question');
  await click('[aria-label="Next question"]');
  await qa.check('Past Papers: second saved answer survives reload', await readAnswer() === 'QA third learner second question');

  await switchAccount(qa, page, 'audit2_student1', password);
  await qa.go(page, paperRoute);
  await page.waitForSelector('.lx-answer textarea');
  await qa.check('Past Papers: another account cannot see the first account draft', await readAnswer() === '');
  await qa.fill(page, '.lx-answer textarea', 'QA first learner private draft');
  await switchAccount(qa, page, 'audit2_student3', password);
  await qa.go(page, paperRoute);
  await page.waitForSelector('.lx-answer textarea');
  await qa.check('Past Papers: returning account retains its own draft', await readAnswer() === 'QA third learner first question');

  await qa.fill(page, '[aria-label="Search questions"]', 'NO_MATCH_QA_20260930');
  await qa.waitText(page, 'No question matches the current filters.');
  await qa.check('Past Papers: empty search shows an explicit empty state', await page.$('.lx-answer textarea') === null);
  await qa.fill(page, '[aria-label="Search questions"]', '');
  await page.waitForSelector('.lx-answer textarea');
  await qa.check('Past Papers: clearing search restores the saved draft', await readAnswer() === 'QA third learner first question');
  const year = await page.$eval('[aria-label="Year"]', el => [...el.options].find(option => option.value !== 'all').value);
  await page.select('[aria-label="Year"]', year);
  await qa.check('Past Papers: year filter selects the requested year', await page.$eval('.lx-question-meta small', (el, year) => el.innerText.includes(year), year));
  await qa.screenshot(page, 'past-paper-drafts-fixed');
}

export async function checkSequenceGame(qa, page) {
  const tabs = await page.$$eval('.game-tabs button', buttons => buttons.map(button => ({ text: button.innerText, disabled: button.disabled, active: button.classList.contains('active') })));
  await qa.check('Games: only populated Sequence is available', tabs.find(tab => tab.text === 'Sequence')?.active && tabs.filter(tab => tab.text !== 'Sequence').every(tab => tab.disabled));
  const values = () => page.$$eval('.sequence-item > span', elements => elements.map(el => el.innerText));
  const original = await values();
  await qa.clickText(page, 'Tekshirish', '#student-games button');
  await qa.check('Games: incorrect sequence gives useful feedback', await page.$eval('.game-result', el => el.innerText === 'Tartibni yana tekshiring'));
  for (const [targetIndex, target] of [...original].reverse().entries()) {
    let index = (await values()).indexOf(target);
    while (index > targetIndex) {
      const selector = '.sequence-item:nth-of-type(' + (index + 1) + ') [title="Yuqoriga"]';
      await page.$eval(selector, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.locator(selector).click();
      index--;
    }
  }
  await qa.clickText(page, 'Tekshirish', '#student-games button');
  await qa.check('Games: reordered sequence is accepted', await page.$eval('.game-result', el => el.innerText === 'To‘g‘ri tartib'));
  await qa.check('Games: sequence boundaries cannot move out of range', await page.$$eval('.sequence-item', items => items[0].querySelector('[title="Yuqoriga"]').disabled && items.at(-1).querySelector('[title="Pastga"]').disabled));
  await qa.screenshot(page, 'sequence-game-completed');
}
