import { createBrowserQA } from './browser-qa.mjs';

if (!process.env.QA_BASE_URL || !process.env.QA_PASSWORD) throw new Error('Set QA_BASE_URL to the LAN address and QA_PASSWORD for the QA learner.');
const baseUrl = process.env.QA_BASE_URL;
const qa = await createBrowserQA({ baseUrl, outputDir: process.env.QA_OUTPUT_DIR || 'output/qa-2026-10-08/lan' });
try {
  const { page, context } = await qa.login('audit2_student3', process.env.QA_PASSWORD, 'LAN learner');
  const origins = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) origins.push(url.origin);
  });
  const result = await page.evaluate(async () => {
    const { api } = await import('/src/lib/api.ts');
    const { randomId } = await import('/src/lib/random-id.ts');
    const me = await api('/auth/me');
    return { insecure: !window.isSecureContext, nativeUUID: typeof crypto.randomUUID === 'function', id: randomId(), role: me.user.role };
  });
  await qa.check('A learner signs in through the LAN API proxy', result.role === 'student');
  await qa.check('UUID generation works on an ordinary HTTP LAN origin', result.insecure && !result.nativeUUID && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(result.id));
  const cookies = await context.cookies();
  await qa.check('The refresh cookie belongs to the LAN host and is httpOnly', cookies.some(cookie => cookie.name === 'campath_refresh' && cookie.domain === new URL(baseUrl).hostname && cookie.httpOnly));
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('.shell');
  await qa.check('Reload restores the session through the LAN address', true);
  await qa.check('API requests stay on the LAN site origin', origins.length > 0 && origins.every(origin => origin === new URL(baseUrl).origin));
  await qa.screenshot(page, 'lan-learner');
  await qa.check('LAN flow has no unhandled browser errors', qa.report.pageErrors.length === 0);
} finally { await qa.finish(); }
