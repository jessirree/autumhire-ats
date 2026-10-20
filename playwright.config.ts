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
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  // A production preview, not `vite dev` — this was the dev server before
  // and three runs in this session got OOM-reaped holding the Firestore
  // emulator, a dev server (with its own file-watcher/HMR overhead) and
  // Chromium all at once. `vite build && vite preview` trades a slower
  // start (the build) for a much lighter-weight static server underneath
  // the browser for the rest of the run.
  webServer: {
    command: 'pnpm build && pnpm exec vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
