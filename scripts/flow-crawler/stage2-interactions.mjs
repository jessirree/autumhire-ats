// Flow crawler — Stage 2, write-path (docs/flow-crawler-spec.md §3 step 4, §4).
//
// Clicks every interactive control not on the deny list (spec §1) and
// records whether anything observable changed, plus a dedicated
// reproduction of the staff-entry back-link scenario (spec §4).
//
// SAFETY — read before running:
//   - Requires the mail-safety gate to already be closed: MAIL_ENABLED=false
//     in the DEPLOYED functions, verified by an admin test email reporting
//     skipped. This script does not check that for you.
//   - Deny list matches on accessible name (aria-label / innerText / title),
//     never CSS class. See DENY_PATTERN in config.mjs.
//   - Scoped to each role's own rendered pages (STAGE2_ROLE_ROUTES) plus the
//     public pages tested signed out (PUBLIC_ROUTES) — not all 48 routes for
//     all 5 identities, since Stage 1 already showed every off-role route
//     just bounces to the role's own dashboard.
//
// NOT part of any pnpm test command. Run manually:
//   node scripts/flow-crawler/stage2-interactions.mjs

import { chromium } from '@playwright/test';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  BASE_URL, IDENTITIES, JOB_ID, OUTPUT_DIR,
  STAGE2_ROLE_ROUTES, PUBLIC_ROUTES, DENY_PATTERN,
} from './config.mjs';

const REPORT_PATH = path.join(OUTPUT_DIR, 'stage2-report.md');
const NAV_SETTLE_MS = 1200;
const CLICK_SETTLE_MS = 900;

// Elements this crawl treats as "interactive controls" — buttons and links,
// the things a dead-handler bug actually hides behind. Form fields
// (inputs/selects/checkboxes) are out of scope for this pass; see the
// report's limitations section.
const CONTROL_SELECTOR = [
  'button:visible',
  'a[href]:visible',
  'input[type="submit"]:visible',
  'input[type="button"]:visible',
  '[role="button"]:visible',
  '[role="menuitem"]:visible',
].join(', ');

// Signals a click opened a dialog/toast (spec §3's four-signal heuristic).
const DIALOG_OR_TOAST_SELECTOR = '[data-sonner-toast], [role="dialog"], [role="alertdialog"], dialog[open]';

function slugify(s) {
  return s.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function hash(s) {
  return crypto.createHash('sha256').update(s || '').digest('hex');
}

async function loginAs(page, identity) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.fill('#email', identity.email);
  await page.fill('#password', identity.password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 8000 })
    .catch(() => {
      throw new Error(`Login did not navigate away from /login for ${identity.email}.`);
    });
  await page.waitForTimeout(NAV_SETTLE_MS);
}

async function accessibleName(locator) {
  return locator.evaluate((el) => {
    const aria = el.getAttribute('aria-label');
    if (aria && aria.trim()) return aria.trim();
    const title = el.getAttribute('title');
    const text = (el.innerText || '').trim();
    if (text) return text.replace(/\s+/g, ' ').slice(0, 80);
    if (title && title.trim()) return title.trim();
    const alt = el.querySelector('img')?.getAttribute('alt');
    if (alt) return alt.trim();
    return '(no accessible name)';
  }).catch(() => '(unreadable)');
}

async function selectorHint(locator) {
  return locator.evaluate((el) => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const dataTestId = el.getAttribute('data-testid');
    return dataTestId ? `${tag}[data-testid="${dataTestId}"]` : `${tag}${id}`;
  }).catch(() => '(unknown)');
}

async function snapshotSignals(page, errorCounter) {
  const url = page.url();
  const text = await page.evaluate(() => document.body.innerText).catch(() => '');
  const dialogOrToastCount = await page.locator(DIALOG_OR_TOAST_SELECTOR).count().catch(() => 0);
  return { url, textHash: hash(text), dialogOrToastCount, errorCount: errorCounter.count };
}

async function clickAndObserve(page, context, locator, errorCounter) {
  const before = await snapshotSignals(page, errorCounter);

  let newPageUrl = null;
  const newPagePromise = context.waitForEvent('page', { timeout: 2500 }).catch(() => null);

  let clickError = null;
  try {
    await locator.click({ timeout: 5000 });
  } catch (err) {
    clickError = String(err?.message || err).split('\n')[0];
  }

  const newPage = await newPagePromise;
  if (newPage) {
    try {
      await newPage.waitForLoadState('load', { timeout: 5000 });
      newPageUrl = newPage.url();
    } catch {
      newPageUrl = newPage.url();
    }
    await newPage.close().catch(() => {});
  }

  await page.waitForTimeout(CLICK_SETTLE_MS);
  const after = await snapshotSignals(page, errorCounter);

  const changed = {
    url: before.url !== after.url || !!newPageUrl,
    text: before.textHash !== after.textHash,
    dialogOrToast: before.dialogOrToastCount !== after.dialogOrToastCount,
    consoleErrors: before.errorCount !== after.errorCount,
  };
  const nothingHappened = !changed.url && !changed.text && !changed.dialogOrToast && !changed.consoleErrors && !clickError;

  return { before, after, newPageUrl, changed, nothingHappened, clickError };
}

