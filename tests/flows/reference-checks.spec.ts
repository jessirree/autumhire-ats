// Flow suite — "Reference checks" stage (docs/requirements-source.md).
// Bucket B: the UI shows "Generate Reference Email" and a "sent" status
// regardless of whether anything was actually emailed — that's the exact
// historical bug (see offerService.ts's comment on createReferenceCheck).
// A DOM check of the UI's own claim proves nothing here, so the assertion
// reads the Notifications document the real action produced instead.
// Runnable alone: `npx playwright test tests/flows/reference-checks.spec.ts`.
import { test, expect } from '@playwright/test';
import { collection, doc, getDocs, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { BASE_URL, emulatorApp, loginAs, signInAs } from './helpers';

const APP_ID = 'APP-FLOW-REF2';
const CANDIDATE_NAME = 'Flow Suite REF-2 Candidate';
const JOB_TITLE = 'Flow Suite Referee Role (REF-2)';
const REFEREE_EMAIL = 'referee-flow-ref2@example.test';
const REFEREE_NAME = 'Flow Suite Referee';

test.beforeAll(async () => {
  await signInAs('admin');
  const { db } = emulatorApp();
  await setDoc(doc(db, 'Applications', APP_ID), {
    jobId: 'JOB-TEST-9001',
    jobTitle: JOB_TITLE,
    department: 'QA',
    candidateId: 'flow-suite-ref2-candidate',
    candidateName: CANDIDATE_NAME,
    email: 'flow-ref2@test.autumhire.local',
    isInternal: false,
    workedHereBefore: false,
    answers: [],
    prescreenScore: 0,
    status: 'shortlisted',
    statusHistory: [],
    consentGiven: true,
    appliedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
});

test('REF-2: adding a referee genuinely emails them, with content built from the application', async ({ page }) => {
  await loginAs(page, 'recruiter');
  await page.goto(`${BASE_URL}/recruiter/candidate-detail/${APP_ID}`, { waitUntil: 'load' });
  // Positive control: wait for the real candidate detail to render (proves
  // getApplicationById resolved) before doing anything — this page has no
  // negative assertion, but the same "don't act before data loads" logic
  // applies to driving the UI, not just to checking absence.
  await expect(page.getByRole('button', { name: 'Add Referee' })).toBeVisible({ timeout: 8000 });

  await page.getByRole('button', { name: 'Add Referee' }).click();
  await page.getByPlaceholder('Referee name *').fill(REFEREE_NAME);
  await page.getByPlaceholder('Referee email *').fill(REFEREE_EMAIL);
  await page.getByRole('button', { name: 'Generate Reference Email' }).click();
  // The UI's own "sent" status is exactly what used to lie — wait for the
  // form to close (the one DOM signal the action completed) rather than
  // trusting a status label as proof of anything.
  await expect(page.getByRole('button', { name: 'Add Referee' })).toBeVisible({ timeout: 8000 });

  // Not a browser assertion: read the real Notification document the
  // action produced and check who it's actually addressed to and what
  // it actually says, as staff (the UI's displayed "sent" status is not
  // the thing being trusted here).
  await signInAs('admin');
  const { db } = emulatorApp();
  const snap = await getDocs(
    query(collection(db, 'Notifications'), where('type', '==', 'reference-check'), where('email', '==', REFEREE_EMAIL))
  );
  expect(snap.size, 'exactly one reference-check notification should exist for this referee').toBe(1);
  const notification = snap.docs[0].data();
  expect(notification.email).toBe(REFEREE_EMAIL);
  // Content source: built from the Application (candidate name + job
  // title), not some other record — this is literally what "genuinely
  // emails them" means here, not just that *a* document exists.
  expect(notification.body).toContain(CANDIDATE_NAME);
  expect(notification.body).toContain(JOB_TITLE);
});
