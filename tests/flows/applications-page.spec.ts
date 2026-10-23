// Flow suite — Applications page client-facing fixes (2026-10-23 batch).
// Not tied to a docs/requirements-source.md ID, so these tests are NOT
// prefixed with one and are NOT picked up by jsonl-reporter.ts/
// evidence:regenerate — they're straightforward regression coverage for
// two UI fixes on the same page, not a traceability row.
// Runnable alone: `npx playwright test tests/flows/applications-page.spec.ts`.
import { test, expect } from '@playwright/test';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { BASE_URL, emulatorApp, loginAs, signInAs } from './helpers';

function baseJob(id: string, title: string, overrides: Record<string, unknown> = {}) {
  return {
    referenceNumber: id, title, department: 'QA', location: 'Remote', jobType: 'Full-time',
    remoteType: 'Remote', description: 'Seeded by tests/flows/applications-page.spec.ts. Safe to delete.',
    status: 'Active', advertType: 'external', isConfidential: false, showOnCareerSite: true,
    isFeatured: false, requireResume: false, requireCoverLetter: false, allowOtherDocuments: false,
    questions: [], hiringTeam: [], createdAt: Timestamp.now(), updatedAt: Timestamp.now(), postedAt: Timestamp.now(),
    ...overrides,
  };
}

async function seedApplication(appId: string, jobId: string, jobTitle: string, candidateId: string, candidateName: string, extra: Record<string, unknown> = {}) {
  const { db } = emulatorApp();
  await setDoc(doc(db, 'Applications', appId), {
    jobId, jobTitle, department: 'QA', candidateId, candidateName,
    email: `${candidateId}@test.autumhire.local`, isInternal: false, workedHereBefore: false,
    answers: [], prescreenScore: 0, status: 'longlisted', statusHistory: [], consentGiven: true,
    appliedAt: Timestamp.now(), updatedAt: Timestamp.now(),
    ...extra,
  });
}

/** Uploads as the candidate themselves — storage.rules only allows a candidate to write their own folder, not staff. Returns an emulator-local, browser-fetchable URL. */
async function uploadTestPdf(jobId: string, candidateUid: string, filename: string): Promise<string> {
  const { storage } = emulatorApp();
  const fileRef = ref(storage, `applications/${jobId}/${candidateUid}/${filename}`);
  await uploadBytes(fileRef, new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: 'application/pdf' }));
  return getDownloadURL(fileRef);
}

test.describe('Applications page job filter', () => {
  const JOB_A = 'JOB-FLOW-FILTER-A';
  const JOB_B = 'JOB-FLOW-FILTER-B';
  const TITLE_A = 'Flow Suite Filter Role A';
  const TITLE_B = 'Flow Suite Filter Role B';

  test.beforeAll(async () => {
    await signInAs('admin');
    const { db } = emulatorApp();
    await setDoc(doc(db, 'Jobs', JOB_A), baseJob(JOB_A, TITLE_A));
    await setDoc(doc(db, 'Jobs', JOB_B), baseJob(JOB_B, TITLE_B));
    await seedApplication('APP-FLOW-FILTER-A', JOB_A, TITLE_A, 'flow-filter-cand-a', 'Flow Suite Filter Candidate A');
    await seedApplication('APP-FLOW-FILTER-B', JOB_B, TITLE_B, 'flow-filter-cand-b', 'Flow Suite Filter Candidate B');
  });

  test('persists the selected job in the query string, survives reload, and respects a pre-set param', async ({ page }) => {
    await loginAs(page, 'recruiter');
    await page.goto(`${BASE_URL}/recruiter/applications`, { waitUntil: 'load' });

    const jobSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'All Jobs' }) });
    // Positive control: both seeded jobs must actually be in the dropdown's
    // options (proves the getJobs() fetch populating it resolved) before
    // trusting anything about selecting one.
    await expect(jobSelect.locator('option', { hasText: TITLE_A })).toHaveCount(1, { timeout: 8000 });
    await expect(jobSelect.locator('option', { hasText: TITLE_B })).toHaveCount(1);

    await jobSelect.selectOption({ label: `${TITLE_A} (${JOB_A})` });
    await expect(page).toHaveURL(new RegExp(`job=${JOB_A}`));
    await expect(page.getByText('Flow Suite Filter Candidate A')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Flow Suite Filter Candidate B')).toHaveCount(0);

    // Reload from scratch — the real proof is the URL param surviving a
    // fresh page load, not just React state that happened not to reset.
    await page.reload({ waitUntil: 'load' });
    await expect(page).toHaveURL(new RegExp(`job=${JOB_A}`));
    await expect(page.locator('select').filter({ has: page.locator('option', { hasText: 'All Jobs' }) })).toHaveValue(JOB_A, { timeout: 8000 });

    // Arriving fresh with the param already set (how the Job Adverts page's
    // link works) must show that job pre-selected, not just filter silently.
    await page.goto(`${BASE_URL}/recruiter/applications?job=${JOB_B}`, { waitUntil: 'load' });
    await expect(page.getByText('Flow Suite Filter Candidate B')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('select').filter({ has: page.locator('option', { hasText: 'All Jobs' }) })).toHaveValue(JOB_B, { timeout: 8000 });
  });
});

