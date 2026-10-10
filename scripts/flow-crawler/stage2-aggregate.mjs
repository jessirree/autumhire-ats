// Renders scripts/flow-crawler-output/stage2-report.md from
// scripts/flow-crawler-output/stage2.jsonl. Safe to run at any time,
// including against a partial file from an interrupted run — it only
// reports what's actually in the file, nothing inferred.
//
//   node scripts/flow-crawler/stage2-aggregate.mjs

import fs from 'node:fs';
import path from 'node:path';
import { OUTPUT_DIR, isSelfTarget } from './config.mjs';

const JSONL_PATH = path.join(OUTPUT_DIR, 'stage2.jsonl');
const REPORT_PATH = path.join(OUTPUT_DIR, 'stage2-report.md');

function readRecords() {
  if (!fs.existsSync(JSONL_PATH)) return [];
  return fs.readFileSync(JSONL_PATH, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
}

function main() {
  const records = readRecords();
  const controls = records.filter((r) => r.type === 'control');
  const selfSuppressed = controls.filter((r) => r.nothingHappened && isSelfTarget(r.role, r.route, r.name));
  const flagged = controls.filter((r) => r.nothingHappened && !isSelfTarget(r.role, r.route, r.name));
  const failedDownloads = controls.filter((r) => r.downloadInfo && !r.downloadInfo.arrived);
  const noAccessibleName = controls.filter((r) => r.name === '(no accessible name)' || r.name === '(unreadable)');
  const backlinks = records.filter((r) => r.type === 'backlink');
  const pageComplete = records.filter((r) => r.type === 'page-complete');

  const coverage = new Map(); // role -> Set(route)
  for (const r of pageComplete) {
    if (!coverage.has(r.role)) coverage.set(r.role, new Set());
    coverage.get(r.role).add(r.route);
  }

  const lines = [];
  lines.push('# Flow crawler — Stage 2 (write-path) report');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()} from ${JSONL_PATH}.`);
  lines.push('');
  lines.push('This is a crawler report, not a verdict (docs/flow-crawler-spec.md §6). Rendered from the jsonl — may reflect a partial run; see Coverage below for exactly what has and has not completed.');
  lines.push('');
  lines.push('**Limitation:** only `button`, `a[href]`, `input[type=submit/button]`, `[role=button]` and `[role=menuitem]` were tested. Text inputs, checkboxes, radios and native `<select>` elements were not clicked. Controls revealed only after another control opens a modal are out of scope — each route is reset to a clean reload before the next control on it is tested.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Coverage');
  lines.push('');
  lines.push('| Role | Routes completed |');
  lines.push('|---|---|');
  for (const [r, set] of coverage) {
    lines.push(`| ${r} | ${set.size} (${[...set].join(', ')}) |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Back-link check — staff-entry path (spec §4)');
  lines.push('');
  for (const r of backlinks) {
    lines.push(`### ${r.role}`);
    lines.push('');
    lines.push(r.outcome);
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push('## Confirmed defects — download did not arrive');
  lines.push('');
  lines.push('Not a heuristic flag: the export/download fired a browser download event (the fifth signal) but no non-empty file arrived. That is a real failure, not a blind spot.');
  lines.push('');
  if (failedDownloads.length === 0) {
    lines.push('None found (in what has run so far).');
  } else {
    lines.push('| Role | Route | Accessible name | Detail |');
    lines.push('|---|---|---|---|');
    for (const f of failedDownloads) {
      lines.push(`| ${f.role} | ${f.route} | ${(f.name || '').replace(/\|/g, '\\|')} | ${f.result} |`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Flagged candidate dead controls (all five signals unchanged)');
  lines.push('');
  lines.push(`${selfSuppressed.length} control(s) excluded from this list as expected self-targets (a nav control already pointing at the current page) — still present in the jsonl, listed below for visibility, not hidden from the data.`);
  lines.push('');
  if (flagged.length === 0) {
    lines.push('None found (in what has run so far, after self-target suppression).');
  } else {
    lines.push('| Role | Route | Accessible name | Selector |');
    lines.push('|---|---|---|---|');
    for (const f of flagged) {
      lines.push(`| ${f.role} | ${f.route} | ${(f.name || '').replace(/\|/g, '\\|')} | \`${f.selector}\` |`);
    }
  }
  lines.push('');
  lines.push('This is a heuristic list to review, not a verdict (spec §3).');
  lines.push('');
  if (selfSuppressed.length > 0) {
    lines.push('<details><summary>Self-targets excluded above (click to expand)</summary>');
    lines.push('');
    lines.push('| Role | Route | Accessible name |');
    lines.push('|---|---|---|');
    for (const s of selfSuppressed) {
      lines.push(`| ${s.role} | ${s.route} | ${(s.name || '').replace(/\|/g, '\\|')} |`);
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push('## Controls with no accessible name');
  lines.push('');
  lines.push('This is both an accessibility defect list and a note on the deny-list\'s limits: the account-destructive deny list (sign out / log out / delete account) matches on accessible name, so any control in this list cannot be matched by it at all. Harmless against the isolated emulator this crawl runs against, but it means the deny list was never as strong as specced wherever this pattern appears — a real destructive control with no accessible name would be clicked anyway.');
  lines.push('');
  if (noAccessibleName.length === 0) {
    lines.push('None found (in what has run so far).');
  } else {
    const seen = new Set();
    lines.push('| Role | Route | Selector |');
    lines.push('|---|---|---|');
    for (const n of noAccessibleName) {
      const key = `${n.role}|${n.route}|${n.selector}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`| ${n.role} | ${n.route} | \`${n.selector}\` |`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Full click log');
  lines.push('');
  lines.push('| Role | Route | Accessible name | Selector | Result |');
  lines.push('|---|---|---|---|---|');
  for (const c of controls) {
    lines.push(`| ${c.role} | ${c.route} | ${(c.name || '').replace(/\|/g, '\\|')} | \`${c.selector}\` | ${c.result} |`);
  }
  lines.push('');

  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
  console.log(`Wrote ${REPORT_PATH} (${controls.length} control record(s), ${flagged.length} flagged, ${backlinks.length} back-link result(s)).`);
}

main();
