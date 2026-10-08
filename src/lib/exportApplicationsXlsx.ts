import type { Row, SheetOptions } from 'write-excel-file/browser';
import type { Application } from '../services/applicationService';
import type { Job } from '../services/jobService';

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/**
 * One sheet, one row per candidate, one column per screening question —
 * the per-job answer matrix requested for ReportsPage. Loads
 * write-excel-file via dynamic import() so it never lands in the main
 * bundle for a feature two recruiters use.
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
    ...questions.map((q) => ({ value: truncate(q.text, 60), fontWeight: 'bold' as const })),
  ];

  const dataRows: Row[] = applications.map((a): Row => [
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
    ...questions.map((q) => {
      const answer = a.answers.find((x) => x.questionId === q.id)?.answer;
      return { value: answer || undefined, wrap: true };
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
    ...questions.map(() => ({ width: 32 })),
  ];

  await writeXlsxFile([headerRow, ...dataRows], {
    columns,
    stickyRowsCount: 1,
  }).toFile(`${job.referenceNumber}-applications-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
