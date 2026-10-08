import { createBrowserQA } from './browser-qa.mjs';

if (!process.env.QA_PASSWORD) throw new Error('Set QA_PASSWORD for the isolated QA learners.');
const baseUrl = 'http://localhost:5173';
const qa = await createBrowserQA({ baseUrl, outputDir: process.env.QA_OUTPUT_DIR || 'output/qa-2026-10-07/session-tabs' });
try {
  const { page, context } = await qa.login(process.env.QA_IDENTIFIER || 'audit2_student3', process.env.QA_PASSWORD, 'first-tab');
  await page.waitForNetworkIdle({ idleTime: 500 });
  const originalIdentity = await page.$eval('#student-profile p', element => element.textContent);
  const second = await context.newPage();
  second.on('pageerror', error => qa.report.pageErrors.push({ label: 'second-tab', error: error.message }));
  second.on('response', response => {
    if (response.status() >= 400 && response.url().includes('/api/')) {
      qa.report.httpErrors.push({ label: 'second-tab', path: new URL(response.url()).pathname, status: response.status() });
    }
  });
  await second.goto(baseUrl, { waitUntil: 'networkidle2' });
  await second.waitForSelector('.shell');
  await qa.check('A second tab restores the existing learner session', true);

  let releaseOldRequest;
  for (const tab of [page, second]) {
    await tab.setRequestInterception(true);
    tab.on('request', request => {
      if (new URL(request.url()).searchParams.get('qa') === 'old-session') {
        releaseOldRequest = () => request.continue();
        return;
      }
      if (new URL(request.url()).pathname.endsWith('/auth/refresh')) {
        // Give the other tab time to send its request with the shared cookie.
        setTimeout(() => void request.continue(), 300);
      } else void request.continue();
    });
  }
  if (process.env.QA_TABS_CASE !== 'logout') {
    for (const tab of [page, second]) {
      await tab.evaluate(async () => (await import('/src/lib/api.ts')).setAccessToken('qa-expired-multitab-token'));
    }
    const results = await Promise.all([page, second].map(tab => tab.evaluate(async () => {
      try {
        const { api } = await import('/src/lib/api.ts');
        return { ok: Array.isArray((await api('/classes')).data) };
      } catch (error) { return { ok: false, status: error.status ?? null }; }
    })));
    await qa.screenshot(page, 'concurrent-refresh-first');
    await qa.screenshot(second, 'concurrent-refresh-second');
    await qa.check('Both tabs recover from simultaneous token expiry without refresh reuse', results.every(result => result.ok), { results });
    await qa.check('Both tabs retain their learner UI', await page.$('.shell') !== null && await second.$('.shell') !== null);
  }

  await page.evaluate(async () => {
    const { api } = await import('/src/lib/api.ts');
    window.qaOldSession = api('/classes?qa=old-session').then(
      () => ({ accepted: true }), error => ({ accepted: false, code: error.code }));
  });
  const started = Date.now();
  while (!releaseOldRequest && Date.now() - started < 5000) await new Promise(resolve => setTimeout(resolve, 25));
  await qa.check('An old-account request is held while the user signs out', Boolean(releaseOldRequest));
  await qa.go(page, 'oquvchi/uy');
  await qa.clickText(page, 'Chiqish');
  await page.waitForSelector('.auth');
  await second.waitForSelector('.auth', { timeout: 5000 }).catch(() => {});
  await qa.screenshot(second, 'other-tab-after-logout');
  await qa.check('Logging out clears the learner UI in both tabs', await second.$('.shell') === null && await second.$('.auth') !== null);

  await qa.fill(page, 'input[name="identifier"]', 'audit2_student2');
  await qa.fill(page, 'input[name="password"]', process.env.QA_PASSWORD);
  await page.locator('.auth-submit').click();
  await page.waitForSelector('.shell');
  await releaseOldRequest();
  const stale = await page.evaluate(() => window.qaOldSession);
  await qa.check('Switching accounts opens the second learner without restoring the first tab identity',
    await page.$('.shell') !== null && await second.$('.shell') === null
      && await page.$eval('#student-profile p', element => element.textContent) !== originalIdentity);
  await qa.check('A late response from the old account is discarded after switching accounts', !stale.accepted && stale.code === 'session_changed');
  await second.reload({ waitUntil: 'networkidle2' });
  await second.waitForSelector('.shell');
  const identities = await Promise.all([page, second].map(tab => tab.$eval('#student-profile p', element => element.textContent)));
  await qa.check('Reloading the other tab shows the new account identity', identities[0] === identities[1] && Boolean(identities[0]));
  await qa.screenshot(second, 'new-account-reloaded');
  await qa.check('Multi-tab session flow has no unhandled browser errors', qa.report.pageErrors.length === 0);
} finally { await qa.finish(); }
