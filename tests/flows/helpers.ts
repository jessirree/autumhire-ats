// Shared setup for the requirements flow suite (docs/traceability-v2.md).
// Emulator only — never points at a real Firebase project. Each spec file
// imports from here rather than re-deriving login/job-seeding logic, but
// every spec is still runnable alone: nothing here depends on test order.
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import type { Page } from '@playwright/test';

export const BASE_URL = 'http://localhost:5173';
export const TEST_PASSWORD = 'TestPass123!';

export const CREDS: Record<string, string> = {
  admin: 'admin@test.autumhire.local',
  recruiter: 'recruiter@test.autumhire.local',
  'hiring-manager': 'hm@test.autumhire.local',
  hm: 'hm@test.autumhire.local',
  candidate1: 'candidate1@test.autumhire.local',
};

/**
 * One Firestore/Auth client connection to the emulator, shared by every spec
 * that needs to set up state the UI has no fast path for (e.g. creating a
 * dedicated job via the real `createJob()` service function rather than
 * clicking through the multi-step job wizard). Deliberately NOT the app's
 * own `src/lib/firebase.ts` — that module reads `import.meta.env`, which
 * only exists under Vite, not under Playwright's Node test runner.
 */
let appInited = false;
export function emulatorApp() {
  if (!appInited && getApps().length === 0) {
    const app = initializeApp({
      apiKey: 'flow-test-fake-key',
      authDomain: 'autumhire2-4a087.firebaseapp.com',
      projectId: 'autumhire2-4a087',
    });
    const auth = getAuth(app);
    const db = getFirestore(app);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    appInited = true;
  }
  return { auth: getAuth(), db: getFirestore() };
}

export async function signInAs(role: keyof typeof CREDS) {
  const { auth } = emulatorApp();
  const cred = await signInWithEmailAndPassword(auth, CREDS[role], TEST_PASSWORD);
  return cred.user;
}

/** Drive the real login form — used by every spec that asserts on the UI. */
export async function loginAs(page: Page, role: keyof typeof CREDS) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.fill('#email', CREDS[role]);
  await page.fill('#password', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 8000 });
  await page.waitForTimeout(500);
}
