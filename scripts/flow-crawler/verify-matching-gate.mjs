// Step 7 of the matching-gate task — run it, don't describe it.
// Against the emulator, signed in as each role, confirms the gate
// actually holds in the real DOM.
import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';
const CREDS = {
  admin: 'admin@test.autumhire.local',
  recruiter: 'recruiter@test.autumhire.local',
  'hiring-manager': 'hm@test.autumhire.local',
  candidate: 'candidate1@test.autumhire.local',
};

async function loginAs(page, role) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.fill('#email', CREDS[role]);
  await page.fill('#password', 'TestPass123!');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 8000 });
  await page.waitForTimeout(1000);
}

const browser = await chromium.launch();
const results = [];
function record(label, pass, detail) {
  results.push({ label, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${label}${detail ? `: ${detail}` : ''}`);
}

// 1. Candidate profile — no capability section anywhere.
{
  const page = await (await browser.newContext()).newPage();
  await loginAs(page, 'candidate');
  await page.goto(`${BASE_URL}/candidate/dashboard`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.getByText('My Profile', { exact: true }).click();
  await page.waitForTimeout(800);
  const html = await page.content();
  record(
    'Candidate profile has no Capability Profile section in the DOM',
    !html.includes('Capability Profile') && !html.includes('Years of Experience') && !html.includes('Highest Education'),
  );
  await page.close();
}

// 2. No match score/fit score/requirement flag on Applications list or Candidate detail.
{
  const page = await (await browser.newContext()).newPage();
  await loginAs(page, 'recruiter');
  await page.goto(`${BASE_URL}/recruiter/applications`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const listHtml = await page.content();
  record(
    'Applications list has no "Match Score" or "Work Auth" column',
    !listHtml.includes('Match Score') && !listHtml.includes('>Work Auth<'),
  );
  record(
    'Applications list shows "Screening Score" header',
    listHtml.includes('Screening Score'),
  );

  await page.goto(`${BASE_URL}/recruiter/candidate-detail/APP-TEST-01`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const detailHtml = await page.content();
  record(
    'Candidate detail has no "Match Score" or "Match Breakdown"',
    !detailHtml.includes('Match Score') && !detailHtml.includes('Match Breakdown'),
  );
  await page.close();
}

// 3. Sorting Screening Score both directions with real prescreenScore values.
{
  const page = await (await browser.newContext()).newPage();
  await loginAs(page, 'recruiter');
  await page.goto(`${BASE_URL}/recruiter/applications`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const header = page.getByText('Screening Score', { exact: true });
  await header.click();
  await page.waitForTimeout(500);
  const firstPass = await page.locator('tbody tr').first().innerText();
  await header.click();
  await page.waitForTimeout(500);
  const secondPass = await page.locator('tbody tr').first().innerText();
  record(
    'Screening Score header sorts (top row changes between the two clicks)',
    firstPass !== secondPass,
    `first-click top row vs second-click top row differ: ${firstPass !== secondPass}`,
  );
  await page.close();
}

// 4. Best-Match Report gone from Reports; Skills gone from nav and route.
{
  const page = await (await browser.newContext()).newPage();
  await loginAs(page, 'admin');
  await page.goto(`${BASE_URL}/admin/reports`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const reportsHtml = await page.content();
  record('Best-Match Report absent from /admin/reports', !reportsHtml.includes('Best-Match Report'));

  const sidebarHtml = await page.locator('aside').innerHTML();
  record('"Skills" nav entry absent from the admin sidebar', !sidebarHtml.includes('>Skills<'));

  await page.goto(`${BASE_URL}/admin/skills`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const skillsRouteUrl = page.url();
  const skillsRouteHtml = await page.content();
  record(
    '/admin/skills route does not render the Skills bank page',
    !skillsRouteHtml.includes('Skills Taxonomy') && !skillsRouteHtml.includes('Skill Name'),
    `landed on ${skillsRouteUrl}`,
  );
  await page.close();
}

// 5. Public advert shows no requirement chips, despite JOB-TEST-9001 having
// real requirement data seeded (minYearsExperience, workAuthorizationRequired,
// a required skill) — proves this is gated, not just empty.
{
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${BASE_URL}/jobs/JOB-TEST-9001`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const html = await page.content();
  record(
    'Public job detail shows no requirement chips despite seeded requirement data',
    !html.includes('SECRET-REQUIRED-SKILL-Python') && !html.includes('years of experience') && !html.includes('Work authorisation required'),
  );
  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.label).join('; '));
  process.exit(1);
}
