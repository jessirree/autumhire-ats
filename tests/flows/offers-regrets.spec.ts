// Flow suite — "Offers & regrets" stage (docs/requirements-source.md).
// Each test seeds its own dedicated Application + Offer pair (via the
// client SDK, authenticated as admin/staff, which firestore.rules permits
// unconditionally for these two collections) rather than reusing seeded
// fixtures — so OFF-1 and OFF-3 stay independently runnable and don't
// race each other over shared candidate state.
import { test, expect } from '@playwright/test';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { BASE_URL, emulatorApp, loginAs, signInAs } from './helpers';

async function seedApplication(appId: string, candidateId: string, candidateName: string, email: string, jobTitle: string) {
  const { db } = emulatorApp();
  await setDoc(doc(db, 'Applications', appId), {
    jobId: 'JOB-TEST-9001',
    jobTitle,
    department: 'QA',
    candidateId,
    candidateName,
    email,
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
}

async function seedOffer(applicationId: string, candidateId: string, candidateName: string, email: string, jobTitle: string, status: string) {
  const { db, auth } = emulatorApp();
  const ref = doc(collection(db, 'Offers'));
  await setDoc(ref, {
    applicationId,
    jobId: 'JOB-TEST-9001',
    jobTitle,
    candidateId,
    candidateName,
    candidateEmail: email,
    status,
    createdById: auth.currentUser!.uid,
    createdByName: 'Flow Suite',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

test('OFF-1: a candidate accepting an offer actually changes its status, not just local UI state', async ({ page }) => {
  const candidate = await signInAs('candidate4');
  const candidateUid = candidate.uid;
  await signInAs('admin'); // writes need staff auth per firestore.rules
  const jobTitle = 'Flow Suite Offer Role (OFF-1)';
  await seedApplication('APP-FLOW-OFF1', candidateUid, 'Flow Suite OFF-1 Candidate', 'candidate4@test.autumhire.local', jobTitle);
  await seedOffer('APP-FLOW-OFF1', candidateUid, 'Flow Suite OFF-1 Candidate', 'candidate4@test.autumhire.local', jobTitle, 'sent');

  await loginAs(page, 'candidate4');
  await page.goto(`${BASE_URL}/candidate/dashboard`, { waitUntil: 'load' });
  await expect(page.getByText(`You have an offer for ${jobTitle}!`)).toBeVisible({ timeout: 8000 });

  await page.getByRole('button', { name: 'Accept Offer' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await dialog.getByRole('button', { name: 'Confirm' }).click();

  // The real signal: the offer drops out of "pending offers" because its
  // status actually moved off 'sent' in Firestore — not a local-only flag,
  // since the list is reloaded from the server after the write.
  await expect(page.getByText(`You have an offer for ${jobTitle}!`)).toHaveCount(0, { timeout: 8000 });
  await page.reload({ waitUntil: 'load' });
  await expect(page.getByText(`You have an offer for ${jobTitle}!`)).toHaveCount(0);
});

test('OFF-3: finalizing a hire actually sets the application status to Hired', async ({ page }) => {
  const candidate = await signInAs('candidate5');
  const candidateUid = candidate.uid;
  await signInAs('admin');
  const jobTitle = 'Flow Suite Offer Role (OFF-3)';
  const candidateName = 'Flow Suite OFF-3 Candidate';
  await seedApplication('APP-FLOW-OFF3', candidateUid, candidateName, 'candidate5@test.autumhire.local', jobTitle);
  await seedOffer('APP-FLOW-OFF3', candidateUid, candidateName, 'candidate5@test.autumhire.local', jobTitle, 'accepted');

  await loginAs(page, 'recruiter');
  await page.goto(`${BASE_URL}/recruiter/offers`, { waitUntil: 'load' });
  const row = page.locator('tr', { hasText: candidateName }).first();
  await expect(row).toBeVisible({ timeout: 8000 });

  await row.getByRole('button', { name: 'Complete Hire' }).click({ force: true });
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await dialog.getByRole('button', { name: 'Hire only' }).click();
  await expect(page.getByText('Hire finalized')).toBeVisible({ timeout: 8000 });

  // The requirement is about the APPLICATION's status, not the offer's —
  // finalizeHire() never changes Offer.status, only Application.status —
  // so the real check is on the Applications list, not this page.
  await page.goto(`${BASE_URL}/recruiter/applications`, { waitUntil: 'load' });
  const appRow = page.locator('tr', { hasText: candidateName }).first();
  await expect(appRow).toContainText('hired', { timeout: 8000 });
});
