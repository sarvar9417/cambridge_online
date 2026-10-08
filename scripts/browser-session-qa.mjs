import { createBrowserQA } from './browser-qa.mjs';

// Only the isolated QA session is changed. Access tokens are never recorded.
if (!process.env.QA_PASSWORD) throw new Error('Set QA_PASSWORD for the existing isolated QA learner.');
const qa = await createBrowserQA({ outputDir: process.env.QA_OUTPUT_DIR || 'output/qa-2026-10-06/session' });
try {
  const { page, context } = await qa.login(process.env.QA_IDENTIFIER || 'audit2_student3', process.env.QA_PASSWORD, 'session-learner');
  await page.waitForNetworkIdle({ idleTime: 700 });
  await qa.check('Runtime renders the learner shell without an error overlay', await page.evaluate(() =>
    Boolean(document.querySelector('.shell')) && !document.querySelector('vite-error-overlay')));
  await qa.screenshot(page, 'session-start');

  await page.setRequestInterception(true);
  let blockRefresh = true;
  const intercept = request => {
    if (blockRefresh && new URL(request.url()).pathname.endsWith('/auth/refresh')) void request.abort('internetdisconnected');
    else void request.continue();
  };
  page.on('request', intercept);
  const transient = await page.evaluate(async () => {
    const client = await import('/src/lib/api.ts');
    client.setAccessToken('qa-expired-access-token');
    let rejected = false;
    try { await client.api('/classes'); } catch { rejected = true; }
    return { rejected };
  });
  await new Promise(resolve => setTimeout(resolve, 250));
  await qa.screenshot(page, 'refresh-network-failure');
  await qa.check('A disconnected refresh reports failure without signing out the learner',
    transient.rejected && await page.$('.shell') !== null);
  blockRefresh = false;
  const recovered = await page.evaluate(async () => {
    const { api } = await import('/src/lib/api.ts');
    try { const body = await api('/classes'); return Array.isArray(body.data); } catch { return false; }
  });
  await qa.check('Retry after reconnection refreshes the existing session', recovered && await page.$('.shell') !== null);

  // Download requests must use the same refresh failure policy as JSON requests.
  blockRefresh = true;
  const blobTransient = await page.evaluate(async () => {
    const client = await import('/src/lib/api.ts');
    client.setAccessToken('qa-expired-download-token');
    try { await client.apiBlob('/privacy/export'); return false; } catch { return true; }
  });
  await qa.check('A disconnected download refresh retains the learner session', blobTransient && await page.$('.shell') !== null);
  blockRefresh = false;
  const blobRecovered = await page.evaluate(async () => {
    const { apiBlob } = await import('/src/lib/api.ts');
    try { return (await apiBlob('/privacy/export')).size > 0; } catch { return false; }
  });
  await qa.check('Download retries successfully after reconnection', blobRecovered);

  page.off('request', intercept);
  await page.setRequestInterception(false);
  // Remove only this temporary context's refresh cookie, simulating expiry.
  const cookies = (await context.cookies()).filter(cookie => cookie.name === 'campath_refresh');
  await context.deleteCookie(...cookies);
  const invalidDownload = await page.evaluate(async () => {
    const client = await import('/src/lib/api.ts');
    client.setAccessToken('qa-expired-download-token');
    try { await client.apiBlob('/privacy/export'); return false; } catch { return true; }
  });
  await page.waitForSelector('.auth', { timeout: 5000 });
  await qa.check('Definitively expired download session returns to login', invalidDownload && await page.$('.shell') === null);
  await qa.screenshot(page, 'expired-download-login');
  await qa.check('Session flow has no unhandled browser errors', qa.report.pageErrors.length === 0);
} finally {
  await qa.finish();
}
