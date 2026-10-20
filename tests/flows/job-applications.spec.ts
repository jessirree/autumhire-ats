// Flow suite — "Job applications" stage (docs/requirements-source.md).
// Each test is named by its requirement ID so the JSONL reporter output
// (tests/flows/results.jsonl) maps one-to-one onto docs/traceability-v2.md.
// Runnable alone: `npx playwright test tests/flows/job-applications.spec.ts`
// (against the emulator + dev server; see package.json's test:flows script).
import { test, expect } from '@playwright/test';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { BASE_URL, emulatorApp, loginAs, signInAs } from './helpers';

const FLOW_JOB_ID = 'JOB-FLOW-APP7'; // no CV/cover letter requirement — used by APP-7 and APP-13
const APP4_JOB_ID = 'JOB-FLOW-APP4'; // requireResume: true — dedicated so APP-4 isn't muddied by APP-7/APP-13's minimal job

function baseJob(id: string, title: string, overrides: Record<string, unknown>) {
  return {
    referenceNumber: id,
    title,
    department: 'QA',
    location: 'Remote',
    jobType: 'Full-time',
    remoteType: 'Remote',
    description: 'Seeded by tests/flows/job-applications.spec.ts. Safe to delete.',
    status: 'Active',
    advertType: 'external',
    isConfidential: false,
    showOnCareerSite: true,
    isFeatured: false,
    requireResume: false,
    requireCoverLetter: false,
    allowOtherDocuments: false,
    questions: [],
    hiringTeam: [],
    closingDate: '2099-12-31',
    createdBy: 'flow-suite',
    createdByName: 'Flow Suite',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    postedAt: Timestamp.now(),
    ...overrides,
  };
}

test.beforeAll(async () => {
  // Setup only — not what's under test. Written directly via the client
  // SDK rather than through the five-step CreateJob wizard — faster and
  // just as real, since what these tests exercise is what happens on the
  // apply form itself, not how the job was authored.
  await signInAs('admin');
  const { db } = emulatorApp();
  await setDoc(doc(db, 'Jobs', FLOW_JOB_ID), baseJob(FLOW_JOB_ID, 'Flow Suite Test Role (APP-7)', {}));
  await setDoc(doc(db, 'Jobs', APP4_JOB_ID), baseJob(APP4_JOB_ID, 'Flow Suite Resume-Required Role (APP-4)', {
    requireResume: true,
  }));
});

async function fillBioData(page: import('@playwright/test').Page) {
  const form = page.locator('form');
  await form.locator('input[type="tel"]').fill('0700000000');
  await form.locator('input[type="date"]').fill('1995-01-01');
  await form.locator('select').first().selectOption({ label: 'Other' }); // Gender — the only <select> before "source"
  const textInputs = form.locator('input[type="text"]');
  await textInputs.nth(0).fill('Testland'); // Nationality
  await textInputs.nth(1).fill('Testville'); // Current City
  await textInputs.nth(2).fill('Testland'); // Country of Residence
  await form.locator('input[type="checkbox"]').last().check(); // consent
}

test('APP-7: the system does not allow a duplicate application for the same job', async ({ page }) => {
  await loginAs(page, 'candidate1');

  // First application for this job: must succeed. Positive control before
  // the negative assertion: wait for the real form to render (proving the
  // async hasAppliedToJob() check has resolved) before asserting the
  // "already applied" banner's absence — otherwise toHaveCount(0) could
  // pass trivially while that check is still in flight, same shape as the
  // JA-12 bug documented in tests/flows/README.md.
  await page.goto(`${BASE_URL}/jobs/${FLOW_JOB_ID}/apply`, { waitUntil: 'load' });
  await expect(page.getByRole('button', { name: 'Submit Application' })).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("You've already applied")).toHaveCount(0);
  await fillBioData(page);
  await page.getByRole('button', { name: 'Submit Application' }).click();
  // ApplicationFormWrapper's onSubmit navigates back to /jobs on success —
  // the assertion is "left the apply page", not a specific destination.
  await page.waitForURL((url) => !url.pathname.endsWith('/apply'), { timeout: 10000 });

  // Second attempt at the SAME job, same candidate: must be blocked, not
  // shown the form again. This is the literal requirement text ("the
  // system should not allow duplicate application for the same job").
  await page.goto(`${BASE_URL}/jobs/${FLOW_JOB_ID}/apply`, { waitUntil: 'load' });
  await expect(page.getByText("You've already applied")).toBeVisible({ timeout: 8000 });
});

