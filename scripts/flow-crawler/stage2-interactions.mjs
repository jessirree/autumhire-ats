// Flow crawler — Stage 2, write-path (docs/flow-crawler-spec.md §3 step 4, §4).
//
// Clicks every interactive control not on the deny list (spec §1) and
// records whether anything observable changed, plus a dedicated
// reproduction of the staff-entry back-link scenario (spec §4).
//
// SAFETY — read before running:
//   - Requires the mail-safety gate closed in whatever backend this run
//     points at. For the emulator: functions/.env.local sets
//     MAIL_ENABLED=false, verified by an admin test email reporting
//     skipped (see session notes) — this script does not check that for
//     you.
//   - Requires CRAWLER_BASE_URL to point at a build that is actually
//     wired to the emulator (VITE_USE_EMULATOR=true baked in at build
//     time — confirm by grepping dist/assets/*.js for "127.0.0.1" before
//     trusting any run). Isolation itself is proven once by
//     prove-isolation.mjs, not by this script.
//   - Deny list matches on accessible name, never CSS class, and is
//     narrowed to destructive ACCOUNT actions only (sign out / log out /
//     delete account) — see DENY_PATTERN in config.mjs. Everything else
//     (create/save/post/submit/reject/approve/...) is clicked, because
//     Stage 2 only ever runs against the isolated emulator.
//
// RESUMABLE: results are appended one JSON object per line to
// scripts/flow-crawler-output/stage2.jsonl as they happen — never
// buffered in memory until the end, so a kill mid-run loses at most the
// one route in flight. A {type:"page-complete"} marker is written after
// each route; a rerun skips any role+route pair already marked, so this
// script can be re-invoked after an interruption without redoing work.
// Render the human-readable report from the jsonl at any time with
// stage2-aggregate.mjs — including against a partial file.
//
// ONE ROLE PER INVOCATION, to keep footprint down and so a crash/kill
// only affects the role in progress:
//   node scripts/flow-crawler/stage2-interactions.mjs admin
//   node scripts/flow-crawler/stage2-interactions.mjs recruiter
//   node scripts/flow-crawler/stage2-interactions.mjs hiring-manager
//   node scripts/flow-crawler/stage2-interactions.mjs candidate
//   node scripts/flow-crawler/stage2-interactions.mjs signed-out

import { chromium } from '@playwright/test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  BASE_URL, IDENTITIES, JOB_ID, OUTPUT_DIR,
  STAGE2_ROLE_ROUTES, PUBLIC_ROUTES, DENY_PATTERN,
} from './config.mjs';

const JSONL_PATH = path.join(OUTPUT_DIR, 'stage2.jsonl');
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots');
const NAV_SETTLE_MS = 1200;
const CLICK_SETTLE_MS = 900;

const CONTROL_SELECTOR = [
  'button:visible',
  'a[href]:visible',
  'input[type="submit"]:visible',
  'input[type="button"]:visible',
  '[role="button"]:visible',
  '[role="menuitem"]:visible',
].join(', ');

const DIALOG_OR_TOAST_SELECTOR = '[data-sonner-toast], [role="dialog"], [role="alertdialog"], dialog[open]';

const role = process.argv[2];
const VALID_ROLES = [...Object.keys(STAGE2_ROLE_ROUTES), 'signed-out'];
if (!VALID_ROLES.includes(role)) {
  console.error(`Usage: node scripts/flow-crawler/stage2-interactions.mjs <role>\nrole must be one of: ${VALID_ROLES.join(', ')}`);
  process.exit(1);
}

function slugify(s) {
  return s.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function hash(s) {
  return crypto.createHash('sha256').update(s || '').digest('hex');
}

// Flushed immediately on every call — never buffered until the run ends.
function appendRecord(record) {
  fs.appendFileSync(JSONL_PATH, JSON.stringify({ ...record, timestamp: new Date().toISOString() }) + '\n', 'utf8');
}

function loadCompletedRoutes(forRole) {
  const completed = new Set();
  if (!fs.existsSync(JSONL_PATH)) return completed;
  const lines = fs.readFileSync(JSONL_PATH, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const rec = JSON.parse(line);
      if (rec.type === 'page-complete' && rec.role === forRole) completed.add(rec.route);
    } catch {
      // Ignore a torn last line from a prior kill mid-write.
    }
  }
  return completed;
}

async function loginAs(page, identity) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.fill('#email', identity.email);
  await page.fill('#password', identity.password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 8000 })
    .catch(() => { throw new Error(`Login did not navigate away from /login for ${identity.email}.`); });
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

