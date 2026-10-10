// Build identity, baked in at build time by vite.config.ts's `define`.
// Settles "is this actually deployed" with one line in any environment's
// console (window.__BUILD__) instead of guessing from the live bundle.
export const BUILD_SHA = __BUILD_SHA__;
export const BUILD_TIME = __BUILD_TIME__;

declare global {
  interface Window {
    __BUILD__?: { sha: string; time: string };
  }
}

export function installBuildMarker(): void {
  window.__BUILD__ = { sha: BUILD_SHA, time: BUILD_TIME };
}
