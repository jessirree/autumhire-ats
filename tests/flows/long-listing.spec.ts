// Flow suite — "Long Listing" stage (docs/requirements-source.md).
// Runnable alone: `npx playwright test tests/flows/long-listing.spec.ts`.
import { test, expect } from '@playwright/test';
import { BASE_URL, loginAs } from './helpers';

// Relies on the standard seed (scripts/seed-test-users.cjs): APP-TEST-06
// (Daniel Kiprop, candidate6) is seeded at status 'applied' on
// JOB-TEST-9001, so this needs no bespoke setup beyond the seed that
// package.json's test:flows script always runs first.
test("LL-4: a staff status change is reflected to the candidate as online tracking through the stage", async ({ browser }) => {
  // Before: candidate6's own dashboard timeline must show "Longlisted" as
  // upcoming, not reached yet — the real starting state, not an assumption.
  const candidateContext = await browser.newContext();
  const candidatePage = await candidateContext.newPage();
  await loginAs(candidatePage, 'candidate6');
  await candidatePage.goto(`${BASE_URL}/candidate/dashboard`, { waitUntil: 'load' });
  const longlistedLabel = candidatePage.getByText('Longlisted', { exact: true });
  await expect(longlistedLabel).toBeVisible({ timeout: 8000 });
  await expect(longlistedLabel).toHaveClass(/text-gray-400/);

  // The staff action: recruiter moves the application to Longlist via the
  // bulk-action control (the same path row 5.4's "online tracking" promise
  // depends on actually notifying/recording the change).
  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  await loginAs(staffPage, 'recruiter');
  await staffPage.goto(`${BASE_URL}/recruiter/applications`, { waitUntil: 'load' });
  const row = staffPage.locator('tr', { hasText: 'Daniel Kiprop' }).first();
  await expect(row).toBeVisible({ timeout: 8000 });
  await row.locator('input[type="checkbox"]').check();
  await staffPage.getByRole('combobox').filter({ hasText: 'Bulk Actions' }).selectOption('Move to Longlist');
  await staffPage.getByRole('button', { name: 'Apply Action' }).click();
  await expect(row).toContainText('longlisted', { timeout: 8000 });
  await staffContext.close();

  // After: the candidate's OWN view, reloaded, must now show the step as
  // current — this is the "online tracking" requirement from the
  // candidate's side, not just a staff-side status column.
  await candidatePage.reload({ waitUntil: 'load' });
  const longlistedLabelAfter = candidatePage.getByText('Longlisted', { exact: true });
  await expect(longlistedLabelAfter).toHaveClass(/text-gray-900/, { timeout: 8000 });
  await candidateContext.close();
});
