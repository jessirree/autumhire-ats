// Flow suite — "Archiving" stage (docs/requirements-source.md).
// Category 2 risk: a bulk operation across multiple documents can fail
// partway through, archiving some and silently leaving others untouched.
// setApplicationsArchived() writes every selected id in one Firestore
// batch (atomic: all-or-nothing), so this test's job is to prove that
// guarantee holds for a real multi-row selection, not just one document.
// Runnable alone: `npx playwright test tests/flows/archiving.spec.ts`.
import { test, expect } from '@playwright/test';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { BASE_URL, emulatorApp, loginAs, signInAs } from './helpers';

const JOB_ID = 'JOB-FLOW-ARC1';
const APP_IDS = ['APP-FLOW-ARC1-A', 'APP-FLOW-ARC1-B', 'APP-FLOW-ARC1-C'];
const NAMES = ['Flow Suite ARC-1 Alpha', 'Flow Suite ARC-1 Bravo', 'Flow Suite ARC-1 Charlie'];

test.beforeAll(async () => {
  await signInAs('admin');
  const { db } = emulatorApp();
  await setDoc(doc(db, 'Jobs', JOB_ID), {
    referenceNumber: JOB_ID, title: 'Flow Suite Archive Role (ARC-1)', department: 'QA',
    location: 'Remote', jobType: 'Full-time', remoteType: 'Remote', description: 'x',
    status: 'Active', advertType: 'external', isConfidential: false, showOnCareerSite: true,
    isFeatured: false, requireResume: false, requireCoverLetter: false, allowOtherDocuments: false,
    questions: [], hiringTeam: [], createdAt: Timestamp.now(), updatedAt: Timestamp.now(), postedAt: Timestamp.now(),
  });
  for (let i = 0; i < APP_IDS.length; i++) {
    await setDoc(doc(db, 'Applications', APP_IDS[i]), {
      jobId: JOB_ID, jobTitle: 'Flow Suite Archive Role (ARC-1)', department: 'QA',
      candidateId: `flow-arc1-${i}`, candidateName: NAMES[i], email: `flow-arc1-${i}@test.autumhire.local`,
      isInternal: false, workedHereBefore: false, answers: [], prescreenScore: 0,
      status: 'longlisted', statusHistory: [], consentGiven: true, archived: false,
      appliedAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
  }
});

test('ARC-1: bulk-archiving a multi-row selection archives all of them, not some', async ({ page }) => {
  await loginAs(page, 'recruiter');
  await page.goto(`${BASE_URL}/recruiter/applications?job=${JOB_ID}`, { waitUntil: 'load' });

  // Positive control: all three must actually be visible (proves the
  // page's fetch for this job resolved) before selecting/acting on them.
  for (const name of NAMES) {
    await expect(page.getByText(name)).toBeVisible({ timeout: 8000 });
  }

  await page.locator('thead input[type="checkbox"]').check();
  await expect(page.getByText('3 candidates selected')).toBeVisible({ timeout: 5000 });
  // getByRole substring-matches "Archive" against "Show Archived" too.
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(page.getByText('3 candidate file(s) archived.')).toBeVisible({ timeout: 8000 });

  // Reload and re-check from scratch — the real proof is Firestore's state
  // after a fresh fetch, not whatever the page happened to still be
  // showing right after the click.
  await page.reload({ waitUntil: 'load' });
  for (const name of NAMES) {
    await expect(page.getByText(name)).toHaveCount(0, { timeout: 8000 });
  }

  // Positive control before the archived-view negative check below: the
  // "Viewing Archived" toggle itself is static UI, not data-dependent, so
  // wait for at least one of the three names to reappear in the archived
  // view first — proves this fetch resolved too — before trusting that
  // all three (not just some) made it across.
  await page.goto(`${BASE_URL}/recruiter/applications?job=${JOB_ID}&archived=1`, { waitUntil: 'load' });
  await expect(page.getByText(NAMES[0])).toBeVisible({ timeout: 8000 });
  for (const name of NAMES) {
    await expect(page.getByText(name)).toBeVisible({ timeout: 8000 });
  }
});
