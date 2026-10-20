#!/usr/bin/env node
// Regenerates docs/traceability-v2.md's Evidence tier / Evidence / Notes
// columns from tests/flows/results.jsonl, so that table stops being
// hand-maintained for any requirement ID this flow suite actually covers.
//
// Usage: node scripts/regenerate-traceability-evidence.cjs
// (run after `pnpm test:flows`; it reads the JSONL the suite just wrote)
//
// What it does, per row whose ID appears in the JSONL:
//   - status 'passed'   -> Evidence tier becomes "automated test", a note
//     naming the flow test and date is appended to Evidence, and Verdict
//     is upgraded BUILT UNVERIFIED -> VERIFIED (any other verdict is left
//     alone — a passing flow test doesn't override a judgement call like
//     OPEN/DEFERRED/NOT A FEATURE made for other reasons).
//   - anything else ('failed', 'timedOut', 'interrupted') -> Verdict is
//     left untouched, but Notes gets a loud "FLOW TEST FAILING" flag with
//     the error message, so a stale "it works" claim can't survive a
//     regression silently.
//
// Does not invent rows, does not touch rows the JSONL has nothing to say
// about, does not touch anything outside the per-ID table rows themselves
// (the scorecard/prose sections above and below the tables are untouched —
// re-tallying those is a separate, deliberate step, not automatic).

const fs = require('fs');
const path = require('path');

const JSONL_PATH = path.join(__dirname, '..', 'tests', 'flows', 'results.jsonl');
const DOC_PATH = path.join(__dirname, '..', 'docs', 'traceability-v2.md');

function loadLatestResults() {
  if (!fs.existsSync(JSONL_PATH)) {
    console.error(`No results file at ${JSONL_PATH} — run \`pnpm test:flows\` first.`);
    process.exit(1);
  }
  const lines = fs.readFileSync(JSONL_PATH, 'utf8').split('\n').filter((l) => l.trim());
  const byId = new Map();
  for (const line of lines) {
    const rec = JSON.parse(line);
    byId.set(rec.id, rec); // last occurrence wins, matches run order
  }
  return byId;
}

// Splits a markdown table row `| a | b | c |` into ['a','b','c'], trimmed.
function splitRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim());
}

function joinRow(cells) {
  return `| ${cells.join(' | ')} |`;
}

function regenerate() {
  const results = loadLatestResults();
  const text = fs.readFileSync(DOC_PATH, 'utf8');
  const lines = text.split('\n');
  const idPattern = /^[A-Z]+-\d+$/;

  let updated = 0;
  const touchedIds = new Set();

  const newLines = lines.map((line) => {
    const cells = splitRow(line);
    if (!cells || cells.length !== 6) return line; // not a 6-column requirement row (headers, separators, other tables)
    const [id, requirement, verdict, tier, evidence, notes] = cells;
    if (!idPattern.test(id)) return line;
    const result = results.get(id);
    if (!result) return line;

    touchedIds.add(id);
    const today = result.finishedAt.slice(0, 10);

    if (result.status === 'passed') {
      const newVerdict = verdict === 'BUILT UNVERIFIED' ? 'VERIFIED' : verdict;
      const newTier = 'automated test';
      const flag = `Flow test \`${result.title}\` passed ${today} (\`${result.file}\`).`;
      const newEvidence = evidence.includes('Flow test `') ? evidence : `${evidence} ${flag}`;
      updated += 1;
      return joinRow([id, requirement, newVerdict, newTier, newEvidence, notes]);
    }

    // failed / timedOut / interrupted / skipped
    const flag = `**FLOW TEST FAILING** as of ${today} — \`${result.title}\`: ${result.error ?? 'no error message captured'} (\`${result.file}\`).`;
    const newNotes = notes.includes('FLOW TEST FAILING') ? notes : `${flag} ${notes}`.trim();
    updated += 1;
    return joinRow([id, requirement, verdict, tier, evidence, newNotes]);
  });

  fs.writeFileSync(DOC_PATH, newLines.join('\n'));

  const unmatched = [...results.keys()].filter((id) => !touchedIds.has(id));
  console.log(`Updated ${updated} row(s) in ${path.relative(process.cwd(), DOC_PATH)}.`);
  if (unmatched.length) {
    console.warn(`No matching table row found for: ${unmatched.join(', ')} — check the ID is spelled exactly as in docs/requirements-source.md.`);
  }
}

regenerate();
