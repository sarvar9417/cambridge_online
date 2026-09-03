import { writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-first-run', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1024, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));
await page.setRequestInterception(true);
page.on('request', (request) => {
  const url = new URL(request.url());
  if (!url.pathname.startsWith('/api/v1/')) return request.continue();
  let body = { data: [] };
  if (url.pathname.endsWith('/auth/refresh')) body = { accessToken: 'visual-check-token', user: { id: 'owner-1', fullName: 'S. Haydarov', role: 'owner', schoolId: 'school-1' } };
  else if (url.pathname.endsWith('/classes')) body = { data: [
    { id: 'a', name: '9618/1A', grade: 11, level: 'AS', academicYear: '2026/2027', studentCount: 18 },
    { id: 'b', name: '9618/1B', grade: 11, level: 'AS', academicYear: '2026/2027', studentCount: 17 },
    { id: 'c', name: '9618/2A', grade: 12, level: 'A2', academicYear: '2026/2027', studentCount: 16 },
    { id: 'd', name: '9618/2B', grade: 12, level: 'A2', academicYear: '2026/2027', studentCount: 15 },
  ] };
  else if (url.pathname.endsWith('/admin/overview')) body = {
    waiting: { pendingUsers: 3, reviewQueue: 12, openAppeals: 5 },
    corpus: { ingestedPapers: 168, totalPapers: 192, questions: 1846, markSchemes: 168, markPoints: 6420, recent: [
      { label: 'May/June 2025 · Paper 22', questions: 12, marks: 75, status: 'reviewed' },
      { label: 'May/June 2025 · Paper 42', questions: 15, marks: 75, status: 'needs_review' },
    ] },
    syllabus: { topics: 12, subtopics: 64, objectives: 214, coverage: [{ band: 'AS', percent: 86, subtopics: 31 }, { band: 'A2', percent: 74, subtopics: 33 }] },
    spend: { monthUsd: 18.42, calls: 2840, unpriced: 0 }, blockers: [],
  };
  request.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' }, body: JSON.stringify(body) });
});
await page.goto('http://localhost:5173/#boshqaruv/holat', { waitUntil: 'networkidle0' });
try { await page.waitForSelector('.shell', { timeout: 15000 }); } catch (error) {
  errors.push(error.message);
  errors.push((await page.$eval('body', (node) => node.innerText)).slice(0, 500));
  await page.screenshot({ path: '.design-audit/02-dashboard-blocked.png' });
  writeFileSync('.design-audit/browser-errors.json', JSON.stringify(errors, null, 2));
  await browser.close(); process.exit(2);
}
await page.evaluate(() => { localStorage.setItem('campath:theme', 'light'); document.documentElement.dataset.theme = 'light'; });
await new Promise((resolve) => setTimeout(resolve, 300));
await page.screenshot({ path: '.design-audit/02-dashboard-light.png' });
await page.evaluate(() => { localStorage.setItem('campath:theme', 'dark'); document.documentElement.dataset.theme = 'dark'; });
await new Promise((resolve) => setTimeout(resolve, 300));
await page.screenshot({ path: '.design-audit/03-dashboard-dark.png' });
const interactions = [];
await page.click('.theme-toggle');
interactions.push(`theme-toggle:${await page.evaluate(() => document.documentElement.getAttribute('data-theme') ?? 'system')}`);
await page.click('a[href="#boshqaruv/odamlar"]');
interactions.push(`navigation:${await page.evaluate(() => location.hash)}`);
await page.goto('http://localhost:5173/#boshqaruv/holat', { waitUntil: 'networkidle0' });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.waitForSelector('.shell-burger');
await new Promise((resolve) => setTimeout(resolve, 300));
await page.screenshot({ path: '.design-audit/05-dashboard-mobile.png' });
await page.click('.shell-burger');
interactions.push(`mobile-menu:${await page.$eval('.shell-rail', (node) => node.classList.contains('is-open'))}`);
await new Promise((resolve) => setTimeout(resolve, 300));
await page.screenshot({ path: '.design-audit/06-dashboard-mobile-menu.png' });
writeFileSync('.design-audit/browser-errors.json', JSON.stringify(errors, null, 2));
writeFileSync('.design-audit/interactions.json', JSON.stringify(interactions, null, 2));
await browser.close();
