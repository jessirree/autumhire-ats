import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  writeBatch,
  deleteField,
  Timestamp,
  type FieldValue,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logAudit } from './auditService';
import { getRequisitionById } from './requisitionService';
import type { QuestionChoice, RequirementMapping } from './questionBankService';
import type { EducationLevel } from '../lib/education';

export type { QuestionChoice, RequirementMapping };

// Re-exported so CreateJob.tsx can call updateJob with { field: deleteField() }
// without importing firebase/firestore itself (CLAUDE.md: components never
// import firebase/firestore directly — services own all Firestore access).
export { deleteField };

export type JobStatus =
  | 'Draft'
  | 'Pending'
  | 'Active'
  | 'Closed'
  | 'Re-advertised'
  | 'Cancelled';

export interface ScreeningQuestion {
  id: string;
  text: string;
  type: 'text' | 'checkbox' | 'dropdown' | 'number' | 'file';
  mandatory: boolean;
  instructions: string;
  /** Expected answer used for auto-scoring checkbox questions ('yes'/'no'). */
  expectedAnswer?: string;
  /** Points awarded when the answer matches / passes. */
  score?: number;
  /** Per-choice scoring for 'checkbox' (Yes/No) and 'dropdown' (Multiple Choice) questions. */
  choices?: QuestionChoice[];
  /** Candidate-matching spec §4 — see RequirementMapping. */
  requirementField?: RequirementMapping;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Job {
  id: string;
  referenceNumber: string;
  title: string;
  department: string;
  location: string;
  jobType: string;
  remoteType: string;
  category?: string;
  tags?: string;
  currency?: string;
  salaryMin?: string;
  salaryMax?: string;
  description: string;
  status: JobStatus;
  advertType: 'internal' | 'external';
  isConfidential: boolean;
  showOnCareerSite: boolean;
  isFeatured: boolean;
  requireResume: boolean;
  requireCoverLetter: boolean;
  /** When true, ApplicationForm.tsx shows the "other supporting documents" upload. */
  allowOtherDocuments: boolean;
  /** Guidance for hiring managers/panel on what to look for when shortlisting. */
  shortlistingCriteria?: string;
  /** Archived adverts are hidden from active staff views but never deleted. */
  archived?: boolean;
  closingDate?: string; // yyyy-mm-dd
  questions: ScreeningQuestion[];
  hiringTeam: TeamMember[];
  coordinatorId?: string;
  requisitionId?: string;
  hiringWorkflow?: string;
  source?: string;
  /** Total recruitment cost for this vacancy (advertising, agency, etc.) — feeds cost reports. */
  recruitmentCost?: number;
  /**
   * Candidate-matching spec §2.3 job requirements. All optional — a job
   * with none of these set is legitimate and simply produces no match
   * score (step 4). Published on the advert: spec §3.3 is explicit that
   * requirements are public and only the match itself is private, so
   * JobDetail.tsx showing these is intended, not a leak — do not restrict
   * read access to them later under the assumption they need protecting.
   */
  minYearsExperience?: number;
  minEducation?: EducationLevel;
  /** Ids into Skills — resolve to current names on read (skillService.getSkills), same taxonomy-integrity reasoning as the candidate profile's skillIds. */
  requiredSkillIds?: string[];
  /**
   * Names denormalized from Skills at save time, parallel to
   * requiredSkillIds. Exists only because the public job advert
   * (JobDetail.tsx) is readable by a signed-out visitor, who cannot read
   * the Skills collection (its rule requires isActive(), i.e. signed in) —
   * this is what that page renders instead of resolving ids live. Can go
   * stale if a skill is renamed after being required, same as every other
   * denormalized name in this codebase (jobTitle, candidateName,
   * panelistName); staff-facing screens should still resolve the live name
   * from requiredSkillIds.
   */
  requiredSkillNames?: string[];
  workAuthorizationRequired?: boolean;
  postedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  createdBy?: string;
  createdByName?: string;
}

export type JobInput = Omit<
  Job,
  'id' | 'referenceNumber' | 'postedAt' | 'createdAt' | 'updatedAt'
>;

/**
 * updateJob performs a partial merge via updateDoc(), where an omitted key
 * means "leave this field alone" — not "clear it". A caller that wants to
 * clear an optional field (e.g. a recruiter who sets, then removes, a
 * minimum years requirement) must say so explicitly with deleteField(),
 * the same shape CandidateDashboard/profileService use for the identical
 * problem on the Users document.
 */
export type JobInputUpdate = {
  [K in keyof JobInput]?: JobInput[K] | FieldValue;
};

const JOBS = 'Jobs';

// Sequential JOB-YYYY-#### reference numbers, transaction-guarded.
async function getNextJobReference(): Promise<string> {
  const year = new Date().getFullYear();
  const counterRef = doc(db, 'Counters', 'jobs');
  const sequence = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const data = snap.exists() ? (snap.data() as { year: number; current: number }) : null;
    const current = data && data.year === year ? data.current : 0;
    const next = current + 1;
    tx.set(counterRef, { year, current: next });
    return next;
  });
  return `JOB-${year}-${String(sequence).padStart(4, '0')}`;
}

