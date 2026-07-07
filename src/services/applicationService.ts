import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { STORAGE_ENABLED } from '../lib/featureFlags';
import { getJobById, isJobOpen, Job, ScreeningQuestion } from './jobService';
import { notify } from './notificationService';
import { logAudit } from './auditService';

export type ApplicationStatus =
  | 'applied'
  | 'longlisted'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'regretted'
  | 'rejected'
  | 'withdrawn';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'applied',
  'longlisted',
  'shortlisted',
  'interview',
  'offer',
  'hired',
  'regretted',
  'rejected',
  'withdrawn',
];

export interface ScreeningAnswer {
  questionId: string;
  question: string;
  answer: string;
  score?: number;
}

export interface StatusHistoryEntry {
  status: ApplicationStatus;
  byId: string;
  byName: string;
  comment?: string;
  at: Timestamp | Date;
}

export interface Referee {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  relationship?: string;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  department: string;
  candidateId: string;
  candidateName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  city?: string;
  country?: string;
  isInternal: boolean;
  workedHereBefore: boolean;
  source?: string;
  cvUrl?: string;
  cvFileName?: string;
  coverLetterUrl?: string;
  coverLetterFileName?: string;
  otherDocsUrls?: { name: string; url: string }[];
  answers: ScreeningAnswer[];
  prescreenScore: number;
  status: ApplicationStatus;
  statusHistory: StatusHistoryEntry[];
  referees?: Referee[];
  consentGiven: boolean;
  /** Archived candidate files are hidden from active views but never deleted. */
  archived?: boolean;
  appliedAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface PanelComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  stage: string; // e.g. 'shortlisting', 'screening'
  createdAt?: Timestamp | null;
}

const COL = 'Applications';

function toApplication(id: string, data: any): Application {
  return {
    answers: [],
    statusHistory: [],
    prescreenScore: 0,
    isInternal: false,
    workedHereBefore: false,
    consentGiven: false,
    ...data,
    id,
  } as Application;
}

// ── Scoring ─────────────────────────────────────────────────────────

/** Auto-score answers against the job's screening questions. */
export function scoreAnswers(questions: ScreeningQuestion[], answers: ScreeningAnswer[]): {
  answers: ScreeningAnswer[];
  total: number;
} {
  let total = 0;
  const scored = answers.map((a) => {
    const q = questions.find((qq) => qq.id === a.questionId);
    if (!q) return a;
    const hasChoices = !!q.choices && q.choices.length > 0;
    if (!hasChoices && !q.score) return a;
    let earned = 0;
    if (hasChoices) {
      const match = q.choices!.find(
        (c) => c.label.trim().toLowerCase() === a.answer.trim().toLowerCase()
      );
      earned = match ? match.points : 0;
    } else if (q.type === 'checkbox') {
      const expected = (q.expectedAnswer ?? 'yes').toLowerCase();
      if (a.answer.trim().toLowerCase() === expected) earned = q.score!;
    } else if (q.type === 'number') {
      const expected = Number(q.expectedAnswer);
      if (!Number.isNaN(expected) && Number(a.answer) >= expected) earned = q.score!;
    } else if (a.answer.trim()) {
      earned = q.score!; // free-text: full marks for answering; recruiter can adjust
    }
    total += earned;
    return { ...a, score: earned };
  });
  return { answers: scored, total };
}

// ── Duplicate / history checks ──────────────────────────────────────

export async function hasAppliedToJob(candidateId: string, jobId: string): Promise<boolean> {
  const snap = await getDocs(
    query(collection(db, COL), where('candidateId', '==', candidateId), where('jobId', '==', jobId))
  );
  return !snap.empty;
}

export async function getApplicationsByCandidate(candidateId: string): Promise<Application[]> {
  const snap = await getDocs(query(collection(db, COL), where('candidateId', '==', candidateId)));
  return snap.docs
    .map((d) => toApplication(d.id, d.data()))
    .sort((a, b) => (b.appliedAt?.toMillis?.() ?? 0) - (a.appliedAt?.toMillis?.() ?? 0));
}

// ── Apply ───────────────────────────────────────────────────────────

async function uploadApplicationFile(
  jobId: string,
  candidateId: string,
  kind: string,
  file: File
): Promise<{ url: string; name: string }> {
  const storageRef = ref(storage, `applications/${jobId}/${candidateId}/${kind}-${file.name}`);
  await uploadBytes(storageRef, file);
  return { url: await getDownloadURL(storageRef), name: file.name };
}

