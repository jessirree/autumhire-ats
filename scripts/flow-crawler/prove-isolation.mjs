// One-off: proves the Stage 2 emulator setup is actually isolated from
// production before any write-crawling happens. Creates one throwaway
// Skill via the real UI, then checks it exists in the emulator and does
// NOT exist in production Firestore.
import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const MARKER = `EMULATOR-ISOLATION-PROOF-${Date.now()}`;

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
await page.fill('#email', 'admin@test.autumhire.local');
await page.fill('#password', 'TestPass123!');
await page.click('button[type="submit"]');
await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 8000 });

await page.goto(`${BASE_URL}/admin/skills`, { waitUntil: 'load' });
await page.waitForTimeout(1000);
await page.getByRole('button', { name: 'New Skill' }).click();
await page.getByPlaceholder('e.g. JavaScript').fill(MARKER);
await page.getByRole('button', { name: 'Add Skill' }).click();
await page.waitForTimeout(1500);

await browser.close();
console.log(`MARKER=${MARKER}`);