function toJob(id: string, data: any): Job {
  return {
    questions: [],
    hiringTeam: [],
    isConfidential: false,
    showOnCareerSite: true,
    isFeatured: false,
    requireResume: true,
    requireCoverLetter: false,
    allowOtherDocuments: false,
    advertType: 'external',
    ...data,
    id,
  } as Job;
}

/**
 * "The hiring manager" for a job, in priority order:
 *   1. The named owner of the requisition it was posted from (set in
 *      Wave B — a recruiter can raise a requisition on a hiring manager's
 *      behalf, so this is the authoritative source, not createdBy).
 *   2. Whoever on the job's hiring team has the hiring-manager role.
 *   3. The job's coordinator, then whoever created it.
 * Returns null if none resolve — callers should skip notifying rather than
 * guess a recipient. Mirrors functions/offerNotifications.js's
 * resolveHiringManagerId, which runs this same lookup server-side for the
 * candidate-response path.
 */
export async function getHiringManagerId(job: Job): Promise<string | null> {
  if (job.requisitionId) {
    const requisition = await getRequisitionById(job.requisitionId);
    if (requisition?.hiringManagerId) return requisition.hiringManagerId;
  }
  const hiringTeamManager = (job.hiringTeam ?? []).find((m) => m.role === 'hiring-manager');
  if (hiringTeamManager) return hiringTeamManager.id;
  return job.coordinatorId || job.createdBy || null;
}

/** Returns true when the job's closing date is in the past. */
export function isPastDeadline(job: Job): boolean {
  if (!job.closingDate) return false;
  const deadline = new Date(job.closingDate + 'T23:59:59');
  return deadline.getTime() < Date.now();
}

/** Auto-close any Active jobs whose deadline has passed (called on staff reads). */
async function autoCloseExpired(jobs: Job[]): Promise<Job[]> {
  const updates: Promise<void>[] = [];
  const result = jobs.map((job) => {
    if (job.status === 'Active' && isPastDeadline(job)) {
      updates.push(
        updateDoc(doc(db, JOBS, job.id), { status: 'Closed', updatedAt: serverTimestamp() })
      );
      return { ...job, status: 'Closed' as JobStatus };
    }
    return job;
  });
  await Promise.all(updates).catch(() => {
    /* non-fatal: rules may block candidates from writing; staff reads will fix it */
  });
  return result;
}

export async function createJob(
  input: JobInput,
  createdBy: { id: string; name: string }
): Promise<Job> {
  const referenceNumber = await getNextJobReference();
  // Disallow posting incomplete adverts.
  if (input.status === 'Active') {
    if (!input.title?.trim() || !input.location?.trim() || !input.jobType?.trim() || !input.description?.trim()) {
      throw new Error('Cannot post an incomplete advert: title, location, contract type and description are required.');
    }
  }
  const jobDoc = {
    ...input,
    referenceNumber,
    createdBy: createdBy.id,
    createdByName: createdBy.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(input.status === 'Active' ? { postedAt: serverTimestamp() } : {}),
  };
  await setDoc(doc(db, JOBS, referenceNumber), jobDoc);
  await logAudit(createdBy, 'create', 'Job', referenceNumber, `Created job "${input.title}"`);
  return { id: referenceNumber, ...jobDoc } as unknown as Job;
}