test.describe('Zip download summary', () => {
  const JOB_ID = 'JOB-FLOW-ZIPSUMMARY';
  const JOB_TITLE = 'Flow Suite Zip Summary Role';

  test.beforeAll(async () => {
    await signInAs('admin');
    const { db } = emulatorApp();
    await setDoc(doc(db, 'Jobs', JOB_ID), baseJob(JOB_ID, JOB_TITLE));

    const candidate1 = await signInAs('candidate1');
    const cvUrl1 = await uploadTestPdf(JOB_ID, candidate1.uid, 'cv.pdf');
    const coverUrl1 = await uploadTestPdf(JOB_ID, candidate1.uid, 'cover.pdf');
    await signInAs('admin');
    await seedApplication('APP-FLOW-ZIP-BOTH', JOB_ID, JOB_TITLE, candidate1.uid, 'Flow Suite Zip Both Docs', {
      cvUrl: cvUrl1, cvFileName: 'cv.pdf', coverLetterUrl: coverUrl1, coverLetterFileName: 'cover.pdf',
    });

    const candidate2 = await signInAs('candidate2');
    const cvUrl2 = await uploadTestPdf(JOB_ID, candidate2.uid, 'cv.pdf');
    await signInAs('admin');
    await seedApplication('APP-FLOW-ZIP-CVONLY', JOB_ID, JOB_TITLE, candidate2.uid, 'Flow Suite Zip CV Only', {
      cvUrl: cvUrl2, cvFileName: 'cv.pdf',
    });

    await seedApplication('APP-FLOW-ZIP-NONE', JOB_ID, JOB_TITLE, 'flow-zip-cand-none', 'Flow Suite Zip No Docs');
  });

  test('toast reports per-document-type totals and the zip carries a _summary.txt naming every candidate', async ({ page }) => {
    await loginAs(page, 'recruiter');
    await page.goto(`${BASE_URL}/recruiter/applications?job=${JOB_ID}`, { waitUntil: 'load' });
    // Positive control: all three seeded candidates visible (proves the
    // job-filtered fetch resolved) before clicking download.
    await expect(page.getByText('Flow Suite Zip Both Docs')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Flow Suite Zip CV Only')).toBeVisible();
    await expect(page.getByText('Flow Suite Zip No Docs')).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.getByRole('button', { name: 'Download all documents' }).click(),
    ]);

    await expect(page.getByText('CVs 2 of 3, cover letters 1 of 3, see _summary.txt.')).toBeVisible({ timeout: 8000 });

    const JSZip = (await import('jszip')).default;
    const buf = await download.createReadStream().then(async (stream) => {
      const chunks: Buffer[] = [];
      for await (const chunk of stream!) chunks.push(chunk as Buffer);
      return Buffer.concat(chunks);
    });
    const zip = await JSZip.loadAsync(buf);
    expect(Object.keys(zip.files)).toContain('_summary.txt');
    const summary = await zip.file('_summary.txt')!.async('text');
    expect(summary).toMatch(/CVs:\s+2 of 3 included/);
    expect(summary).toMatch(/Cover letters:\s+1 of 3 included/);
    expect(summary).toContain('Flow Suite Zip Both Docs');
    expect(summary).toContain('Flow Suite Zip CV Only');
    expect(summary).toContain('Flow Suite Zip No Docs');
    // The actual per-candidate outcomes, not just that the names appear somewhere.
    const lines = Object.fromEntries(
      summary.split('\n').filter((l) => l.includes('CV:')).map((l) => [l.trim().split(/\s{2,}/)[0], l])
    );
    expect(lines['Flow Suite Zip Both Docs']).toContain('CV: included');
    expect(lines['Flow Suite Zip Both Docs']).toContain('Cover letter: included');
    expect(lines['Flow Suite Zip CV Only']).toContain('CV: included');
    expect(lines['Flow Suite Zip CV Only']).toContain('Cover letter: missing');
    expect(lines['Flow Suite Zip No Docs']).toContain('CV: missing');
    expect(lines['Flow Suite Zip No Docs']).toContain('Cover letter: missing');
  });
});
