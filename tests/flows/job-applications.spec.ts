// Flow suite — "Job applications" stage (docs/requirements-source.md).
// Each test is named by its requirement ID so the JSONL reporter output
// (tests/flows/results.jsonl) maps one-to-one onto docs/traceability-v2.md.
// Runnable alone: `npx playwright test tests/flows/job-applications.spec.ts`
// (against the emulator + dev server; see package.json's test:flows script).
import { test, expect } from '@playwright/test';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { BASE_URL, emulatorApp, loginAs, signInAs } from './helpers';

const FLOW_JOB_ID = 'JOB-FLOW-APP7';

test.beforeAll(async () => {
  // Setup only — not what's under test. A dedicated job with no CV/cover
  // letter requirement and no screening questions keeps the apply flow to
  // its minimum, so the test exercises the duplicate-application guard,
  // not the file-upload or scoring paths (those have their own rows).
  // Written directly via the client SDK rather than through the five-step
  // CreateJob wizard — faster and just as real, since what APP-7 tests is
  // what happens on a second /jobs/:id/apply visit, not how the job itself
  // was authored.
  await signInAs('admin');
  const { db } = emulatorApp();
  await setDoc(doc(db, 'Jobs', FLOW_JOB_ID), {
    referenceNumber: FLOW_JOB_ID,
    title: 'Flow Suite Test Role (APP-7)',
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
  });
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

  // First application for this job: must succeed.
  await page.goto(`${BASE_URL}/jobs/${FLOW_JOB_ID}/apply`, { waitUntil: 'load' });
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
