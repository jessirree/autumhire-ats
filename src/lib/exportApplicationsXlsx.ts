import type { Row, SheetOptions } from 'write-excel-file/browser';
import type { Application } from '../services/applicationService';
import type { Job } from '../services/jobService';
import { computeScoreSummary } from './scoreBreakdown';

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/**
 * One sheet, one row per candidate, one column per screening question,
 * plus — per row 5.1/5.8, "comparing required and existing competencies"
 * — a Score/Max column pair per question and a Total/Max pair overall.
 * Rows ordered by total score descending, since this is now also the
 * ranked-candidates artefact for that row, not just the answer matrix.
 *
 * A question's maximum is read from its own rubric (the highest-points
 * choice, or its flat score for checkbox/number/free-text questions),
 * never assumed — and a question a given candidate left blank is
 * excluded from both their total and their maximum, not counted as a
 * zero (RECRUITMENT SYSTEM REQUIREMENTS.docx.md's Reliability section:
 * "system checks and reports must be mathematically correct, including
 * ranking of candidates"). See scoreBreakdown.ts for the two rules this
 * follows and their unit tests.
 *
 * The existing "Pre-screen score" column (Application.prescreenScore) is
 * kept as-is alongside the new Total Score column rather than replaced —
 * they are usually equal, but prescreenScore does not itself guarantee
 * the same "excluded, not zero" treatment for a skipped question, so a
 * divergence between the two is informative, not noise to collapse away.
 *
 * Loads write-excel-file via dynamic import() so it never lands in the
 * main bundle for a feature two recruiters use.
 *
 * Known gap: write-excel-file has no autofilter support (checked against
 * its README and type definitions). Frozen header row, column widths and
 * wrapped answer cells are all implemented; autofilter is not. Turning it
 * on in Excel afterwards is one click (Data > Filter), so this was judged
 * an acceptable trade for staying on a small, actively maintained library
 * — see the Wave D completion note for the full reasoning.
 */
export async function exportApplicationsXlsx(job: Job, applications: Application[]): Promise<void> {
  const writeXlsxFile = (await import('write-excel-file/browser')).default;

  const questions = job.questions ?? [];

  const withSummary = applications.map((a) => ({
    application: a,
    summary: computeScoreSummary(questions, a.answers ?? []),
  }));
  // Descending by total score — this sheet is now also the ranked-list
  // artefact, not just the answer matrix.
  withSummary.sort((x, y) => y.summary.totalScore - x.summary.totalScore);

  // Explicitly typed rather than inferred: a plain array literal here lets
  // TypeScript infer a different shape per row (the header's fontWeight vs a
  // data row's wrap/type/format), which made it pick the wrong writeXlsxFile
  // overload entirely and report a confusing "columns needs a cell property"
  // error that had nothing to do with the actual rows.
  const headerRow: Row = [
    { value: 'Candidate', fontWeight: 'bold' as const },
    { value: 'Email', fontWeight: 'bold' as const },
    { value: 'Phone', fontWeight: 'bold' as const },
    { value: 'Applied', fontWeight: 'bold' as const },
    { value: 'Status', fontWeight: 'bold' as const },
    { value: 'Pre-screen score', fontWeight: 'bold' as const },
    { value: 'Panel rating', fontWeight: 'bold' as const },
    { value: 'Total Score', fontWeight: 'bold' as const },
    { value: 'Total Max', fontWeight: 'bold' as const },
    { value: 'Questions Scored', fontWeight: 'bold' as const },
    ...questions.flatMap((q) => [
      { value: truncate(q.text, 60), fontWeight: 'bold' as const },
      { value: `${truncate(q.text, 50)} — Score`, fontWeight: 'bold' as const },
      { value: `${truncate(q.text, 50)} — Max`, fontWeight: 'bold' as const },
    ]),
  ];

  const dataRows: Row[] = withSummary.map(({ application: a, summary }): Row => [
    { value: a.candidateName },
    { value: a.email },
    // Cell's `value` property is `Value | undefined`, not `| null` — a bare
    // `null` (no wrapping object) is its own valid Cell variant instead.
    a.phone || null,
    a.appliedAt?.toDate
      ? { value: a.appliedAt.toDate(), type: Date, format: 'yyyy-mm-dd' }
      : null,
    { value: a.status },
    { value: a.prescreenScore, type: Number },
    a.panelRatingAvg != null ? { value: a.panelRatingAvg, type: Number } : null,
    { value: summary.totalScore, type: Number },
    { value: summary.totalMax, type: Number },
    { value: `${summary.scoredCount} of ${summary.scorableCount} scored` },
    ...questions.flatMap((q, i) => {
      const answer = a.answers?.find((x) => x.questionId === q.id)?.answer;
      const per = summary.perQuestion[i];
      return [
        { value: answer || undefined, wrap: true },
        // Blank, not 0, when this candidate's answer to this question was
        // excluded (skipped, or the question carries no rubric at all) —
        // the whole reason this module exists.
        per.score == null ? null : { value: per.score, type: Number },
        per.max == null ? null : { value: per.max, type: Number },
      ];
    }),
  ]);

  const columns: NonNullable<SheetOptions<unknown>['columns']> = [
    { width: 22 },
    { width: 26 },
    { width: 15 },
    { width: 12 },
    { width: 14 },
    { width: 15 },
    { width: 13 },
    { width: 12 },
    { width: 11 },
    { width: 16 },
    ...questions.flatMap(() => [{ width: 32 }, { width: 14 }, { width: 12 }]),
  ];

  await writeXlsxFile([headerRow, ...dataRows], {
    columns,
    stickyRowsCount: 1,
  }).toFile(`${job.referenceNumber}-applications-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
