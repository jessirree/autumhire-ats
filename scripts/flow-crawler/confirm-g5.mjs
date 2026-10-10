// G5 acceptance confirmation — run, not described. Two parts:
//
// 1. Schedule a REAL interview through the actual recruiter UI (not a
//    hand-seeded document), so the notification body is produced by the
//    real scheduleInterview() code path, then read that notification's
//    literal body back from Firestore via the Admin SDK.
// 2. Load the candidate dashboard after ONE reload and dump the relevant
//    DOM to confirm both what's present (date/time/mode/location/
//    instructions) and what's absent (panel name/score/comment), against
//    a worst-case hand-seeded Interview (scores as a legacy array field
//    directly on the parent document — the shape the original rules
//    concern was about).
import { chromium } from '@playwright/test';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const sa = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const BASE_URL = 'http://localhost:4173';
const CANDIDATE_INSTRUCTIONS = 'CONFIRM-G5-INSTRUCTION: bring two forms of ID and arrive 15 minutes early.';

const browser = await chromium.launch();

// ── Part 1: real scheduling through the real UI ──────────────────────────
{
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.fill('#email', 'recruiter@test.autumhire.local');
  await page.fill('#password', 'TestPass123!');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 8000 });

  await page.goto(`${BASE_URL}/recruiter/interviews`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Schedule Interview' }).click();
  await page.waitForTimeout(800);

  // Scoped to the modal overlay — the page behind it has its own
  // status-filter <select>, which page.locator('select').first() would
  // otherwise hit instead of the dialog's candidate dropdown.
  const modal = page.locator('div.fixed.inset-0');
  await modal.locator('select').first().selectOption({ label: 'Ólafur Jónsson — Research Data Analyst (TEST)' });
  await modal.locator('input[type="datetime-local"]').fill('2026-12-01T10:00');
  await modal.locator('input[type="number"]').fill('30');
  await modal.getByText('Mode', { exact: true }).locator('xpath=following-sibling::select').first().selectOption('phone');
  await modal.getByPlaceholder('Room A / meet.google.com/…').fill('CONFIRM-G5-LOCATION: +1-555-0100');
  await modal.getByPlaceholder(/Bring a photo ID/).fill(CANDIDATE_INSTRUCTIONS);
  // First panel checkbox — whichever staff member is first in the list.
  await modal.locator('input[type="checkbox"]').first().check();
  await modal.getByRole('button', { name: 'Schedule & Notify' }).click();
  await page.waitForTimeout(1500);

  const toastText = await page.locator('body').innerText();
  console.log('=== Part 1: real scheduling via the UI ===');
  console.log('Post-submit page contains "Schedule Interview" dialog still open:', toastText.includes('Schedule Interview') && toastText.includes('Candidate (shortlisted)'));

  await context.close();
}

const notifSnap = await db.collection('Notifications')
  .where('type', '==', 'interview')
  .orderBy('createdAt', 'desc')
  .limit(1)
  .get();
console.log('\nNotification doc(s) found:', notifSnap.size);
if (!notifSnap.empty) {
  const n = notifSnap.docs[0].data();
  console.log('title:', n.title);
  console.log('body (verbatim):', n.body);
  console.log('body contains mode ("Phone call"):', n.body.includes('Phone call'));
  console.log('body contains duration ("30 minutes"):', n.body.includes('30 minutes'));
  console.log('body contains location:', n.body.includes('CONFIRM-G5-LOCATION'));
  console.log('body contains instructions:', n.body.includes(CANDIDATE_INSTRUCTIONS));
}

// ── Part 2: candidate dashboard DOM dump ─────────────────────────────────
{
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.fill('#email', 'candidate1@test.autumhire.local');
  await page.fill('#password', 'TestPass123!');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 8000 });
  await page.waitForTimeout(1000);
  // "One reload" per the acceptance criteria.
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const card = await page.locator('h3:has-text("Interview scheduled")').locator('xpath=..').first().innerHTML().catch(() => '(card not found)');
  console.log('\n=== Part 2: candidate dashboard interview card — full innerHTML ===');
  console.log(card);

  const fullHtml = await page.content();
  console.log('\n=== Leak check against the FULL page HTML (worst-case seeded doc) ===');
  for (const s of ['SECRET-PANELIST-NAME-Mwangi', 'SECRET-INTERVIEW-QUESTION', 'SECRET-SCORE-COMMENT']) {
    console.log(fullHtml.includes(s) ? `LEAKED: ${s}` : `absent (correct): ${s}`);
  }

  await context.close();
}

await browser.close();
