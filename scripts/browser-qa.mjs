import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

// Real-browser helpers. Credentials are passed at runtime, never stored in the
// evidence. Each role receives a separate cookie/storage context.
export async function createBrowserQA({ baseUrl = 'http://localhost:5173', executablePath = process.env.CHROME_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', outputDir = `output/qa-${new Date().toISOString().slice(0, 10)}` } = {}) {
  mkdirSync(outputDir, { recursive: true });
  const browser = await puppeteer.launch({ executablePath, headless: true, defaultViewport: { width: 1440, height: 1000 }, args: ['--disable-gpu'] });
  const report = { startedAt: new Date().toISOString(), baseUrl, checks: [], pageErrors: [], httpErrors: [], fixtures: [] };
  const save = () => writeFileSync(path.join(outputDir, 'browser-report.json'), JSON.stringify(report, null, 2));
  async function check(name, passed, details) {
    report.checks.push({ name, passed: Boolean(passed), ...(details ? { details } : {}) });
    save();
    console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
    assert.ok(passed, name);
  }
  async function fill(page, selector, value) {
    await page.bringToFront();
    await page.waitForSelector(selector, { visible: true });
    await page.focus(selector);
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type(selector, String(value));
    await page.waitForFunction((selector, value) => document.querySelector(selector)?.value === value, {}, selector, String(value));
  }
  async function clickText(page, text, scope = 'button') {
    await page.bringToFront();
    const selector = `${scope}::-p-text(${text})`;
    const target = await page.waitForSelector(selector, { visible: true });
    // Center the real click target so the sticky shell header cannot cover it.
    await target.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
    await page.locator(selector).click();
  }
  async function waitText(page, text) {
    await page.waitForFunction(text => document.body.innerText.includes(text), { timeout: 45000, polling: 100 }, text);
  }
  async function login(identifier, password, label) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', error => { report.pageErrors.push({ label, error: error.message, route: new URL(page.url()).hash }); save(); });
    page.on('response', response => {
      if (response.status() >= 400 && response.url().includes('/api/')) {
        report.httpErrors.push({ label, path: new URL(response.url()).pathname, status: response.status() }); save();
      }
    });
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });
    await fill(page, 'input[name="identifier"]', identifier);
    await fill(page, 'input[name="password"]', password);
    await page.locator('.auth-submit').click();
    await page.waitForSelector('.shell', { timeout: 45000 });
    await check(`${label}: browser login`, true);
    return { page, context, label };
  }
  async function go(page, route) {
    await page.evaluate(route => { location.hash = route; }, route);
    await page.waitForFunction(route => location.hash === '#' + route, {}, route);
  }
  async function screenshot(page, name) {
    await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: false });
  }
  async function enableDownloads(context) {
    const downloadPath = path.resolve(outputDir, 'downloads');
    mkdirSync(downloadPath, { recursive: true });
    await context.setDownloadBehavior({ policy: 'allow', downloadPath });
    return downloadPath;
  }
  return {
    browser, report, save, check, fill, clickText, waitText, login, go, screenshot, enableDownloads,
    async finish() { report.finishedAt = new Date().toISOString(); save(); await browser.close(); },
  };
}