export async function applyToJob(input: {
  job: Job;
  candidate: { id: string; name: string; email: string };
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  city?: string;
  country?: string;
  isInternal?: boolean;
  workedHereBefore?: boolean;
  source?: string;
  cvFile?: File | null;
  /** Reuse an already-uploaded profile CV instead of uploading a new file. */
  existingCv?: { url: string; name: string } | null;
  coverLetterFile?: File | null;
  otherFiles?: File[];
  answers: ScreeningAnswer[];
  referees?: Referee[];
  consentGiven: boolean;
}): Promise<Application> {
  const { job, candidate } = input;

  // Guard: job must still be open.
  const fresh = await getJobById(job.id);
  if (!fresh || !isJobOpen(fresh)) {
    throw new Error('This job is no longer available.');
  }

  // Guard: consent clause is mandatory.
  if (!input.consentGiven) {
    throw new Error('You must confirm that the information provided is correct.');
  }

  // Guard: no duplicate applications for the same job.
  if (await hasAppliedToJob(candidate.id, job.id)) {
    throw new Error('You have already applied for this job.');
  }

  // Guard: required documents checklist (skipped while storage is disabled).
  if (STORAGE_ENABLED) {
    if (fresh.requireResume && !input.cvFile && !input.existingCv) {
      throw new Error('A CV/resume is required for this job.');
    }
    if (fresh.requireCoverLetter && !input.coverLetterFile) {
      throw new Error('A cover letter is required for this job.');
    }
  }

  // Guard: mandatory screening questions answered.
  for (const q of fresh.questions ?? []) {
    if (q.mandatory) {
      const a = input.answers.find((x) => x.questionId === q.id);
      if (!a || !a.answer.trim()) {
        throw new Error(`Please answer the required question: "${q.text}"`);
      }
    }
  }

  // Uploads.
  let cv: { url: string; name: string } | undefined;
  let cover: { url: string; name: string } | undefined;
  const others: { name: string; url: string }[] = [];
  if (STORAGE_ENABLED) {
    if (input.cvFile) cv = await uploadApplicationFile(job.id, candidate.id, 'cv', input.cvFile);
    else if (input.existingCv) cv = input.existingCv;
    if (input.coverLetterFile)
      cover = await uploadApplicationFile(job.id, candidate.id, 'cover', input.coverLetterFile);
    for (const f of input.otherFiles ?? []) {
      const up = await uploadApplicationFile(job.id, candidate.id, 'doc', f);
      others.push({ name: up.name, url: up.url });
    }
  }

  const { answers, total } = scoreAnswers(fresh.questions ?? [], input.answers);

  const appDoc: any = {
    jobId: job.id,
    jobTitle: fresh.title,
    department: fresh.department ?? '',
    candidateId: candidate.id,
    candidateName: candidate.name,
    email: candidate.email,
    phone: input.phone ?? '',
    dateOfBirth: input.dateOfBirth ?? '',
    gender: input.gender ?? '',
    nationality: input.nationality ?? '',
    city: input.city ?? '',
    country: input.country ?? '',
    isInternal: input.isInternal ?? false,
    workedHereBefore: input.workedHereBefore ?? false,
    source: input.source ?? 'career-site',
    ...(cv ? { cvUrl: cv.url, cvFileName: cv.name } : {}),
    ...(cover ? { coverLetterUrl: cover.url, coverLetterFileName: cover.name } : {}),
    ...(others.length ? { otherDocsUrls: others } : {}),
    answers,
    prescreenScore: total,
    referees: input.referees ?? [],
    consentGiven: true,
    status: 'applied' as ApplicationStatus,
    statusHistory: [
      { status: 'applied', byId: candidate.id, byName: candidate.name, at: new Date() },
    ],
    appliedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COL), appDoc);

  await notify({
    userId: candidate.id,
    email: candidate.email,
    title: 'Application received',
    body: `Your application for ${fresh.title} (${fresh.referenceNumber}) has been received. We will keep you updated on its progress.`,
    type: 'application-received',
    relatedId: docRef.id,
  });
  await logAudit(candidate, 'apply', 'Application', docRef.id, `Applied to ${fresh.title}`);

  return toApplication(docRef.id, appDoc);
}

// ── Reads (staff) ───────────────────────────────────────────────────

/**
 * All applications — staff view. Archived candidate files are excluded by
 * default; pass `includeArchived` to load them (e.g. the "Show archived"
 * toggle). Filtering is client-side, consistent with the rest of this service,
 * so no new composite index is required.
 */
export async function getAllApplications(includeArchived = false): Promise<Application[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('appliedAt', 'desc')));
  const apps = snap.docs.map((d) => toApplication(d.id, d.data()));
  return includeArchived ? apps : apps.filter((a) => !a.archived);
}

/**
 * Archive or unarchive a batch of candidate files. Never deletes — sets the
 * `archived` flag so files drop out of / return to active views.
 * Writes are chunked into batches of ≤500 (the Firestore batched-write cap).
 */
