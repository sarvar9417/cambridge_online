import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-first-run', '--disable-gpu', '--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 2880, height: 2048, deviceScaleFactor: 1 });
await page.goto('file:///C:/Users/104/Desktop/cambridge_online/.design-audit/compare.html', { waitUntil: 'networkidle0' });
await page.screenshot({ path: '.design-audit/04-comparison.png', fullPage: true });
await browser.close();
