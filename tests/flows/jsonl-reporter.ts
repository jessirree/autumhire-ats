// Appends one JSON line per test AS IT FINISHES — never buffered to the
// end of the run. Three memory reaps killed whole test runs on this
// project before any result was saved; this is the fix for that class of
// loss, not just a nicety. scripts/regenerate-traceability-evidence.cjs
// reads this file to keep docs/traceability-v2.md's evidence column
// in sync with what has actually been run, instead of hand-maintained.
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { appendFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// package.json has "type": "module", so this file runs as ESM — no
// __dirname. Derive the same thing from import.meta.url instead.
const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(DIR, 'results.jsonl');

/** `'APP-10: candidates can subscribe...'` -> `'APP-10'`. Untitled/unprefixed tests are skipped — this suite only reports requirement-ID-named tests. */
function requirementId(title: string): string | null {
  const m = /^([A-Z]+-\d+):/.exec(title);
  return m ? m[1] : null;
}

export default class JsonlReporter implements Reporter {
  onBegin() {
    mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    // Truncate at the start of each run — this file is a snapshot of the
    // most recent run, not an unbounded log.
    writeFileSync(OUT_FILE, '');
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const id = requirementId(test.title);
    if (!id) return; // not a requirement-mapped test; nothing for the evidence script to do with it
    const record = {
      id,
      title: test.title,
      file: path.relative(process.cwd(), test.location.file).replace(/\\/g, '/'),
      status: result.status, // 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted'
      durationMs: result.duration,
      error: result.status === 'passed' ? null : (result.error?.message ?? null),
      finishedAt: new Date().toISOString(),
    };
    // Append + flush immediately — this is the whole point of a custom
    // reporter here instead of the built-in JSON reporter, which only
    // writes once at the very end of the run.
    appendFileSync(OUT_FILE, JSON.stringify(record) + '\n');
  }
}
