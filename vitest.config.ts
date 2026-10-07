import { defineConfig } from 'vitest/config';

// Deliberately standalone, not an extension of vite.config.ts: the rules
// tests run under plain Node against the Firestore emulator and need none
// of the app's React/Tailwind/asset plugins, which vitest does not merge
// cleanly with in this version.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