test('APP-10: candidates can subscribe to Autumhire job alerts', async ({ page }) => {
  await loginAs(page, 'candidate1');
  await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'load' });
  // A full page navigation re-triggers Firebase Auth's async persistence
  // restore; handleToggleAlerts bounces to /login if it fires before
  // AuthContext's `user` resolves. "Sign Out" only renders once it has,
  // so waiting for it avoids racing a click against that restore.
  await page.getByRole('button', { name: 'Sign Out' }).waitFor({ state: 'visible', timeout: 8000 });

  const alertsButton = page.getByRole('button', { name: /Alerts/ });
  const startedSubscribed = (await alertsButton.textContent())?.includes('Unsubscribe') ?? false;

  // Toggle on, if not already subscribed from a previous run. The durable
  // assertion is the button's persisted state after a reload (a genuine
  // Firestore write the rule permitted) — not the transient toast, which
  // sonner can dismiss before a slow CI runner gets to check for it.
  if (!startedSubscribed) {
    await alertsButton.click();
    await expect(alertsButton).toContainText('Unsubscribe from Alerts', { timeout: 8000 });
    await page.reload({ waitUntil: 'load' });
    await expect(page.getByRole('button', { name: /Alerts/ })).toContainText('Unsubscribe from Alerts');
  } else {
    await expect(alertsButton).toContainText('Unsubscribe from Alerts');
  }

  // Leave state as we found it so the test is repeatable.
  await page.getByRole('button', { name: /Alerts/ }).click();
});

test('APP-4: the system alerts when a required document is missing, rather than submitting silently', async ({ page }) => {
  await loginAs(page, 'candidate2');
  await page.goto(`${BASE_URL}/jobs/${APP4_JOB_ID}/apply`, { waitUntil: 'load' });
  await fillBioData(page);
  // Deliberately do NOT attach the CV — job.requireResume is true here and
  // the candidate has no saved CV to fall back on, so the file input's own
  // `required` attribute should block the native form submission.
  await page.getByRole('button', { name: 'Submit Application' }).click();

  const cvInput = page.locator('form input[type="file"]').first();
  await expect(cvInput).toHaveJSProperty('validity.valid', false);
  // Blocked client-side, before any network round trip — still on the apply form.
  await expect(page).toHaveURL(new RegExp(`/jobs/${APP4_JOB_ID}/apply`));
});

test("APP-13: the consent declaration is required — a candidate can't submit without it", async ({ page }) => {
  await loginAs(page, 'candidate3');
  await page.goto(`${BASE_URL}/jobs/${FLOW_JOB_ID}/apply`, { waitUntil: 'load' });

  const form = page.locator('form');
  await form.locator('input[type="tel"]').fill('0700000000');
  await form.locator('input[type="date"]').fill('1995-01-01');
  await form.locator('select').first().selectOption({ label: 'Other' });
  const textInputs = form.locator('input[type="text"]');
  await textInputs.nth(0).fill('Testland');
  await textInputs.nth(1).fill('Testville');
  await textInputs.nth(2).fill('Testland');
  // Deliberately leave the consent checkbox unchecked.
  await page.getByRole('button', { name: 'Submit Application' }).click();

  const consentCheckbox = form.locator('input[type="checkbox"]').last();
  await expect(consentCheckbox).toHaveJSProperty('validity.valid', false);
  await expect(page).toHaveURL(new RegExp(`/jobs/${FLOW_JOB_ID}/apply`));
});