async function crawlRoute(page, context, role, route, errorCounter, clickLog, flagged) {
  const url = `${BASE_URL}${route.path}`;
  await page.goto(url, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(NAV_SETTLE_MS);

  const controls = await page.locator(CONTROL_SELECTOR).all();
  console.log(`  ${route.path}: ${controls.length} control(s) found`);

  for (let i = 0; i < controls.length; i++) {
    // Re-query after each reload rather than reusing stale handles.
    const fresh = await page.locator(CONTROL_SELECTOR).all();
    const locator = fresh[i];
    if (!locator) continue;

    const name = await accessibleName(locator);
    const selector = await selectorHint(locator);

    if (DENY_PATTERN.test(name)) {
      clickLog.push({ role, route: route.path, name, selector, result: 'denied — not clicked' });
      continue;
    }

    const isEnabled = await locator.isEnabled().catch(() => false);
    if (!isEnabled) {
      clickLog.push({ role, route: route.path, name, selector, result: 'disabled — skipped' });
      continue;
    }

    const result = await clickAndObserve(page, context, locator, errorCounter);
    const signalStr = Object.entries(result.changed).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none';
    clickLog.push({
      role, route: route.path, name, selector,
      result: result.clickError
        ? `click error: ${result.clickError}`
        : result.nothingHappened
          ? 'NOTHING CHANGED'
          : `changed: ${signalStr}`,
    });

    if (result.nothingHappened) {
      flagged.push({ role, route: route.path, name, selector });
    }

    // Reset to a clean baseline before testing the next control.
    await page.goto(url, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(NAV_SETTLE_MS);
  }
}

// Spec §4's staff-entry reproduction, per the review correction: the Stage 1
// /jobs -> detail -> goBack() sequence is not the reported scenario. This
// follows the UI's own offered path — Job Adverts' "View public page"
// control — and reports the actual history mechanics, not just a landing
// URL, because this control opens a new tab (target="_blank") and a new tab
// starts with an empty history stack.
async function staffEntryBackLinkRepro(page, context, role) {
  await page.goto(`${BASE_URL}/recruiter/adverts`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(NAV_SETTLE_MS);

  const link = page.locator(`a[href="/jobs/${JOB_ID}"]`).first();
  const exists = await link.count().catch(() => 0);
  if (!exists) {
    return { role, outcome: 'Job Adverts "View public page" link not found for this role/seed data — could not reproduce.' };
  }

  const newPagePromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
  await link.click().catch(() => {});
  const newPage = await newPagePromise;

  if (!newPage) {
    return { role, outcome: 'Click did not open a new page within 5s — no tab to test back-navigation on.' };
  }

  await newPage.waitForLoadState('load', { timeout: 8000 }).catch(() => {});
  const openedUrl = newPage.url();
  const historyLengthAtOpen = await newPage.evaluate(() => window.history.length).catch(() => null);

  let backOutcome;
  let goBackError = null;
  try {
    // goBack() with no prior history entry in this tab resolves to null in
    // Playwright rather than throwing or navigating — captured explicitly.
    const nav = await newPage.goBack({ waitUntil: 'load', timeout: 4000 });
    backOutcome = nav ? newPage.url() : '(goBack() returned null — no previous entry in this tab\'s history)';
  } catch (err) {
    goBackError = String(err?.message || err).split('\n')[0];
    backOutcome = `(goBack() threw: ${goBackError})`;
  }

  const historyLengthAfterBack = await newPage.evaluate(() => window.history.length).catch(() => null);
  await newPage.close().catch(() => {});

  return {
    role,
    outcome:
      `Opened "${openedUrl}" in a NEW browser tab (target="_blank" — confirmed in JobAdvertsPage.tsx). ` +
      `history.length at open: ${historyLengthAtOpen}. ` +
      `After goBack() in that same tab: ${backOutcome}. ` +
      `history.length after: ${historyLengthAfterBack}.`,
  };
}

async function main() {
  const browser = await chromium.launch();
  const clickLog = [];
  const flagged = [];
  const backLinkResults = [];

  const staffIdentities = IDENTITIES.filter((i) => i.role !== 'signed-out');

  for (const identity of staffIdentities) {
    console.log(`\n=== ${identity.role} (interaction crawl) ===`);
    const context = await browser.newContext();
    const page = await context.newPage();
    const errorCounter = { count: 0 };
    page.on('console', (msg) => { if (msg.type() === 'error') errorCounter.count++; });
    page.on('pageerror', () => { errorCounter.count++; });

    try {
      await loginAs(page, identity);

      const routes = STAGE2_ROLE_ROUTES[identity.role] || [];
      for (const route of routes) {
        await crawlRoute(page, context, identity.role, route, errorCounter, clickLog, flagged);
      }

      // Staff-entry back-link repro only makes sense for a logged-in staff
      // identity reaching the public job view through the app's own UI.
      console.log(`  back-link staff-entry repro ...`);
      const blResult = await staffEntryBackLinkRepro(page, context, identity.role);
      backLinkResults.push(blResult);
      console.log(`  ${blResult.outcome}`);
    } catch (err) {
      console.error(`  ERROR for ${identity.role}: ${err.message}`);
      clickLog.push({ role: identity.role, route: '(identity-level failure)', name: '', selector: '', result: String(err.message || err) });
    } finally {
      await context.close();
    }
  }

  // One signed-out pass over the public, candidate-facing pages — ranked
  // above staff findings per spec §5.
  console.log(`\n=== signed-out (public pages, interaction crawl) ===`);
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errorCounter = { count: 0 };
    page.on('console', (msg) => { if (msg.type() === 'error') errorCounter.count++; });
    page.on('pageerror', () => { errorCounter.count++; });
    for (const route of PUBLIC_ROUTES) {
      await crawlRoute(page, context, 'signed-out', route, errorCounter, clickLog, flagged);
    }
    await context.close();
  }

  await browser.close();
  await writeReport(clickLog, flagged, backLinkResults);
  console.log(`\nReport written to ${REPORT_PATH}`);
}

async function writeReport(clickLog, flagged, backLinkResults) {
  const lines = [];
  lines.push('# Flow crawler — Stage 2 (write-path) report');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()}. Base URL: ${BASE_URL}.`);
  lines.push('');
  lines.push('This is a crawler report, not a verdict (docs/flow-crawler-spec.md §6). Scope: each role\'s own rendered pages plus the public pages tested signed out — not all 48 routes for all 5 identities, since Stage 1 showed every off-role route just bounces to the role\'s own dashboard.');
  lines.push('');
  lines.push('**Limitation:** only `button`, `a[href]`, `input[type=submit/button]`, `[role=button]` and `[role=menuitem]` were tested. Text inputs, checkboxes, radios and native `<select>` elements were not clicked. Controls revealed only after another control opens a modal are also out of scope — each route is reset to a clean reload before the next control on it is tested, so nested/modal-revealed controls from a prior click are not discovered.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Back-link check — staff-entry path (spec §4)');
  lines.push('');
  lines.push('Per review correction: Stage 1\'s `/jobs` → detail → `goBack()` sequence is not the reported scenario. This reproduces the actual UI-offered path — Job Adverts\' "View public page" control.');
  lines.push('');
  for (const r of backLinkResults) {
    lines.push(`### ${r.role}`);
    lines.push('');
    lines.push(r.outcome);
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push('## Flagged candidate dead controls (all four signals unchanged)');
  lines.push('');
  if (flagged.length === 0) {
    lines.push('None found.');
  } else {
    lines.push('| Role | Route | Accessible name | Selector |');
    lines.push('|---|---|---|---|');
    for (const f of flagged) {
      lines.push(`| ${f.role} | ${f.route} | ${f.name.replace(/\|/g, '\\|')} | \`${f.selector}\` |`);
    }
  }
  lines.push('');
  lines.push('This is a heuristic list to review, not a verdict (spec §3) — a toggle that changes one pixel, or a control that needs prior state, will show up here too.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Full click log');
  lines.push('');
  lines.push('| Role | Route | Accessible name | Selector | Result |');
  lines.push('|---|---|---|---|---|');
  for (const c of clickLog) {
    lines.push(`| ${c.role} | ${c.route} | ${(c.name || '').replace(/\|/g, '\\|')} | \`${c.selector}\` | ${c.result} |`);
  }
  lines.push('');

  await fs.writeFile(REPORT_PATH, lines.join('\n'), 'utf8');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
