import { writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const fs = await import('node:fs');
const before = JSON.parse(fs.readFileSync('.design-audit/before-manifest.json', 'utf8'));
const after = JSON.parse(fs.readFileSync('.design-audit/after-manifest.json', 'utf8'));

const pairs = after.map((entry) => {
  const prior = before.find((item) => item.name === entry.name);
  return { name: entry.name, route: entry.route, theme: entry.theme, mobile: entry.mobile, before: prior?.file ?? null, after: entry.file };
});

const cells = pairs.map((pair) => `
  <figure>
    <img src="${pair.before}" alt="before ${pair.name}">
    <figcaption>BEFORE · ${pair.name}</figcaption>
  </figure>
  <figure>
    <img src="${pair.after}" alt="after ${pair.name}">
    <figcaption>AFTER · ${pair.name} (${pair.theme}${pair.mobile ? ' · mobile' : ''})</figcaption>
  </figure>`).join('\n');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;background:#0d1117}
body{display:grid;grid-template-columns:repeat(2,minmax(320px,1fr));gap:6px;padding:6px;width:2900px}
figure{margin:0;position:relative;overflow:hidden;border-radius:8px}
img{width:1440px;max-width:100%;display:block;height:auto}
@media (min-width:1px){img{width:auto;max-width:1440px}}
figcaption{position:absolute;top:8px;left:8px;padding:4px 9px;background:#000c;color:#fff;font:600 12px system-ui;border-radius:5px;z-index:2}
</style></head><body>${cells}</body></html>`;
writeFileSync('.design-audit/compare-all.html', html);

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-first-run', '--disable-gpu', '--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 2900, height: 1600, deviceScaleFactor: 1 });
await page.goto('file:///C:/Users/104/Desktop/cambridge_online/.design-audit/compare-all.html', { waitUntil: 'networkidle0' });
await page.screenshot({ path: '.design-audit/compare-all.png', fullPage: true });
console.log('compare-all.html + compare-all.png written');
await browser.close();
