import type { Application } from '../services/applicationService';
import { downloadBlob } from './downloadBlob';

const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/g;
const CONCURRENCY = 6;
const MAX_TOTAL_BYTES = 250 * 1024 * 1024; // browsers OOM building a zip much larger than this

function sanitizeFilenamePart(s: string): string {
  return s.replace(ILLEGAL_FILENAME_CHARS, '').trim().replace(/\s+/g, '_');
}

/** De-duplicates a filename within the zip by appending _2, _3, ... */
function makeNameUnique(base: string, used: Map<string, number>): string {
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  if (count === 0) return base;
  const dot = base.lastIndexOf('.');
  const stem = dot === -1 ? base : base.slice(0, dot);
  const ext = dot === -1 ? '' : base.slice(dot);
  return `${stem}_${count + 1}${ext}`;
}

export interface DocumentTotal {
  included: number;
  total: number;
}

export interface DownloadJobCvsResult {
  zipped: number;
  skipped: { name: string; reason: string }[];
  /** Per-document-type totals across every candidate, for a short toast ("CVs 4 of 6, cover letters 2 of 6") — full per-candidate breakdown is in the zip's _summary.txt. */
  totals: { cv: DocumentTotal; coverLetter: DocumentTotal; otherDocs: DocumentTotal };
}

interface CandidateDocRecord {
  name: string;
  cv: 'included' | 'missing';
  coverLetter: 'included' | 'missing';
  otherDocsIncluded: number;
  otherDocsTotal: number;
}

function buildSummaryText(
  job: { referenceNumber: string; title: string },
  records: CandidateDocRecord[],
  totals: DownloadJobCvsResult['totals']
): string {
  const lines = [
    'Autumhire — document download summary',
    `${job.referenceNumber} — ${job.title}`,
    `Generated ${new Date().toISOString()}`,
    '',
    'Totals:',
    `  CVs:             ${totals.cv.included} of ${totals.cv.total} included`,
    `  Cover letters:   ${totals.coverLetter.included} of ${totals.coverLetter.total} included`,
    `  Other documents: ${totals.otherDocs.included} of ${totals.otherDocs.total} included`,
    '',
    'Per candidate:',
  ];
  const nameWidth = Math.max(8, ...records.map((r) => r.name.length));
  for (const r of records) {
    lines.push(
      `  ${r.name.padEnd(nameWidth)}  CV: ${r.cv.padEnd(8)}  Cover letter: ${r.coverLetter.padEnd(8)}  Other docs: ${r.otherDocsIncluded} of ${r.otherDocsTotal}`
    );
  }
  return lines.join('\n') + '\n';
}

/**
 * Fetches every candidate's CV, cover letter and other supporting documents
 * (G1) for a job, renames each to {referenceNumber}_{Candidate_Name}_CV.pdf /
 * _CoverLetter.pdf / _Doc{n}.pdf, and triggers a single zip download.
 * A candidate is only skipped (never failed) when NOTHING could be added for
 * them — no documents on file, or every fetch for them failed; a candidate
 * with some but not all of their documents still counts as zipped, just
 * thinner, same as the single-document download elsewhere in the product
 * silently working with whatever exists — but that thinner outcome used
 * to be invisible: the `skipped` list only ever named candidates with
 * zero documents. The zip itself now carries a `_summary.txt` (one line
 * per candidate naming which of CV/cover letter/other docs made it in,
 * plus totals per type at the top), since a toast can't list twenty
 * names; `totals` on the return value is the short version for that
 * toast. Aborts with a thrown error if the running total passes
 * MAX_TOTAL_BYTES — the caller should surface that message as-is.
 */
