// Flow suite — "Job advertisement" stage (docs/requirements-source.md).
// Runnable alone: `npx playwright test tests/flows/job-advertisement.spec.ts`.
import { test, expect } from '@playwright/test';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { BASE_URL, emulatorApp, loginAs, signInAs } from './helpers';

const JA6_JOB_ID = 'JOB-FLOW-JA6';
const JA12_JOB_ID = 'JOB-FLOW-JA12';
const JA12_CONTROL_JOB_ID = 'JOB-FLOW-JA12-CONTROL';
const JA12_TITLE = 'Flow Suite Confidential Role (JA-12)';
const JA12_CONTROL_TITLE = 'Flow Suite Public Control Role (JA-12)';

function baseJob(overrides: Record<string, unknown>) {
  return {
    department: 'QA',
    location: 'Remote',
    jobType: 'Full-time',
    remoteType: 'Remote',
    description: 'Seeded by tests/flows/job-advertisement.spec.ts. Safe to delete.',
    advertType: 'external',
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
    ...overrides,
  };
}

test.beforeAll(async () => {
  await signInAs('admin');
  const { db } = emulatorApp();
  await setDoc(doc(db, 'Jobs', JA6_JOB_ID), baseJob({
    referenceNumber: JA6_JOB_ID,
    title: 'Flow Suite Closed Role (JA-6)',
    status: 'Closed',
    isConfidential: false,
    showOnCareerSite: true,
  }));
  await setDoc(doc(db, 'Jobs', JA12_JOB_ID), baseJob({
    referenceNumber: JA12_JOB_ID,
    title: JA12_TITLE,
    status: 'Active',
    isConfidential: true,
    showOnCareerSite: true,
    postedAt: Timestamp.now(),
  }));
  // A same-shaped, non-confidential job — the test waits for THIS to
  // render before asserting the confidential one is absent, so a slow or
  // not-yet-resolved getPublicJobs() fetch can't make the absence
  // assertion pass trivially before the page has actually finished
  // loading anything at all.
  await setDoc(doc(db, 'Jobs', JA12_CONTROL_JOB_ID), baseJob({
    referenceNumber: JA12_CONTROL_JOB_ID,
    title: JA12_CONTROL_TITLE,
    status: 'Active',
    isConfidential: false,
    showOnCareerSite: true,
    postedAt: Timestamp.now(),
  }));
});

test('JA-6: re-opening a closed job automatically sets status to Re-advertised', async ({ page }) => {
  await loginAs(page, 'recruiter');
  await page.goto(`${BASE_URL}/recruiter/adverts`, { waitUntil: 'load' });

  const row = page.locator('tr', { hasText: 'Flow Suite Closed Role (JA-6)' }).first();
  await expect(row).toBeVisible({ timeout: 8000 });
  await expect(row).toContainText('closed');

  await row.getByTitle('Re-open (re-advertise)', { exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await dialog.getByRole('button', { name: 'OK' }).click();

  await expect(row).toContainText('re-advertised', { timeout: 8000 });
  await page.reload({ waitUntil: 'load' });
  const rowAfterReload = page.locator('tr', { hasText: 'Flow Suite Closed Role (JA-6)' }).first();
  await expect(rowAfterReload).toContainText('re-advertised', { timeout: 8000 });
});

test('JA-12: a confidential job is hidden from the public advert but visible to staff', async ({ browser }) => {
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto(`${BASE_URL}/jobs`, { waitUntil: 'load' });
  // Wait for the control job first — proves getPublicJobs() has actually
  // resolved and rendered, not just that the confidential title hasn't
  // shown up YET because the async fetch is still in flight.
  await expect(publicPage.getByText(JA12_CONTROL_TITLE)).toBeVisible({ timeout: 8000 });
  await expect(publicPage.getByText(JA12_TITLE)).toHaveCount(0);
  await publicContext.close();

  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  await loginAs(staffPage, 'recruiter');
  await staffPage.goto(`${BASE_URL}/recruiter/adverts`, { waitUntil: 'load' });
  await expect(staffPage.getByText(JA12_TITLE)).toBeVisible({ timeout: 8000 });
  await staffContext.close();
});
