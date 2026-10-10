import { defineConfig } from 'vite'
import path from 'path'
import { execSync } from 'child_process'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// "Is it actually deployed" has cost real time repeatedly on this project —
// bundle-fingerprinting a live site to guess its commit is unreliable once
// code-splitting is involved (an absent string only proves it isn't in the
// chunk you happened to fetch). Baking the real SHA in at build time kills
// the question outright: window.__BUILD__ in any deployed environment's
// console, or the line in the staff sidebar footer, is the actual answer.
function gitCommitSha(): string {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  root: '.',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  define: {
    __BUILD_SHA__: JSON.stringify(gitCommitSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
