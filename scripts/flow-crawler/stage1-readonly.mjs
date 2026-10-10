// Flow crawler — Stage 1, read-only (docs/flow-crawler-spec.md §3 steps 1-3).
//
// Signs in as each seeded role (plus one signed-out pass), visits every
// route declared in src/App.tsx, and records: URL requested, URL landed on
// (after any redirect), console errors, and a screenshot. CLICKS NOTHING
// beyond the login form itself — no in-app control is ever pressed here.
//
// Also runs the back-link check from spec §4 for every logged-in identity:
// open the public job detail view, then page.goBack(), and record where it
// lands — this is a browser-level back navigation, not a click on any
// control, so it stays inside "click nothing".
//
// NOT part of any pnpm test command. Run manually:
//   node scripts/flow-crawler/stage1-readonly.mjs
//
// Preconditions (spec §1) — the operator's responsibility, not this
// script's: dev server running on BASE_URL, database seeded via
// scripts/seed-test-users.cjs. Stage 1 never clicks an in-app control and
// never submits a form, so it carries none of the mail/write risk the
// spec's deny-list exists for — that gate applies to Stage 2, not this.

import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BASE_URL, IDENTITIES, ROUTES, JOB_ID, OUTPUT_DIR } from './config.mjs';

const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots');
const REPORT_PATH = path.join(OUTPUT_DIR, 'stage1-report.md');
const NAV_SETTLE_MS = 1500; // let AuthContext/Firestore resolve and React render after a client-side redirect

function slugify(s) {
  return s.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

async function loginAs(page, identity) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.fill('#email', identity.email);
  await page.fill('#password', identity.password);
  await page.click('button[type="submit"]');
  // Successful login navigates away from /login via RootRedirect; a failed
  // one stays and shows an error banner. Wait for either, rather than a
  // fixed delay, so a real auth failure surfaces immediately instead of
  // silently producing 48 rows of "still on /login".
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 8000 })
    .catch(() => {
      throw new Error(`Login did not navigate away from /login for ${identity.email} — check credentials/seed data.`);
    });
  await page.waitForTimeout(NAV_SETTLE_MS);
}

async function visitRoute(page, identity, route, consoleErrors) {
  consoleErrors.length = 0;
  let httpStatus = null;
  let navError = null;
  try {
    const response = await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'load', timeout: 15000 });
    httpStatus = response ? response.status() : null;
  } catch (err) {
    navError = String(err?.message || err);
  }
  await page.waitForTimeout(NAV_SETTLE_MS);

  const urlLanded = (() => {
    try {
      return new URL(page.url()).pathname + new URL(page.url()).search;
    } catch {
      return page.url();
    }
  })();

  const screenshotName = `${slugify(identity.role)}__${slugify(route.path || 'root')}.png`;
  const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch((err) => {
    navError = navError || `screenshot failed: ${err.message}`;
  });

  return {
    role: identity.role,
    label: route.label,
    urlRequested: route.path,
    urlLanded,
    httpStatus,
    navError,
    consoleErrors: [...consoleErrors],
    screenshot: path.relative(OUTPUT_DIR, screenshotPath),
  };
}

async function backLinkCheck(page, identity, consoleErrors) {
  consoleErrors.length = 0;
  await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.goto(`${BASE_URL}/jobs/${JOB_ID}`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const beforeBack = page.url();
  await page.goBack({ waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(NAV_SETTLE_MS);
  const afterBack = page.url();

  const screenshotName = `${slugify(identity.role)}__back-link-check.png`;
  const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

  return {
    role: identity.role,
    openedJobDetailAt: beforeBack,
    landedAfterBack: afterBack,
    consoleErrors: [...consoleErrors],
    screenshot: path.relative(OUTPUT_DIR, screenshotPath),
  };
}

async function main() {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch();
  const routeResults = [];
  const backLinkResults = [];

  for (const identity of IDENTITIES) {
    console.log(`\n=== ${identity.role} ===`);
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(`[uncaught] ${err.message}`);
    });

    try {
      if (identity.email) {
        await loginAs(page, identity);
      }

      for (const route of ROUTES) {
        process.stdout.write(`  ${route.path} ... `);
        const result = await visitRoute(page, identity, route, consoleErrors);
        routeResults.push(result);
        console.log(`landed ${result.urlLanded}${result.consoleErrors.length ? ` (${result.consoleErrors.length} console error[s])` : ''}`);
      }

      if (identity.email) {
        process.stdout.write(`  back-link check ... `);
        const blResult = await backLinkCheck(page, identity, consoleErrors);
        backLinkResults.push(blResult);
        console.log(`landed ${blResult.landedAfterBack}`);
      }
    } catch (err) {
      console.error(`  ERROR for ${identity.role}: ${err.message}`);
      routeResults.push({
        role: identity.role,
        label: '(identity-level failure)',
        urlRequested: '(n/a)',
        urlLanded: '(n/a)',
        httpStatus: null,
        navError: String(err.message || err),
        consoleErrors: [],
        screenshot: '',
      });
    } finally {
      await context.close();
    }
  }

  await browser.close();
  await writeReport(routeResults, backLinkResults);
  console.log(`\nReport written to ${REPORT_PATH}`);
}

async function writeReport(routeResults, backLinkResults) {
  const lines = [];
  lines.push('# Flow crawler — Stage 1 (read-only) report');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()}. Base URL: ${BASE_URL}.`);
  lines.push('');
  lines.push('Read-only: every row below comes from `page.goto()` only. No in-app control was clicked and no form was submitted, except the login form itself to establish each session.');
  lines.push('');
  lines.push('This is a crawler report, not a verdict — a separate pass reads this alongside the screenshots to decide what is a real defect (docs/flow-crawler-spec.md §6).');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Back-link check (spec §4 — "the back link bug")');
  lines.push('');
  lines.push('| Role | Opened job detail at | Landed after back | Console errors | Screenshot |');
  lines.push('|---|---|---|---|---|');
  for (const r of backLinkResults) {
    lines.push(`| ${r.role} | ${r.openedJobDetailAt} | **${r.landedAfterBack}** | ${r.consoleErrors.length} | ${r.screenshot} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Every route, every role');
  lines.push('');
  lines.push('| Role | Route | URL requested | URL landed on | HTTP | Console errors | Screenshot |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const r of routeResults) {
    const errCell = r.navError
      ? `**nav error:** ${r.navError.slice(0, 200)}`
      : String(r.consoleErrors.length);
    lines.push(`| ${r.role} | ${r.label} | \`${r.urlRequested}\` | \`${r.urlLanded}\` | ${r.httpStatus ?? '—'} | ${errCell} | ${r.screenshot} |`);
  }
  lines.push('');

  // Console error detail, broken out separately so the main table stays scannable.
  const withErrors = routeResults.filter((r) => r.consoleErrors.length > 0);
  if (withErrors.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Console error detail');
    lines.push('');
    for (const r of withErrors) {
      lines.push(`### ${r.role} — ${r.label} (\`${r.urlRequested}\`)`);
      for (const e of r.consoleErrors) lines.push(`- ${e}`);
      lines.push('');
    }
  }

  await fs.writeFile(REPORT_PATH, lines.join('\n'), 'utf8');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