// Includes the control's ordinal index among the page's enumerated
// controls and, when present, the icon's lucide class name — without
// these, several visually-distinct icon-only buttons with no accessible
// name and no id/data-testid all render the identical bare "button" hint,
// which collapsed a dozen distinct dead-control candidates on
// /admin/workflow into one row in the report (undercounting the real
// work needed to fix them).
async function selectorHint(locator, ordinalIndex) {
  return locator.evaluate((el, idx) => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const dataTestId = el.getAttribute('data-testid');
    const svg = el.querySelector('svg');
    const iconClass = svg ? [...svg.classList].filter((c) => c !== 'lucide').join('.') : '';
    const base = dataTestId ? `${tag}[data-testid="${dataTestId}"]` : `${tag}${id}`;
    return `${base}${iconClass ? `[icon=${iconClass}]` : ''}#${idx}`;
  }, ordinalIndex).catch(() => `(unknown)#${ordinalIndex}`);
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
  // Fifth signal: a file download (export buttons, CV zips, etc.) changes
  // nothing about the URL/text/dialog/console but is very much "something
  // happened" — without this, every export control looks identically dead
  // to a genuinely broken one. This project has prior form here: an export
  // feature was once fully built, signed off, and unreachable because its
  // only caller had been deleted.
  let downloadPath = null;
  let downloadError = null;
  const downloadPromise = page.waitForEvent('download', { timeout: 4000 }).catch(() => null);

  let clickError = null;
  try {
    await locator.click({ timeout: 5000 });
  } catch (err) {
    clickError = String(err?.message || err).split('\n')[0];
  }

  const newPage = await newPagePromise;
  if (newPage) {
    try { await newPage.waitForLoadState('load', { timeout: 5000 }); } catch {}
    newPageUrl = newPage.url();
    await newPage.close().catch(() => {});
  }

  const download = await downloadPromise;
  if (download) {
    try {
      downloadPath = await download.path();
    } catch (err) {
      downloadError = String(err?.message || err).split('\n')[0];
    }
  }

  await page.waitForTimeout(CLICK_SETTLE_MS);
  const after = await snapshotSignals(page, errorCounter);

  const changed = {
    url: before.url !== after.url || !!newPageUrl,
    text: before.textHash !== after.textHash,
    dialogOrToast: before.dialogOrToastCount !== after.dialogOrToastCount,
    consoleErrors: before.errorCount !== after.errorCount,
    download: !!download,
  };
  const nothingHappened = !changed.url && !changed.text && !changed.dialogOrToast && !changed.consoleErrors && !changed.download && !clickError;

  let downloadInfo = null;
  if (download) {
    const fileSize = downloadPath ? fs.statSync(downloadPath).size : null;
    downloadInfo = {
      suggestedFilename: download.suggestedFilename(),
      arrived: !downloadError && !!downloadPath && (fileSize ?? 0) > 0,
      fileSize,
      downloadError,
    };
  }

  return { newPageUrl, changed, nothingHappened, clickError, downloadInfo };
}

