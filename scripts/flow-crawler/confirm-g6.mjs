// G6 concurrency confirmation — never run before. Same pattern as G2:
// real browser sessions against the real UI, through the emulator, not
// just the rules suite.
//
// Part A: two DIFFERENT panelists, same interview, save via Promise.all —
// the scenario G6 was built for. Report whether both scores survive and
// whether the average reflects both.
// Part B: one panelist saves twice in sequence (create, then update) —
// confirms logAudit fires with the right action both times.
import { chromium } from '@playwright/test';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const sa = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const BASE_URL = 'http://localhost:4173';
const INTERVIEW_ID = 'G6-RETEST-01';

async function openManageAndSetScore(context, email, score, comment) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.fill('#email', email);
  await page.fill('#password', 'TestPass123!');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 8000 });
  await page.goto(`${BASE_URL}/hiring/interviews`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.getByRole('row', { name: /Asha Wanjiru/ }).getByRole('button', { name: 'Manage' }).click();
  await page.waitForTimeout(500);
  const modal = page.locator('div.fixed.inset-0');
  await modal.locator('input[type="number"]').fill(String(score));
  await modal.getByPlaceholder('Detailed comments…').fill(comment);
  return { page, modal };
}

async function clickSave(modal) {
  await modal.getByRole('button', { name: 'Save my score' }).click();
}

const browser = await chromium.launch();

// ── Part A: two different panelists racing on the same interview ────────
console.log('=== Part A: two different panelists, Promise.all ===');
const contextP1 = await browser.newContext();
const contextP2 = await browser.newContext();

const [{ page: p1, modal: m1 }, { page: p2, modal: m2 }] = await Promise.all([
  openManageAndSetScore(contextP1, 'panel1@test.autumhire.local', 85, 'Panel 1 comment'),
  openManageAndSetScore(contextP2, 'panel2@test.autumhire.local', 60, 'Panel 2 comment'),
]);

await Promise.all([clickSave(m1), clickSave(m2)]);
await Promise.all([p1.waitForTimeout(1500), p2.waitForTimeout(1500)]);

const toastP1 = await p1.locator('[data-sonner-toast]').allInnerTexts().catch(() => []);
const toastP2 = await p2.locator('[data-sonner-toast]').allInnerTexts().catch(() => []);
console.log('panel1 toast:', JSON.stringify(toastP1));
console.log('panel2 toast:', JSON.stringify(toastP2));

const scoresSnap = await db.collection('Interviews').doc(INTERVIEW_ID).collection('scores').get();
const scores = scoresSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
console.log('\nScores subcollection after the race:', JSON.stringify(scores, null, 2));
const avg = scores.length ? Math.round((scores.reduce((s, x) => s + x.score, 0) / scores.length) * 10) / 10 : null;
console.log('Both scores survived:', scores.length === 2);
console.log('Computed average reflects both (85+60)/2=72.5:', avg);

await contextP1.close();
await contextP2.close();

// ── Part B: one panelist saves twice — create, then update ──────────────
console.log('\n=== Part B: same panelist, create then update ===');
const beforeAuditSnap = await db.collection('AuditLog')
  .where('entity', '==', 'Interview')
  .where('entityId', '==', INTERVIEW_ID)
  .get();
const beforeCount = beforeAuditSnap.size;

const contextP1b = await browser.newContext();
const { page: p1b, modal: m1b } = await openManageAndSetScore(contextP1b, 'panel1@test.autumhire.local', 90, 'Updated comment');
await clickSave(m1b);
await p1b.waitForTimeout(1200);

const afterAuditSnap = await db.collection('AuditLog')
  .where('entity', '==', 'Interview')
  .where('entityId', '==', INTERVIEW_ID)
  .orderBy('at', 'asc')
  .get();
const entries = afterAuditSnap.docs.map((d) => d.data());
console.log('AuditLog entries for this interview, in order:');
entries.forEach((e) => console.log(` - action=${e.action} detail="${e.detail}"`));
console.log('New entries from this part:', afterAuditSnap.size - beforeCount);

await contextP1b.close();
await browser.close();