export async function downloadJobCvs(
  job: { id: string; referenceNumber: string; title: string },
  applications: Application[],
  onProgress: (done: number, total: number) => void
): Promise<DownloadJobCvsResult> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const total = applications.length;
  let done = 0;
  let totalBytes = 0;
  let aborted = false;
  let tooLarge = false;
  const skipped: { name: string; reason: string }[] = [];
  const usedNames = new Map<string, number>();
  const records: CandidateDocRecord[] = [];

  const processOne = async (app: Application) => {
    const displayName = app.candidateName || app.candidateId;
    const record: CandidateDocRecord = {
      name: displayName,
      cv: 'missing',
      coverLetter: 'missing',
      otherDocsIncluded: 0,
      otherDocsTotal: (app.otherDocsUrls ?? []).length,
    };
    try {
      const files: { suffix: string; url: string; type: 'cv' | 'coverLetter' | 'other' }[] = [];
      if (app.cvUrl) files.push({ suffix: 'CV', url: app.cvUrl, type: 'cv' });
      if (app.coverLetterUrl) files.push({ suffix: 'CoverLetter', url: app.coverLetterUrl, type: 'coverLetter' });
      (app.otherDocsUrls ?? []).forEach((docFile, i) => {
        files.push({ suffix: `Doc${i + 1}`, url: docFile.url, type: 'other' });
      });

      if (files.length === 0) {
        skipped.push({ name: displayName, reason: 'No documents on file' });
        return;
      }

      let addedAny = false;
      for (const file of files) {
        if (aborted) break;
        try {
          const res = await fetch(file.url);
          if (!res.ok) continue; // this one document failed; still try the candidate's others
          const blob = await res.blob();
          totalBytes += blob.size;
          if (totalBytes > MAX_TOTAL_BYTES) {
            tooLarge = true;
            aborted = true;
            break;
          }
          const base = `${sanitizeFilenamePart(job.referenceNumber)}_${sanitizeFilenamePart(displayName)}_${file.suffix}.pdf`;
          zip.file(makeNameUnique(base, usedNames), blob);
          addedAny = true;
          if (file.type === 'cv') record.cv = 'included';
          else if (file.type === 'coverLetter') record.coverLetter = 'included';
          else record.otherDocsIncluded += 1;
        } catch {
          // this one document failed; still try the candidate's others
        }
      }
      if (!addedAny && !aborted) {
        skipped.push({ name: displayName, reason: 'Download failed' });
      }
    } catch {
      // Belt-and-suspenders: the per-file fetch/blob calls above already
      // have their own try/catch, but building `files` or iterating them
      // is still inside this outer try — a surprise here must still skip
      // just this one candidate, never reject the whole batch.
      skipped.push({ name: displayName, reason: 'Download failed' });
    } finally {
      records.push(record);
      done += 1;
      onProgress(done, total);
    }
  };

  // Bounded concurrency pool — fetching 80 CVs with Promise.all would get
  // throttled or exhaust the browser's connection pool.
  const queue = [...applications];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length > 0 && !aborted) {
      const app = queue.shift();
      if (!app) break;
      await processOne(app);
    }
  });
  await Promise.all(workers);

  if (tooLarge) {
    throw new Error(
      `This selection is too large to zip in the browser (over ${Math.round(MAX_TOTAL_BYTES / (1024 * 1024))} MB). Filter to fewer candidates and try again.`
    );
  }

  const zipped = total - skipped.length;

  const totals: DownloadJobCvsResult['totals'] = {
    cv: { included: records.filter((r) => r.cv === 'included').length, total },
    coverLetter: { included: records.filter((r) => r.coverLetter === 'included').length, total },
    otherDocs: {
      included: records.reduce((sum, r) => sum + r.otherDocsIncluded, 0),
      total: records.reduce((sum, r) => sum + r.otherDocsTotal, 0),
    },
  };

  if (zipped > 0) {
    // records is built per-candidate as processOne settles, not in
    // `applications` order (bounded-concurrency workers finish out of
    // order) — sort for a stable, readable _summary.txt.
    const sortedRecords = [...records].sort((a, b) => a.name.localeCompare(b.name));
    zip.file('_summary.txt', buildSummaryText(job, sortedRecords, totals));
    const content = await zip.generateAsync({ type: 'blob' });
    downloadBlob(content, `${job.referenceNumber}-documents-${new Date().toISOString().slice(0, 10)}.zip`);
  }

  return { zipped, skipped, totals };
}