// One page per route, closed when the route is done — avoids holding many
// navigations' worth of DOM/listener state open in a single long-lived page.
async function crawlRoute(context, roleName, route, errorCounter) {
  const url = `${BASE_URL}${route.path}`;
  const page = await context.newPage();
  page.on('console', (msg) => { if (msg.type() === 'error') errorCounter.count++; });
  page.on('pageerror', () => { errorCounter.count++; });

  await page.goto(url, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(NAV_SETTLE_MS);

  const screenshotPath = path.join(SCREENSHOTS_DIR, `stage2-${slugify(roleName)}__${slugify(route.path || 'root')}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

  const controlCount = await page.locator(CONTROL_SELECTOR).count().catch(() => 0);
  console.log(`  ${route.path}: ${controlCount} control(s) found`);

  for (let i = 0; i < controlCount; i++) {
    const fresh = await page.locator(CONTROL_SELECTOR).all();
    const locator = fresh[i];
    if (!locator) continue;

    const name = await accessibleName(locator);
    const selector = await selectorHint(locator, i);

    if (DENY_PATTERN.test(name)) {
      appendRecord({ type: 'control', role: roleName, route: route.path, name, selector, result: 'denied — not clicked', nothingHappened: false });
      continue;
    }

    const isEnabled = await locator.isEnabled().catch(() => false);
    if (!isEnabled) {
      appendRecord({ type: 'control', role: roleName, route: route.path, name, selector, result: 'disabled — skipped', nothingHappened: false });
      continue;
    }

    const result = await clickAndObserve(page, context, locator, errorCounter);
    const signalStr = Object.entries(result.changed).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none';
    let resultText;
    if (result.clickError) resultText = `click error: ${result.clickError}`;
    else if (result.downloadInfo) {
      resultText = result.downloadInfo.arrived
        ? `download arrived: ${result.downloadInfo.suggestedFilename} (${result.downloadInfo.fileSize} bytes)`
        : `DOWNLOAD DID NOT ARRIVE: ${result.downloadInfo.suggestedFilename}${result.downloadInfo.downloadError ? ` (${result.downloadInfo.downloadError})` : ''}`;
    } else if (result.nothingHappened) resultText = 'NOTHING CHANGED';
    else resultText = `changed: ${signalStr}`;

    appendRecord({
      type: 'control', role: roleName, route: route.path, name, selector,
      result: resultText,
      nothingHappened: result.nothingHappened,
      downloadInfo: result.downloadInfo,
    });

    await page.goto(url, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(NAV_SETTLE_MS);
  }

  await page.close();
  appendRecord({ type: 'page-complete', role: roleName, route: route.path });
}

// Spec §4's staff-entry reproduction: the UI's only offered path to the
// public job view from a staff dashboard is Job Adverts' "View public
// page" link, which is target="_blank" — a new tab starts with an empty
// history stack, so this reports the actual mechanics, not just a URL.
async function staffEntryBackLinkRepro(context, roleName) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/recruiter/adverts`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(NAV_SETTLE_MS);

  const link = page.locator(`a[href="/jobs/${JOB_ID}"]`).first();
  const exists = await link.count().catch(() => 0);
  if (!exists) {
    await page.close();
    return 'Job Adverts "View public page" link not found for this role/seed data — could not reproduce.';
  }

  const newPagePromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
  await link.click().catch(() => {});
  const newPage = await newPagePromise;

  if (!newPage) {
    await page.close();
    return 'Click did not open a new page within 5s — no tab to test back-navigation on.';
  }

  await newPage.waitForLoadState('load', { timeout: 8000 }).catch(() => {});
  const openedUrl = newPage.url();
  const historyLengthAtOpen = await newPage.evaluate(() => window.history.length).catch(() => null);

  let backOutcome;
  try {
    const nav = await newPage.goBack({ waitUntil: 'load', timeout: 4000 });
    backOutcome = nav ? newPage.url() : "(goBack() returned null — no previous entry in this tab's history)";
  } catch (err) {
    backOutcome = `(goBack() threw: ${String(err?.message || err).split('\n')[0]})`;
  }

  const historyLengthAfterBack = await newPage.evaluate(() => window.history.length).catch(() => null);
  await newPage.close().catch(() => {});
  await page.close();

  return `Opened "${openedUrl}" in a NEW browser tab (target="_blank"). history.length at open: ${historyLengthAtOpen}. After goBack() in that same tab: ${backOutcome}. history.length after: ${historyLengthAfterBack}.`;
}

async function main() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const isStaff = role !== 'signed-out';
  const routes = isStaff ? (STAGE2_ROLE_ROUTES[role] || []) : PUBLIC_ROUTES;
  const completed = loadCompletedRoutes(role);
  const remaining = routes.filter((r) => !completed.has(r.path));

  console.log(`=== ${role} (interaction crawl) ===`);
  console.log(`${routes.length} route(s) total, ${completed.size} already complete, ${remaining.length} to run.`);

  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext();
  const errorCounter = { count: 0 };

  try {
    if (isStaff) {
      const identity = IDENTITIES.find((i) => i.role === role);
      // Session (cookies/localStorage) lives on the context, not the page —
      // this page's only job is to establish it, then it's closed.
      const loginPage = await context.newPage();
      await loginAs(loginPage, identity);
      await loginPage.close();
    }
  } catch (err) {
    console.error(`Login failed for ${role}: ${err.message}`);
    await context.close();
    await browser.close();
    process.exit(1);
  }

  for (const route of remaining) {
    await crawlRoute(context, role, route, errorCounter);
  }

  if (isStaff && !completed.has('__backlink__')) {
    console.log('  back-link staff-entry repro ...');
    const outcome = await staffEntryBackLinkRepro(context, role);
    console.log(`  ${outcome}`);
    appendRecord({ type: 'backlink', role, outcome });
    appendRecord({ type: 'page-complete', role, route: '__backlink__' });
  }

  await context.close();
  await browser.close();
  console.log(`\nDone. Results appended to ${JSONL_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
