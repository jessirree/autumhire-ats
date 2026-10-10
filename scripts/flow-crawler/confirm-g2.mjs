// G2 acceptance confirmation — the actual duplicate-application race,
// through the real application form, not just the rules suite.
//
// Two browser contexts, same freshly-seeded candidate (never applied to
// JOB-TEST-9001), both load the form, both fill it out, both submit via
// Promise.all so neither's early hasAppliedToJob() check has a chance to
// see the other's write first — the real race the atomic guard exists
// for. Reports: did exactly one succeed, what did the loser's session
// actually show (not a description — the literal rendered error text).
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const sa = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const BASE_URL = 'http://localhost:4173';
const EMAIL = 'g2-fresh@test.autumhire.local';
const PASSWORD = 'TestPass123!';
const JOB_ID = 'JOB-TEST-9001';

// A tiny real one-page PDF (same source as seed-test-users.cjs's fixture).
const PDF_PATH = './scripts/flow-crawler/.g2-test-cv.pdf';
writeFileSync(
  PDF_PATH,
  Buffer.from(
    'JVBERi0xLjMKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUgo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagozIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAovQ29udGVudHMgOCAwIFIgL01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCA3IDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9QYWdlTW9kZSAvVXNlTm9uZSAvUGFnZXMgNyAwIFIgL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0F1dGhvciAoYW5vbnltb3VzKSAvQ3JlYXRpb25EYXRlIChEOjIwMjYxMDAyMTQxNjUyKzAzJzAwJykgL0NyZWF0b3IgKGFub255bW91cykgL0tleXdvcmRzICgpIC9Nb2REYXRlIChEOjIwMjYxMDAyMTQxNjUyKzAzJzAwJykgL1Byb2R1Y2VyIChSZXBvcnRMYWIgUERGIExpYnJhcnkgLSBcKG9wZW5zb3VyY2VcKSkgCiAgL1N1YmplY3QgKHVuc3BlY2lmaWVkKSAvVGl0bGUgKHVudGl0bGVkKSAvVHJhcHBlZCAvRmFsc2UKPj4KZW5kb2JqCjcgMCBvYmoKPDwKL0NvdW50IDEgL0tpZHMgWyA0IDAgUiBdIC9UeXBlIC9QYWdlcwo+PgplbmRvYmoKOCAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAyMDUKPj4Kc3RyZWFtCkdhcldwXyRcJTUmLVVALF5MRTVnK2EuQSNrOjYtTUpuNEJtUk9xUi8oLyJIJ2BbRl9OIVhrRlBIJVw6RDkhZScnSlslP004OnQsQ1RhTDksMi5uQWlkLm8zRE1qLUVANSJBYnFYaUg8N19gNk4oaSE0TXVEK0JrU1xsOEhUXk5mTDRMa0UlTVUpYlVcRi11cD5SZmpIRkdXWC1YYTBlZ1tyMCNHZzBwYVcxQFprdW1mWU1dLSdFcXVONW9BUlZRaFhvOWFJWSs5Ni8pfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA5CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTAyIDAwMDAwIG4gCjAwMDAwMDAyMDkgMDAwMDAgbiAKMDAwMDAwMDMyMSAwMDAwMCBuIAowMDAwMDAwNTI0IDAwMDAwIG4gCjAwMDAwMDA1OTIgMDAwMDAgbiAKMDAwMDAwMDg1MyAwMDAwMCBuIAowMDAwMDAwOTEyIDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIApbPGQ5ODU4OWUxODYyNjE5OGY3MTQ1M2I2YmJkYWZmYWE2PjxkOTg1ODllMTg2MjYxOThmNzE0NTNiNmJiZGFmZmFhNj5dCiUgUmVwb3J0TGFiIGdlbmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChvcGVuc291cmNlKQoKL0luZm8gNiAwIFIKL1Jvb3QgNSAwIFIKL1NpemUgOQo+PgpzdGFydHhyZWYKMTIwNwolJUVPRgo=',
    'base64'
  )
);

async function fillRequiredFields(page) {
  // Generic: walk every required, visible, empty text/number input and
  // fill it; select the first non-empty option on every required select.
  const inputs = await page.locator('input[required]:visible').all();
  for (const input of inputs) {
    const type = await input.getAttribute('type');
    if (type === 'checkbox' || type === 'file' || type === 'date') continue;
    const value = await input.inputValue().catch(() => '');
    if (!value) await input.fill(type === 'number' ? '3' : 'Test value').catch(() => {});
  }
  const dateInputs = await page.locator('input[required][type="date"]:visible').all();
  for (const d of dateInputs) await d.fill('1995-01-01').catch(() => {});

  const selects = await page.locator('select[required]:visible').all();
  for (const select of selects) {
    const value = await select.inputValue().catch(() => '');
    if (!value) {
      const options = await select.locator('option').all();
      for (const opt of options) {
        const v = await opt.getAttribute('value');
        if (v) { await select.selectOption(v); break; }
      }
    }
  }

  const textareas = await page.locator('textarea[required]:visible').all();
  for (const t of textareas) {
    const value = await t.inputValue().catch(() => '');
    if (!value) await t.fill('Test answer.').catch(() => {});
  }

  await page.locator('input[type="file"]').first().setInputFiles(PDF_PATH);
  await page.locator('input[type="checkbox"]').last().check(); // consent is the last checkbox on the form
}

const browser = await chromium.launch();
const contextA = await browser.newContext();
const contextB = await browser.newContext();

async function loginAndOpenForm(context) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 8000 });
  await page.goto(`${BASE_URL}/jobs/${JOB_ID}/apply`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await fillRequiredFields(page);
  return page;
}

const [pageA, pageB] = await Promise.all([loginAndOpenForm(contextA), loginAndOpenForm(contextB)]);

console.log('Both sessions have the form filled. Submitting both simultaneously...');
await Promise.all([
  pageA.getByRole('button', { name: /Submit Application/ }).click(),
  pageB.getByRole('button', { name: /Submit Application/ }).click(),
]);
await pageA.waitForTimeout(2500);
await pageB.waitForTimeout(2500);

async function describeOutcome(page, label) {
  const url = page.url();
  const bodyText = await page.locator('body').innerText();
  const errorBanner = await page.locator('[role="alert"], .text-red-600, .text-red-700, .bg-red-50').allInnerTexts().catch(() => []);
  console.log(`\n=== ${label} ===`);
  console.log('URL after submit:', url);
  console.log('Still on the apply page:', url.includes('/apply'));
  console.log('Visible error-styled text on page:', JSON.stringify(errorBanner.filter(Boolean)));
}

await describeOutcome(pageA, 'Session A');
await describeOutcome(pageB, 'Session B');

await browser.close();

// Ground truth, read directly from Firestore — how many Applications
// actually exist for this candidate/job now, regardless of what either
// page appeared to show.
const appsSnap = await db.collection('Applications').where('jobId', '==', JOB_ID).get();
const matchingApps = appsSnap.docs.filter((d) => d.data().email === EMAIL);
console.log('\n=== Ground truth from Firestore ===');
console.log('Applications for this candidate+job:', matchingApps.length, matchingApps.map((d) => d.id));
