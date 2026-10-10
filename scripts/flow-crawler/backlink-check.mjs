// Standalone, single-purpose: the client's actual reported back-link bug
// (docs/flow-crawler-spec.md §4), extracted out of the Stage 2 crawl so it
// can run alone in well under a minute — previously it sat at the end of
// a ~20-minute crawl and got lost to memory-pressure reaps three times in
// a row without ever running.
//
// Preconditions (same as stage2-interactions.mjs): emulator suite up,
// CRAWLER_BASE_URL pointing at an emulator-wired build, database seeded.
// This script does not start any of that itself.
//
//   CRAWLER_BASE_URL=http://localhost:4173 node scripts/flow-crawler/backlink-check.mjs

import { chromium } from '@playwright/test';
import { BASE_URL, IDENTITIES, JOB_ID } from './config.mjs';

async function main() {
  const identity = IDENTITIES.find((i) => i.role === 'recruiter');
  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext();

  const loginPage = await context.newPage();
  await loginPage.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await loginPage.fill('#email', identity.email);
  await loginPage.fill('#password', identity.password);
  await loginPage.click('button[type="submit"]');
  await loginPage.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 8000 });
  await loginPage.close();

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/recruiter/adverts`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  const link = page.locator(`a[href="/jobs/${JOB_ID}"]`).first();
  const exists = await link.count();
  if (!exists) {
    console.log('RESULT: the public-job-view control was not found on /recruiter/adverts for this seed data.');
    await browser.close();
    process.exit(1);
  }
  const controlName = await link.evaluate((el) => el.getAttribute('title') || el.innerText || '(untitled link)');
  const controlTarget = await link.getAttribute('target');
  console.log(`Control used: "${controlName.trim()}" (<a href="/jobs/${JOB_ID}" target="${controlTarget}">) — the only path /recruiter/adverts actually offers to the public job view.`);

  const newPagePromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
  await link.click();
  const newPage = await newPagePromise;

  if (!newPage) {
    console.log('RESULT: click did not open a new page within 5s.');
    await browser.close();
    process.exit(1);
  }

  await newPage.waitForLoadState('load', { timeout: 8000 }).catch(() => {});
  const urlBeforeBack = newPage.url();
  const historyLengthBefore = await newPage.evaluate(() => window.history.length);

  // Did it land as the staff-in-app view (dashboard chrome: sidebar/header)
  // or the public standalone view (marketing header, no sidebar)? Checked
  // by presence of the dashboard shell, not by URL alone.
  const hasSidebar = await newPage.locator('aside').count().catch(() => 0);
  const renderedAs = hasSidebar > 0 ? 'staff-in-app (dashboard shell present)' : 'public standalone view (no dashboard shell)';

  let backOutcome;
  try {
    const nav = await newPage.goBack({ waitUntil: 'load', timeout: 5000 });
    backOutcome = nav ? newPage.url() : "goBack() returned null — no previous entry in this tab's history";
  } catch (err) {
    backOutcome = `goBack() threw: ${String(err?.message || err).split('\n')[0]}`;
  }
  const historyLengthAfter = await newPage.evaluate(() => window.history.length).catch(() => null);
  const hasSidebarAfter = await newPage.locator('aside').count().catch(() => 0);
  const renderedAsAfter = hasSidebarAfter > 0 ? 'staff-in-app (dashboard shell present)' : 'public standalone view (no dashboard shell)';

  console.log('');
  console.log('=== Back-link check result ===');
  console.log(`Opened: ${urlBeforeBack}`);
  console.log(`Rendered as (before back): ${renderedAs}`);
  console.log(`history.length before goBack(): ${historyLengthBefore}`);
  console.log(`goBack() outcome: ${backOutcome}`);
  console.log(`Landed URL (after back): ${newPage.url()}`);
  console.log(`Rendered as (after back): ${renderedAsAfter}`);
  console.log(`history.length after goBack(): ${historyLengthAfter}`);

  await newPage.close();
  await context.close();
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
