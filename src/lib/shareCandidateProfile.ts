/**
 * Share a candidate profile.
 *
 * Two outputs, both built from the existing Application + Interview models:
 *  - a CONCISE plain-text summary used as a `mailto:` body (kept short because
 *    many mail clients / browsers truncate mailto URLs past ~2000 chars), and
 *  - a FULL summary for the "Copy full summary" clipboard fallback.
 */

import type { Application } from '../services/applicationService';
import type { Interview } from '../services/interviewService';
import { averageScore } from '../services/interviewService';

/** Browsers/clients commonly truncate mailto URLs beyond ~2000 chars. */
const MAILTO_SAFE_BODY_CHARS = 1600;

function location(app: Application): string {
  return [app.city, app.country].filter(Boolean).join(', ') || '—';
}

function bioLines(app: Application): string[] {
  const lines = [
    `Name:        ${app.candidateName}`,
    `Email:       ${app.email}`,
    `Phone:       ${app.phone || '—'}`,
    `Location:    ${location(app)}`,
    `Applied for: ${app.jobTitle}${app.department ? ` (${app.department})` : ''}`,
    `Status:      ${app.status}`,
  ];
  return lines;
}

function extendedBioLines(app: Application): string[] {
  return [
    `Gender:       ${app.gender || '—'}`,
    `Nationality:  ${app.nationality || '—'}`,
    `Date of birth:${app.dateOfBirth ? ' ' + app.dateOfBirth : ' —'}`,
    `Source:       ${app.source || '—'}`,
    `Internal:     ${app.isInternal ? 'Yes' : 'No'}`,
    `Ex-employee:  ${app.workedHereBefore ? 'Yes' : 'No'}`,
  ];
}

function screeningLines(app: Application, full: boolean): string[] {
  const lines = [`Screening score: ${app.prescreenScore}`];
  const answers = app.answers ?? [];
  if (full && answers.length) {
    lines.push('Questionnaire:');
    for (const a of answers) {
      const pts = a.score !== undefined ? ` [${a.score} pts]` : '';
      lines.push(`  • ${a.question}${pts}`);
      lines.push(`      ${a.answer || '—'}`);
    }
  } else if (answers.length) {
    const scored = answers.filter((a) => a.score !== undefined).length;
    lines.push(`Questionnaire: ${answers.length} answered${scored ? `, ${scored} scored` : ''}`);
  }
  return lines;
}

/** Panelist tracking history across the candidate's interviews. */
function interviewLines(interviews: Interview[], full: boolean): string[] {
  if (!interviews.length) return ['No interviews on record.'];
  const lines: string[] = [];
  for (const iv of interviews) {
    const avg = averageScore(iv);
    const when = new Date(iv.scheduledAt);
    const whenStr = Number.isNaN(when.getTime()) ? iv.scheduledAt : when.toLocaleString();
    lines.push(
      `${whenStr} — ${iv.status}${iv.result ? ` (${iv.result})` : ''}` +
        `${avg === null ? '' : ` — avg ${avg}/100`}`,
    );
    lines.push(`  Panel: ${(iv.panel ?? []).map((p) => p.name).join(', ') || '—'}`);
    if (full) {
      for (const s of iv.scores ?? []) {
        lines.push(`    - ${s.panelistName}: ${s.score}/100${s.comments ? ` — ${s.comments}` : ''}`);
      }
      if (iv.notes) lines.push(`  Consensus: ${iv.notes}`);
    }
  }
  return lines;
}

export interface CandidateSummaryOptions {
  /** Include the full questionnaire, per-panelist scores and consensus notes. */
  full?: boolean;
}

/** Build a plain-text candidate summary (concise by default, full when asked). */
export function buildCandidateSummary(
  application: Application,
  interviews: Interview[],
  options: CandidateSummaryOptions = {},
): string {
  const { full = false } = options;
  const blocks: string[][] = [
    [`CANDIDATE PROFILE — ${application.candidateName}`, '='.repeat(48)],
    ['BIO-DATA', ...bioLines(application), ...(full ? extendedBioLines(application) : [])],
    ['SCREENING', ...screeningLines(application, full)],
    ['PANELIST TRACKING HISTORY', ...interviewLines(interviews, full)],
  ];
  if (full) {
    const history = (application.statusHistory ?? []).map(
      (h) => `  • ${h.status} — by ${h.byName}${h.comment ? ` (“${h.comment}”)` : ''}`,
    );
    if (history.length) blocks.push(['STATUS HISTORY', ...history]);
  }
  return blocks.map((b) => b.join('\n')).join('\n\n');
}

/**
 * Open the user's mail client with a prefilled draft summarising the candidate.
 * The body is the concise summary, trimmed to a mailto-safe length; the caller
 * should also offer "Copy full summary" for the complete version.
 */
export function shareCandidateProfileByEmail(
  application: Application,
  interviews: Interview[],
): void {
  const subject = `Candidate profile — ${application.candidateName} (${application.jobTitle})`;
  let body = buildCandidateSummary(application, interviews, { full: false });
  if (body.length > MAILTO_SAFE_BODY_CHARS) {
    body =
      body.slice(0, MAILTO_SAFE_BODY_CHARS).trimEnd() +
      '\n\n… (summary truncated for email — use “Copy full summary” for the complete profile)';
  }
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}

/**
 * Copy the FULL candidate summary to the clipboard.
 * Returns false when the Clipboard API is unavailable / denied.
 */
export async function copyFullCandidateSummary(
  application: Application,
  interviews: Interview[],
): Promise<boolean> {
  const text = buildCandidateSummary(application, interviews, { full: true });
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
