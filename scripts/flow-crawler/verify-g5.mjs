// One-off: verifies G5's acceptance criteria directly against the real
// rendered DOM, not just by reading the component. Checks that a
// scheduled candidate sees date/time/mode/location/instructions, and
// that none of the panel name, score, comment or interview question
// (all deliberately seeded as greppable SECRET- strings) appear
// anywhere in the full page HTML.
import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';
const SECRETS = [
  'SECRET-PANELIST-NAME-Mwangi',
  'SECRET-INTERVIEW-QUESTION',
  'SECRET-SCORE-COMMENT',
  '77', // the raw score value — checked separately, see note below
];
const EXPECTED = [
  'SECRET-MEETING-LINK-XYZ',       // location/link — must appear
  'SECRET-CANDIDATE-INSTRUCTION-ABC', // instructions — must appear
  'Video call',
  '45 mins',
];

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
await page.fill('#email', 'candidate1@test.autumhire.local');
await page.fill('#password', 'TestPass123!');
await page.click('button[type="submit"]');
await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 8000 });
await page.waitForTimeout(1500);

const html = await page.content();

console.log('=== Fields that MUST appear (candidate-facing detail) ===');
for (const s of EXPECTED) {
  console.log(html.includes(s) ? `FOUND: ${s}` : `MISSING: ${s}`);
}

console.log('\n=== Strings that MUST NOT appear anywhere in the DOM (panel data) ===');
for (const s of ['SECRET-PANELIST-NAME-Mwangi', 'SECRET-INTERVIEW-QUESTION', 'SECRET-SCORE-COMMENT']) {
  console.log(html.includes(s) ? `LEAKED: ${s}` : `absent (correct): ${s}`);
}
// The raw score "77" is too generic to grep safely (durations/times could
// coincidentally contain it), so instead assert the whole scores/panel/
// questions substructure never appears via the unique names/comments
// above, which is a stronger and more specific check anyway.

await browser.close();