export async function updateJob(
  id: string,
  updates: JobInputUpdate,
  updatedBy: { id: string; name: string }
): Promise<void> {
  const payload: any = { ...updates, updatedAt: serverTimestamp() };
  if (updates.status === 'Active') payload.postedAt = serverTimestamp();
  await updateDoc(doc(db, JOBS, id), payload);
  await logAudit(updatedBy, 'update', 'Job', id, `Updated job (${Object.keys(updates).join(', ')})`);
}

export async function closeJob(id: string, by: { id: string; name: string }): Promise<void> {
  await updateDoc(doc(db, JOBS, id), { status: 'Closed', updatedAt: serverTimestamp() });
  await logAudit(by, 'update', 'Job', id, 'Closed job');
}

/** Re-open a closed job — status automatically becomes Re-advertised. */
export async function reopenJob(
  id: string,
  newClosingDate: string | undefined,
  by: { id: string; name: string }
): Promise<void> {
  await updateDoc(doc(db, JOBS, id), {
    status: 'Re-advertised',
    ...(newClosingDate ? { closingDate: newClosingDate } : {}),
    postedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logAudit(by, 'update', 'Job', id, 'Re-opened job (re-advertised)');
}

/**
 * All jobs — staff view. Auto-closes expired adverts as a side effect.
 * Archived adverts are excluded by default (they drop out of active views);
 * pass `includeArchived` to load them (e.g. the "Show archived" toggle).
 *
 * Note: filtering happens client-side, consistent with the rest of this
 * service, so no new composite index is required.
 */
export async function getJobs(includeArchived = false): Promise<Job[]> {
  const snap = await getDocs(query(collection(db, JOBS), orderBy('createdAt', 'desc')));
  const jobs = snap.docs.map((d) => toJob(d.id, d.data()));
  const live = await autoCloseExpired(jobs);
  return includeArchived ? live : live.filter((j) => !j.archived);
}

/**
 * Archive or unarchive a batch of jobs. Never deletes — sets the `archived`
 * flag so listings drop out of / return to active views.
 * Writes are chunked into batches of ≤500 (the Firestore batched-write cap).
 */
export async function setJobsArchived(
  ids: string[],
  archived: boolean,
  by: { id: string; name: string }
): Promise<void> {
  if (ids.length === 0) return;
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const batch = writeBatch(db);
    for (const id of chunk) {
      batch.update(doc(db, JOBS, id), { archived, updatedAt: serverTimestamp() });
    }
    await batch.commit();
  }
  await logAudit(
    by,
    'update',
    'Job',
    ids.join(','),
    `${archived ? 'Archived' : 'Unarchived'} ${ids.length} job advert(s)`
  );
}

/**
 * Public career-site jobs: Active or Re-advertised, external, not confidential,
 * shown on career site, and not past deadline.
 *
 * NOTE: the equality filters must stay in sync with firestore.rules — the
 * public read rule for Jobs is only provable for queries constrained on all
 * four fields (a composite index for this is in firestore.indexes.json).
 */
export async function getPublicJobs(): Promise<Job[]> {
  const snap = await getDocs(
    query(
      collection(db, JOBS),
      where('status', 'in', ['Active', 'Re-advertised']),
      where('showOnCareerSite', '==', true),
      where('isConfidential', '==', false),
      where('advertType', '==', 'external')
    )
  );
  return snap.docs
    .map((d) => toJob(d.id, d.data()))
    .filter((j) => !isPastDeadline(j) && !j.archived)
    .sort((a, b) => (b.postedAt?.toMillis?.() ?? 0) - (a.postedAt?.toMillis?.() ?? 0));
}

/**
 * Returns null when the job doesn't exist OR the caller isn't allowed to see
 * it (e.g. a closed advert read by a candidate) — both render as
 * "job no longer available" on public pages.
 */
export async function getJobById(id: string): Promise<Job | null> {
  try {
    const snap = await getDoc(doc(db, JOBS, id));
    return snap.exists() ? toJob(snap.id, snap.data()) : null;
  } catch {
    return null;
  }
}

/** True if candidates can currently apply. */
export function isJobOpen(job: Job): boolean {
  return (job.status === 'Active' || job.status === 'Re-advertised') && !isPastDeadline(job);
}
