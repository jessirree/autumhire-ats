import type { Application } from '../services/applicationService';

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

export interface DownloadJobCvsResult {
  zipped: number;
  skipped: { name: string; reason: string }[];
}

/**
 * Fetches every candidate's CV for a job, renames each to
 * {referenceNumber}_{Candidate_Name}_CV.pdf, and triggers a zip download.
 * Skips (never fails) a candidate with no CV or a failed fetch. Aborts with
 * a thrown error if the running total passes MAX_TOTAL_BYTES — the caller
 * should surface that message as-is.
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

  const processOne = async (app: Application) => {
    const displayName = app.candidateName || app.candidateId;
    try {
      if (!app.cvUrl) {
        skipped.push({ name: displayName, reason: 'No CV on file' });
        return;
      }
      const res = await fetch(app.cvUrl);
      if (!res.ok) {
        skipped.push({ name: displayName, reason: `Download failed (HTTP ${res.status})` });
        return;
      }
      const blob = await res.blob();
      totalBytes += blob.size;
      if (totalBytes > MAX_TOTAL_BYTES) {
        tooLarge = true;
        aborted = true;
        return;
      }
      const base = `${sanitizeFilenamePart(job.referenceNumber)}_${sanitizeFilenamePart(displayName)}_CV.pdf`;
      zip.file(makeNameUnique(base, usedNames), blob);
    } catch {
      skipped.push({ name: displayName, reason: 'Download failed' });
    } finally {
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
  if (zipped > 0) {
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.referenceNumber}-CVs-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { zipped, skipped };
}
