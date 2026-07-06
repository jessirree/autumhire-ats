/**
 * Printable interview report.
 *
 * Renders a completed interview into a clean, self-contained HTML document in a
 * new window and triggers the browser print dialog. This deliberately does NOT
 * print the app UI — it builds a purpose-made document so panelist scores,
 * metrics and consensus notes lay out cleanly on paper / PDF.
 *
 * All values come from the existing interview scoring model (interviewService);
 * no fields are invented.
 */

import type { Interview, PanelScore } from '../services/interviewService';
import { averageScore } from '../services/interviewService';

/** Escape text for safe interpolation into the report HTML. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? esc(iso) : esc(d.toLocaleString());
}

function scoreRow(score: PanelScore): string {
  const when =
    score.recordedAt instanceof Date
      ? score.recordedAt.toLocaleDateString()
      : (score.recordedAt as { toDate?: () => Date } | undefined)?.toDate?.().toLocaleDateString() ?? '';
  return `
    <tr>
      <td>${esc(score.panelistName)}</td>
      <td class="num">${esc(score.score)}<span class="muted">/100</span></td>
      <td>${score.comments ? esc(score.comments) : '<span class="muted">No comments</span>'}</td>
      <td class="muted">${esc(when)}</td>
    </tr>`;
}

/** Build the full standalone HTML document for an interview report. */
export function buildInterviewReportHtml(interview: Interview): string {
  const avg = averageScore(interview);
  const scores = interview.scores ?? [];
  const scored = new Set(scores.map((s) => s.panelistId));
  const pending = (interview.panel ?? []).filter((p) => !scored.has(p.id));

  const resultLabel = interview.result
    ? interview.result.replace(/-/g, ' ')
    : 'Pending';

  const scoresTable = scores.length
    ? `<table class="scores">
         <thead>
           <tr><th>Panelist</th><th class="num">Score</th><th>Comments</th><th>Recorded</th></tr>
         </thead>
         <tbody>${scores.map(scoreRow).join('')}</tbody>
       </table>`
    : `<p class="muted">No panel scores were recorded for this interview.</p>`;

  const pendingNote = pending.length
    ? `<p class="muted small">Awaiting scores from: ${pending.map((p) => esc(p.name)).join(', ')}</p>`
    : '';

  const questionsBlock = (interview.questions ?? []).length
    ? `<section>
         <h2>Interview Questions</h2>
         <ol class="questions">${interview.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
       </section>`
    : '';

  const consensusBlock = `
    <section>
      <h2>Consensus &amp; Recommendation</h2>
      <div class="consensus">
        <div class="verdict verdict-${esc(interview.result ?? 'pending')}">
          <span class="label">Overall recommendation</span>
          <strong>${esc(resultLabel)}</strong>
        </div>
        <p>${interview.notes ? esc(interview.notes) : '<span class="muted">No consensus notes were recorded.</span>'}</p>
      </div>
    </section>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Interview Report — ${esc(interview.candidateName)} — ${esc(interview.jobTitle)}</title>
<style>
  :root { --ink:#1f2937; --muted:#6b7280; --line:#e5e7eb; --brand:#c2410c; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         color: var(--ink); margin: 0; padding: 32px; line-height: 1.5; }
  .sheet { max-width: 800px; margin: 0 auto; }
  header.report { display: flex; justify-content: space-between; align-items: flex-start;
                  border-bottom: 3px solid var(--brand); padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: var(--brand); }
  .brand small { display: block; font-size: 11px; font-weight: 600; color: var(--muted);
                 letter-spacing: 0.08em; text-transform: uppercase; margin-top: 2px; }
  .avg { text-align: right; }
  .avg .num { font-size: 34px; font-weight: 800; line-height: 1; }
  .avg .cap { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted);
       border-bottom: 1px solid var(--line); padding-bottom: 6px; margin: 28px 0 12px; }
  .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; margin-top: 12px; }
  .meta div { font-size: 13px; }
  .meta .k { color: var(--muted); margin-right: 6px; }
  table.scores { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.scores th, table.scores td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line);
                                     vertical-align: top; }
  table.scores th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  .num { text-align: right; white-space: nowrap; }
  .muted { color: var(--muted); }
  .small { font-size: 12px; }
  ol.questions li { margin-bottom: 4px; }
  .consensus .verdict { display: inline-flex; flex-direction: column; padding: 10px 16px; border-radius: 8px;
                        background: #f3f4f6; margin-bottom: 12px; }
  .consensus .verdict .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
  .consensus .verdict strong { font-size: 18px; text-transform: capitalize; }
  .verdict-recommended { background: #ecfdf5; }
  .verdict-not-recommended { background: #fef2f2; }
  .verdict-on-hold { background: #fffbeb; }
  footer.report { margin-top: 32px; padding-top: 12px; border-top: 1px solid var(--line);
                  font-size: 11px; color: var(--muted); display: flex; justify-content: space-between; }
  @media print {
    body { padding: 0; }
    @page { margin: 18mm; }
    h2 { break-after: avoid; }
    table.scores tr { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <header class="report">
      <div class="brand">Autumhire<small>Interview Evaluation Report</small></div>
      <div class="avg">
        <div class="num">${avg === null ? '—' : esc(avg)}</div>
        <div class="cap">Avg. panel score</div>
      </div>
    </header>

    <h1>${esc(interview.candidateName)}</h1>
    <div class="meta">
      <div><span class="k">Position</span>${esc(interview.jobTitle)}</div>
      <div><span class="k">Candidate email</span>${esc(interview.candidateEmail)}</div>
      <div><span class="k">Scheduled</span>${formatDateTime(interview.scheduledAt)}</div>
      <div><span class="k">Mode</span>${esc(interview.mode)}${interview.locationOrLink ? ` — ${esc(interview.locationOrLink)}` : ''}</div>
      <div><span class="k">Duration</span>${esc(interview.durationMinutes)} min</div>
      <div><span class="k">Status</span>${esc(interview.status)}</div>
      <div style="grid-column: 1 / -1;"><span class="k">Panel</span>${(interview.panel ?? []).map((p) => esc(p.name)).join(', ') || '—'}</div>
    </div>

    <section>
      <h2>Per-Panelist Scores</h2>
      ${scoresTable}
      ${pendingNote}
    </section>

    ${consensusBlock}
    ${questionsBlock}

    <footer class="report">
      <span>Autumhire Applicant Tracking System</span>
      <span>Generated ${esc(new Date().toLocaleString())}</span>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Open the interview report in a new window and trigger printing.
 * Returns false if the popup was blocked (caller can surface a toast).
 */
export function printInterviewReport(interview: Interview): boolean {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return false;
  win.document.open();
  win.document.write(buildInterviewReportHtml(interview));
  win.document.close();
  // Give the freshly written document a tick to lay out, then print.
  // Runs in the child window's context so it fires reliably after document.write.
  win.focus();
  win.setTimeout(() => {
    win.focus();
    win.print();
  }, 150);
  return true;
}
