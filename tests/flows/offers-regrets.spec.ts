// Flow suite — "Offers & regrets" stage (docs/requirements-source.md).
// Each test seeds its own dedicated Application + Offer pair (via the
// client SDK, authenticated as admin/staff, which firestore.rules permits
// unconditionally for these two collections) rather than reusing seeded
// fixtures — so OFF-1 and OFF-3 stay independently runnable and don't
// race each other over shared candidate state.
import { test, expect } from '@playwright/test';
import { collection, doc, getDoc, getDocs, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { BASE_URL, emulatorApp, loginAs, signInAs } from './helpers';

async function seedJob(jobId: string, title: string, overrides: Record<string, unknown> = {}) {
  const { db } = emulatorApp();
  await setDoc(doc(db, 'Jobs', jobId), {
    referenceNumber: jobId,
    title,
    department: 'QA',
    location: 'Remote',
    jobType: 'Full-time',
    remoteType: 'Remote',
    description: 'Seeded by tests/flows/offers-regrets.spec.ts. Safe to delete.',
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
    createdBy: 'flow-suite',
    createdByName: 'Flow Suite',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    postedAt: Timestamp.now(),
    ...overrides,
  });
}

/** Polls for a Cloud Function trigger's write — functions emulator delivery isn't instant. */
async function waitForDoc(collectionName: string, docId: string, timeoutMs = 15000, intervalMs = 500) {
  const { db } = emulatorApp();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const snap = await getDoc(doc(db, collectionName, docId));
    if (snap.exists()) return snap;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out waiting for ${collectionName}/${docId} to exist`);
}

async function seedApplication(
  appId: string, candidateId: string, candidateName: string, email: string, jobTitle: string,
  status = 'shortlisted', jobId = 'JOB-TEST-9001'
) {
  const { db } = emulatorApp();
  await setDoc(doc(db, 'Applications', appId), {
    jobId,
    jobTitle,
    department: 'QA',
    candidateId,
    candidateName,
    email,
    isInternal: false,
    workedHereBefore: false,
    answers: [],
    prescreenScore: 0,
    status,
    statusHistory: [],
    consentGiven: true,
    appliedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

async function seedOffer(
  applicationId: string, candidateId: string, candidateName: string, email: string, jobTitle: string, status: string,
  overrides: Record<string, unknown> = {}
) {
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
    ...overrides,
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

  // Reload resets myOffers to [] until getOffersForCandidate() resolves
  // again — a positive control first (the seeded Application for this same
  // job, title text present regardless of offer status) proves that
  // reload's data has actually come back before the negative assertion,
  // rather than the banner's absence being coincidental with "hasn't
  // fetched yet". Same shape as the JA-12 bug in tests/flows/README.md.
  await page.reload({ waitUntil: 'load' });
  await expect(page.getByText(jobTitle).first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(`You have an offer for ${jobTitle}!`)).toHaveCount(0);
});

test('OFF-2: the hiring-manager notification resolves to the real hiring manager, not whoever drafted the offer', async ({ page }) => {
  // Bucket B: the candidate-facing UI has no visibility into who gets
  // notified server-side, so there is nothing to check in the DOM — the
  // whole point of the original bug (notifying offer.createdById instead
  // of the real hiring manager) is that it was invisible to everyone
  // except the hiring manager who never got the email. Direct Firestore
  // read of what notifyOfferResponse (functions/offerNotifications.js)
  // actually produced is the only way to catch a wrong-recipient regression.
  const hm = await signInAs('hm');
  const hmUid = hm.uid;
  const candidate = await signInAs('candidate6');
  const candidateUid = candidate.uid;
  const admin = await signInAs('admin');
  const adminUid = admin.uid; // "whoever drafted the offer" — deliberately NOT the hiring manager
  const jobTitle = 'Flow Suite Offer Role (OFF-2)';
  const jobId = 'JOB-FLOW-OFF2';
  // No requisitionId, no coordinatorId — resolution must fall through to
  // the hiring-team member with role 'hiring-manager' (priority 2 of 3).
  await seedJob(jobId, jobTitle, {
    hiringTeam: [{ id: hmUid, name: 'Flow Suite HM', email: 'hm@test.autumhire.local', role: 'hiring-manager' }],
  });
  await seedApplication('APP-FLOW-OFF2', candidateUid, 'Flow Suite OFF-2 Candidate', 'candidate6@test.autumhire.local', jobTitle, 'shortlisted', jobId);
  const offerId = await seedOffer('APP-FLOW-OFF2', candidateUid, 'Flow Suite OFF-2 Candidate', 'candidate6@test.autumhire.local', jobTitle, 'sent', { jobId });

  await loginAs(page, 'candidate6');
  await page.goto(`${BASE_URL}/candidate/dashboard`, { waitUntil: 'load' });
  await expect(page.getByText(`You have an offer for ${jobTitle}!`)).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'Accept Offer' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await dialog.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText(`You have an offer for ${jobTitle}!`)).toHaveCount(0, { timeout: 8000 });

  // notifyOfferResponse writes a deterministic id (offer-response-{offerId})
  // — poll for it rather than a fixed sleep, since the functions emulator's
  // trigger delivery isn't instant.
  await signInAs('admin');
  const snap = await waitForDoc('Notifications', `offer-response-${offerId}`);
  const notification = snap.data()!;
  expect(notification.userId, 'must notify the resolved hiring manager').toBe(hmUid);
  expect(notification.userId, 'must NOT notify whoever drafted the offer').not.toBe(adminUid);
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

test('OFF-4: sending regrets only touches shortlisted/interview candidates, not everyone non-terminal', async ({ page }) => {
  // Bucket B: the UI doesn't show which candidates a regret broadcast
  // reached — the scope bug (over-broad or under-broad) is only visible by
  // reading the actual Application statuses afterward, not anything the
  // toast or button says.
  const jobId = 'JOB-FLOW-OFF4';
  const jobTitle = 'Flow Suite Offer Role (OFF-4)';
  const hiredName = 'Flow Suite OFF-4 Hired Candidate';

  const c1 = await signInAs('candidate1');
  const c2 = await signInAs('candidate2');
  const c3 = await signInAs('candidate3');
  const c4 = await signInAs('candidate4');
  const c5 = await signInAs('candidate5');
  const c6 = await signInAs('candidate6');
  await signInAs('admin');

  await seedJob(jobId, jobTitle);
  await seedApplication('APP-FLOW-OFF4-HIRED', c1.uid, hiredName, 'candidate1@test.autumhire.local', jobTitle, 'shortlisted', jobId);
  await seedApplication('APP-FLOW-OFF4-APPLIED', c2.uid, 'Flow Suite OFF-4 Applied', 'candidate2@test.autumhire.local', jobTitle, 'applied', jobId);
  await seedApplication('APP-FLOW-OFF4-LONGLISTED', c3.uid, 'Flow Suite OFF-4 Longlisted', 'candidate3@test.autumhire.local', jobTitle, 'longlisted', jobId);
  await seedApplication('APP-FLOW-OFF4-REJECTED', c4.uid, 'Flow Suite OFF-4 Rejected', 'candidate4@test.autumhire.local', jobTitle, 'rejected', jobId);
  await seedApplication('APP-FLOW-OFF4-SHORTLISTED', c5.uid, 'Flow Suite OFF-4 Shortlisted', 'candidate5@test.autumhire.local', jobTitle, 'shortlisted', jobId);
  await seedApplication('APP-FLOW-OFF4-INTERVIEW', c6.uid, 'Flow Suite OFF-4 Interview', 'candidate6@test.autumhire.local', jobTitle, 'interview', jobId);
  await seedOffer('APP-FLOW-OFF4-HIRED', c1.uid, hiredName, 'candidate1@test.autumhire.local', jobTitle, 'accepted', { jobId });

  await loginAs(page, 'recruiter');
  await page.goto(`${BASE_URL}/recruiter/offers`, { waitUntil: 'load' });
  const row = page.locator('tr', { hasText: hiredName }).first();
  await expect(row).toBeVisible({ timeout: 8000 });
  await row.getByRole('button', { name: 'Complete Hire' }).click({ force: true });
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible({ timeout: 5000 });
  // The confirm button, not "Hire only" — this is the path that actually
  // calls sendRegretsForJob, which is what this row is testing.
  await dialog.getByRole('button', { name: 'Hire & send regrets' }).click();
  await expect(page.getByText('Hire finalized')).toBeVisible({ timeout: 8000 });

  const { db } = emulatorApp();
  const statusOf = async (appId: string) => (await getDoc(doc(db, 'Applications', appId))).data()!.status;

  expect(await statusOf('APP-FLOW-OFF4-HIRED'), 'the finalized hire').toBe('hired');
  expect(await statusOf('APP-FLOW-OFF4-SHORTLISTED'), 'shortlisted — must be regretted').toBe('regretted');
  expect(await statusOf('APP-FLOW-OFF4-INTERVIEW'), 'interview — must be regretted').toBe('regretted');
  expect(await statusOf('APP-FLOW-OFF4-APPLIED'), 'applied — must NOT be touched').toBe('applied');
  expect(await statusOf('APP-FLOW-OFF4-LONGLISTED'), 'longlisted — must NOT be touched').toBe('longlisted');
  expect(await statusOf('APP-FLOW-OFF4-REJECTED'), 'already-rejected — must NOT be touched').toBe('rejected');

  // Confirms the scope via the actual regret notifications too, not just status.
  const regretSnap = await getDocs(query(collection(db, 'Notifications'), where('type', '==', 'regret'), where('relatedId', 'in', [
    'APP-FLOW-OFF4-SHORTLISTED', 'APP-FLOW-OFF4-INTERVIEW', 'APP-FLOW-OFF4-APPLIED', 'APP-FLOW-OFF4-LONGLISTED', 'APP-FLOW-OFF4-REJECTED',
  ])));
  const notifiedAppIds = regretSnap.docs.map((d) => d.data().relatedId).sort();
  expect(notifiedAppIds).toEqual(['APP-FLOW-OFF4-INTERVIEW', 'APP-FLOW-OFF4-SHORTLISTED']);
});
