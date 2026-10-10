// One-off diagnostic: inspect CreateJob's actual field values on a
// genuinely fresh load (no clicks at all) for admin vs recruiter, to
// discriminate "role-based defect" from "order-dependence" from "some
// other pre-fill mechanism" — not guessing from reading the component.
import { chromium } from '@playwright/test';
import { BASE_URL, IDENTITIES } from './config.mjs';

async function check(role, route) {
  const identity = IDENTITIES.find((i) => i.role === role);
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.fill('#email', identity.email);
  await page.fill('#password', identity.password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 8000 });
  await page.waitForTimeout(1000);

  // Clear sessionStorage before this specific check, so no leftover draft
  // from an earlier run skews a "genuinely fresh" read.
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const titleValue = await page.locator('input').first().inputValue().catch(() => '(no input found)');
  const sessionDraft = await page.evaluate(() => sessionStorage.getItem('createJob:new'));
  const bodyText = (await page.evaluate(() => document.body.innerText)).slice(0, 300);

  console.log(`\n=== ${role} @ ${route} ===`);
  console.log('First <input> value:', JSON.stringify(titleValue));
  console.log('sessionStorage createJob:new:', sessionDraft);
  console.log('Visible heading/body start:', bodyText.replace(/\n+/g, ' | ').slice(0, 200));

  // First interaction of the whole session on this page — no sidebar
  // clicks, no Cancel, no Back arrow first. Isolates whether the crawl's
  // OWN click sequence (not role) is what causes the difference.
  const count = await page.getByRole('button', { name: 'Next Step' }).count();
  console.log('"Next Step" button count on fresh load:', count);
  const urlBefore = page.url();
  const textBefore = await page.evaluate(() => document.body.innerText);
  await page.getByRole('button', { name: 'Next Step' }).first().click();
  await page.waitForTimeout(900);
  const urlAfter = page.url();
  const textAfter = await page.evaluate(() => document.body.innerText);
  console.log('First-ever "Next Step" click, url changed:', urlBefore !== urlAfter, '| text changed:', textBefore !== textAfter);
  console.log('URL after:', urlAfter);
  const toastText = await page.locator('[data-sonner-toast]').first().innerText().catch(() => '(no toast)');
  console.log('Toast present:', toastText);

  await browser.close();
}

await check('admin', '/admin/post-job');
await check('recruiter', '/recruiter/post-job');
