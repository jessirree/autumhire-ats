import { defineConfig } from '@playwright/test';

// Requirements flow suite (docs/traceability-v2.md's BUILT UNVERIFIED rows).
// Emulator only — run via `pnpm test:flows`, never against production.
// See tests/flows/helpers.ts for the shared login/seed helpers and
// tests/flows/jsonl-reporter.ts for how results reach
// tests/flows/results.jsonl (appended per test, not buffered to the end).
export default defineConfig({
  testDir: './tests/flows',
  testMatch: /.*\.spec\.ts/,
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['./tests/flows/jsonl-reporter.ts'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