export async function setApplicationsArchived(
  ids: string[],
  archived: boolean,
  by: { id: string; name: string }
): Promise<void> {
  if (ids.length === 0) return;
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const batch = writeBatch(db);
    for (const id of chunk) {
      batch.update(doc(db, COL, id), { archived, updatedAt: serverTimestamp() });
    }
    await batch.commit();
  }
  await logAudit(
    by,
    'update',
    'Application',
    ids.join(','),
    `${archived ? 'Archived' : 'Unarchived'} ${ids.length} candidate file(s)`
  );
}

export async function getApplicationsForJob(jobId: string): Promise<Application[]> {
  const snap = await getDocs(query(collection(db, COL), where('jobId', '==', jobId)));
  return snap.docs
    .map((d) => toApplication(d.id, d.data()))
    .sort((a, b) => b.prescreenScore - a.prescreenScore);
}

export async function getApplicationById(id: string): Promise<Application | null> {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? toApplication(snap.id, snap.data()) : null;
}

// ── Status updates ──────────────────────────────────────────────────

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'Application received',
  longlisted: 'Long-listed',
  shortlisted: 'Shortlisted',
  interview: 'Invited to interview',
  offer: 'Offer extended',
  hired: 'Hired',
  regretted: 'Not successful',
  rejected: 'Not successful',
  withdrawn: 'Withdrawn',
};

export async function updateApplicationStatus(
  application: Application,
  status: ApplicationStatus,
  by: { id: string; name: string },
  comment?: string,
  notifyCandidate = false
): Promise<void> {
  const entry: StatusHistoryEntry = {
    status,
    byId: by.id,
    byName: by.name,
    ...(comment ? { comment } : {}),
    at: new Date(),
  };
  await updateDoc(doc(db, COL, application.id), {
    status,
    statusHistory: [...(application.statusHistory ?? []), entry],
    updatedAt: serverTimestamp(),
  });
  await logAudit(by, 'status-change', 'Application', application.id, `→ ${status}`);
  if (notifyCandidate) {
    await notify({
      userId: application.candidateId,
      email: application.email,
      title: `Update on your application for ${application.jobTitle}`,
      body:
        status === 'regretted' || status === 'rejected'
          ? `Thank you for your interest in the ${application.jobTitle} position. After careful consideration we regret that we will not be progressing your application. We encourage you to apply for future roles.`
          : `Your application status has changed to: ${STATUS_LABELS[status]}.`,
      type: status === 'regretted' || status === 'rejected' ? 'regret' : 'status-update',
      relatedId: application.id,
    });
  }
}

/** Bulk status change in a single batch (long-listing requirement). */
export async function bulkUpdateStatus(
  applications: Application[],
  status: ApplicationStatus,
  by: { id: string; name: string },
  comment?: string
): Promise<void> {
  const batch = writeBatch(db);
  for (const app of applications) {
    const entry: StatusHistoryEntry = {
      status,
      byId: by.id,
      byName: by.name,
      ...(comment ? { comment } : {}),
      at: new Date(),
    };
    batch.update(doc(db, COL, app.id), {
      status,
      statusHistory: [...(app.statusHistory ?? []), entry],
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  await logAudit(by, 'status-change', 'Application', applications.map((a) => a.id).join(','), `bulk → ${status}`);
}

/** Recruiter manual adjustment of a screening score. */
export async function setPrescreenScore(
  applicationId: string,
  score: number,
  by: { id: string; name: string }
): Promise<void> {
  await updateDoc(doc(db, COL, applicationId), {
    prescreenScore: score,
    updatedAt: serverTimestamp(),
  });
  await logAudit(by, 'update', 'Application', applicationId, `Score set to ${score}`);
}

// ── Panel comments (shortlisting collaboration) ─────────────────────

export async function addPanelComment(
  applicationId: string,
  author: { id: string; name: string },
  text: string,
  stage = 'shortlisting'
): Promise<void> {
  await addDoc(collection(db, COL, applicationId, 'comments'), {
    authorId: author.id,
    authorName: author.name,
    text,
    stage,
    createdAt: serverTimestamp(),
  });
}

export async function getPanelComments(applicationId: string): Promise<PanelComment[]> {
  const snap = await getDocs(
    query(collection(db, COL, applicationId, 'comments'), orderBy('createdAt', 'asc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PanelComment));
}

// ── Regrets ─────────────────────────────────────────────────────────

/** Send regrets to every non-hired candidate still in the pipeline for a job. */
export async function sendRegretsForJob(
  jobId: string,
  by: { id: string; name: string }
): Promise<number> {
  const apps = await getApplicationsForJob(jobId);
  const toRegret = apps.filter(
    (a) => !['hired', 'regretted', 'rejected', 'withdrawn'].includes(a.status)
  );
  for (const app of toRegret) {
    await updateApplicationStatus(app, 'regretted', by, 'Position filled', true);
  }
  return toRegret.length;
}
