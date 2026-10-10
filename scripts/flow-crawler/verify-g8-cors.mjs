// G8 part 3 — re-walk the CV/documents zip against the DEPLOYED site
// (not localhost), read-only. cors.json and the Storage bucket were
// updated to allow https://autumhire-ats.vercel.app (commit 1099b44);
// this is the first time the actual download has been exercised there
// since. Logs in as the real recruiter test account, clicks the real
// "CVs" button for JOB-TEST-9001 on /recruiter/adverts, and reports
// whether the zip actually arrives or trips CORS — a CORS failure on a
// per-file fetch() inside downloadJobCvs.ts is swallowed into a "skipped"
// count, not thrown, so the toast text and the actual download event are
// both checked, not just one.
import { chromium } from '@playwright/test';

const BASE_URL = 'https://autumhire-ats.vercel.app';

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push(`[uncaught] ${err.message}`));

await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
await page.fill('#email', 'recruiter@test.autumhire.local');
await page.fill('#password', 'TestPass123!');
await page.click('button[type="submit"]');
await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 10000 });

await page.goto(`${BASE_URL}/recruiter/adverts`, { waitUntil: 'load' });
await page.waitForTimeout(1500);

const row = page.locator('tr', { hasText: 'Research Data Analyst (TEST)' }).first();
const rowExists = await row.count();
console.log('JOB-TEST-9001 row found on /recruiter/adverts:', !!rowExists);

const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
await row.getByRole('button', { name: 'CVs' }).click();

// The success/error toast fires after the zip finishes building client-side.
await page.waitForTimeout(8000);
const toastText = await page.locator('[data-sonner-toast]').allInnerTexts().catch(() => []);

const download = await downloadPromise;
let downloadInfo = null;
if (download) {
  const fs = await import('node:fs');
  const savedPath = './scripts/flow-crawler-output/g8-verify.zip';
  await download.saveAs(savedPath);
  downloadInfo = {
    suggestedFilename: download.suggestedFilename(),
    size: fs.statSync(savedPath).size,
    savedPath,
  };
}

console.log('\n=== Result ===');
console.log('Toast text:', JSON.stringify(toastText));
console.log('Download event fired:', !!download);
if (downloadInfo) console.log('Downloaded file:', downloadInfo.suggestedFilename, `(${downloadInfo.size} bytes) saved to ${downloadInfo.savedPath}`);
console.log('\nConsole errors during the attempt:');
consoleErrors.forEach((e) => console.log(' -', e));
if (consoleErrors.length === 0) console.log(' (none)');

await browser.close();
