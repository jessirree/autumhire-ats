// Flow suite — "Short Listing" stage (docs/requirements-source.md).
// Runnable alone: `npx playwright test tests/flows/short-listing.spec.ts`.
import { test, expect } from '@playwright/test';
import { BASE_URL, loginAs } from './helpers';

// Relies on the standard seed (scripts/seed-test-users.cjs): APP-TEST-01
// (Asha Wanjiru) is seeded with status 'longlisted' on JOB-TEST-9001, so
// this test needs no bespoke setup — it only needs that seed to have run,
// which package.json's test:flows script always does first.
test('SL-2: a hiring manager can update an application\'s status after shortlisting', async ({ page }) => {
  await loginAs(page, 'hm');
  await page.goto(`${BASE_URL}/hiring/shortlisting`, { waitUntil: 'load' });

  // .first(): getByTitle substring-matches by default, and "Shortlist" is
  // a substring of the row's own "View shortlisting criteria..." button
  // title, so an unscoped/non-exact query resolves to more than one
  // element (a strict-mode violation) — exact: true plus a single row
  // reference avoids both that and any accidental cross-row match.
  const row = page.locator('tr', { hasText: 'Asha Wanjiru' }).first();
  await expect(row).toBeVisible({ timeout: 8000 });
  await expect(row).toContainText('longlisted');

  await row.getByTitle('Shortlist', { exact: true }).click();

  // handleStatusChange first opens a rationale prompt (optional) — submit
  // it empty, then the real updateApplicationStatus() write happens.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await dialog.getByRole('button', { name: 'OK' }).click();

  // The status transition must actually reach Firestore and come back on
  // reload, not just flash in local state.
  await expect(row).toContainText('shortlisted', { timeout: 8000 });
  await page.reload({ waitUntil: 'load' });
  const rowAfterReload = page.locator('tr', { hasText: 'Asha Wanjiru' }).first();
  await expect(rowAfterReload).toContainText('shortlisted', { timeout: 8000 });
});
