import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { STORAGE_ENABLED } from '../lib/featureFlags';
import { notify } from './notificationService';
import { logAudit } from './auditService';
import { BankQuestion } from './questionBankService';

export type AdvertType = 'internal' | 'external';

/**
 * Client-specified requisition flow:
 *   HM (or recruiter) creates  → 'with-recruiter'   (recruiter refines it)
 *   Recruiter sends back       → 'pending-confirmation' (HM confirms)
 *   HM confirms                → 'pending-admin'    (admin approves)
 *   HM confirms + SKIP         → 'approved'         (documented fast-track)
 *   Admin approves             → 'approved'
 *   Admin rejects              → 'rejected'
 *   Recruiter publishes job    → 'published'
 */
export type RequisitionStatus =
  | 'with-recruiter'
  | 'pending-confirmation'
  | 'pending-admin'
  | 'approved'
  | 'rejected'
  | 'published';

export type RequisitionPriority = 'low' | 'medium' | 'high' | 'urgent';

/** Job grades are 1–6 with steps a–c (e.g. "4b"). */
export const GRADE_LEVELS = ['1', '2', '3', '4', '5', '6'] as const;
export const GRADE_STEPS = ['a', 'b', 'c'] as const;
export const GRADE_REGEX = /^[1-6][abc]$/;

export const PRIORITY_STYLES: Record<RequisitionPriority, { label: string; badge: string; row: string }> = {
  low:    { label: 'Low',    badge: 'bg-green-100 text-green-800 border-green-200',   row: 'border-l-4 border-l-green-400' },
  medium: { label: 'Medium', badge: 'bg-amber-100 text-amber-800 border-amber-200',   row: 'border-l-4 border-l-amber-400' },
  high:   { label: 'High',   badge: 'bg-orange-100 text-orange-800 border-orange-200', row: 'border-l-4 border-l-orange-500' },
  urgent: { label: 'Urgent', badge: 'bg-red-100 text-red-800 border-red-200',         row: 'border-l-4 border-l-red-500' },
};

export const STATUS_LABELS: Record<RequisitionStatus, string> = {
  'with-recruiter': 'With Recruiter',
  'pending-confirmation': 'Awaiting HM Confirmation',
  'pending-admin': 'Awaiting Admin Approval',
  approved: 'Approved — ready to publish',
  rejected: 'Rejected',
  published: 'Published',
};

export interface Position {
  id: string;
  title: string;
  department: string;
  gradeHint?: string;
  description?: string;
  isActive: boolean;
  createdAt?: any;
  createdBy?: string;
}

export interface RequisitionHistoryEntry {
  action: string;
  byId: string;
  byName: string;
  comment?: string;
  at: Timestamp | Date;
}

export interface Requisition {
  id: string;
  referenceNumber: string;
  positionId: string;
  positionTitle: string;
  department: string;
  /** Structured grade: level 1–6 + step a–c, e.g. "4b". Mandatory. */
  grade: string;
  priority: RequisitionPriority;
  vacancies: number;
  advertType: AdvertType;
  /** Screening question templates (from the admin question bank). */
  questions: BankQuestion[];
  notes?: string;
  jobDescriptionUrl?: string;
  jobDescriptionFileName?: string;
  status: RequisitionStatus;
  /** Set when the HM fast-tracked past admin approval. */
  skippedApproval?: boolean;
  skipReason?: string;
  adminComment?: string;
  /** The published job's id once the recruiter publishes. */
  jobId?: string;
  createdById: string;
  createdByName: string;
  history: RequisitionHistoryEntry[];
  createdAt?: any;
  updatedAt?: any;
}

// ── Positions ───────────────────────────────────────────────────────

export async function getPositions(activeOnly = true): Promise<Position[]> {
  const snap = await getDocs(collection(db, 'Positions'));
  const positions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Position));
  return activeOnly ? positions.filter((p) => p.isActive) : positions;
}

export async function createPosition(
  input: { title: string; department: string; gradeHint?: string; description?: string },
  createdBy: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'Positions'), {
    ...input,
    isActive: true,
    createdAt: serverTimestamp(),
    createdBy,
  });
  return docRef.id;
}

export async function updatePosition(
  id: string,
  updates: Partial<Pick<Position, 'title' | 'department' | 'gradeHint' | 'description' | 'isActive'>>
): Promise<void> {
  await updateDoc(doc(db, 'Positions', id), updates);
}

// ── Reference numbers ───────────────────────────────────────────────

async function getNextReferenceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const counterRef = doc(db, 'Counters', 'requisitions');
  const sequence = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const data = snap.exists() ? (snap.data() as { year: number; current: number }) : null;
    const current = data && data.year === year ? data.current : 0;
    const next = current + 1;
    tx.set(counterRef, { year, current: next });
    return next;
  });
  return `REQ-${year}-${String(sequence).padStart(4, '0')}`;
}

// ── Helpers ─────────────────────────────────────────────────────────

function historyEntry(action: string, by: { id: string; name: string }, comment?: string): RequisitionHistoryEntry {
  return { action, byId: by.id, byName: by.name, ...(comment ? { comment } : {}), at: new Date() };
}

async function notifyRole(role: 'recruiter' | 'hiring-manager' | 'admin', title: string, body: string, relatedId: string) {
  try {
    const snap = await getDocs(query(collection(db, 'Users'), where('role', '==', role)));
    await Promise.all(
      snap.docs.map((d) =>
        notify({ userId: d.id, title, body, type: 'general', relatedId })
      )
    );
  } catch {
    // best-effort
  }
}

function assertGrade(grade: string) {
  if (!GRADE_REGEX.test(grade)) {
    throw new Error('Job grade must be a level 1–6 plus step a–c (e.g. "3b").');
  }
}

// ── Flow ────────────────────────────────────────────────────────────

/** Step 1: HM (or recruiter) raises the requisition → goes to the recruiters. */
export async function createRequisition(input: {
  positionId: string;
  positionTitle: string;
  department: string;
  grade: string;
  priority: RequisitionPriority;
  vacancies: number;
  advertType: AdvertType;
  questions: BankQuestion[];
  notes?: string;
  jobDescriptionFile?: File | null;
  createdBy: { id: string; name: string };
}): Promise<Requisition> {
  assertGrade(input.grade);
  const referenceNumber = await getNextReferenceNumber();

  let jobDescriptionUrl: string | undefined;
  let jobDescriptionFileName: string | undefined;
  if (input.jobDescriptionFile && STORAGE_ENABLED) {
    const file = input.jobDescriptionFile;
    const storageRef = ref(storage, `job-descriptions/${referenceNumber}/${file.name}`);
    await uploadBytes(storageRef, file);
    jobDescriptionUrl = await getDownloadURL(storageRef);
    jobDescriptionFileName = file.name;
  }

  const requisition: Omit<Requisition, 'id'> = {
    referenceNumber,
    positionId: input.positionId,
    positionTitle: input.positionTitle,
    department: input.department,
    grade: input.grade,
    priority: input.priority,
    vacancies: input.vacancies,
    advertType: input.advertType,
    questions: input.questions,
    ...(input.notes ? { notes: input.notes } : {}),
    ...(jobDescriptionUrl ? { jobDescriptionUrl, jobDescriptionFileName } : {}),
    status: 'with-recruiter',
    createdById: input.createdBy.id,
    createdByName: input.createdBy.name,
    history: [historyEntry('Created — sent to recruiter', input.createdBy)],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'Requisitions', referenceNumber), requisition);
  await logAudit(input.createdBy, 'create', 'Requisition', referenceNumber, input.positionTitle);
  await notifyRole('recruiter', 'New requisition to review',
    `${input.createdBy.name} raised ${referenceNumber} (${input.positionTitle}, grade ${input.grade}, ${PRIORITY_STYLES[input.priority].label} priority). Please review and refine it.`,
    referenceNumber);
  return { id: referenceNumber, ...requisition };
}

/** Step 2: recruiter edits the details (only while it sits with the recruiter). */
export async function updateRequisitionDetails(
  requisition: Requisition,
  updates: Partial<Pick<Requisition, 'grade' | 'priority' | 'vacancies' | 'advertType' | 'questions' | 'notes'>>,
  by: { id: string; name: string }
): Promise<void> {
  if (requisition.status !== 'with-recruiter') {
    throw new Error('This requisition is not editable at its current stage.');
  }
  if (updates.grade !== undefined) assertGrade(updates.grade);
  await updateDoc(doc(db, 'Requisitions', requisition.id), {
    ...updates,
    history: [...requisition.history, historyEntry('Edited by recruiter', by)],
    updatedAt: serverTimestamp(),
  });
  await logAudit(by, 'update', 'Requisition', requisition.id, Object.keys(updates).join(', '));
}

/** Step 3: recruiter sends it back to the HM for confirmation. */
export async function sendForConfirmation(
  requisition: Requisition,
  by: { id: string; name: string }
): Promise<void> {
  if (requisition.status !== 'with-recruiter') {
    throw new Error('Only requisitions with the recruiter can be sent for confirmation.');
  }
  await updateDoc(doc(db, 'Requisitions', requisition.id), {
    status: 'pending-confirmation',
    history: [...requisition.history, historyEntry('Sent to hiring manager for confirmation', by)],
    updatedAt: serverTimestamp(),
  });
  await notify({
    userId: requisition.createdById,
    title: 'Requisition ready for your confirmation',
    body: `${by.name} has refined ${requisition.referenceNumber} (${requisition.positionTitle}). Please confirm it.`,
    type: 'general',
    relatedId: requisition.id,
  });
  await logAudit(by, 'status-change', 'Requisition', requisition.id, 'sent for confirmation');
}

/**
 * Step 4: HM confirms. With `skipApproval` the requisition bypasses admin
 * approval — this is explicitly documented on the record and audit trail.
 */
export async function confirmRequisition(
  requisition: Requisition,
  by: { id: string; name: string },
  skipApproval: boolean,
  skipReason?: string
): Promise<void> {
  if (requisition.status !== 'pending-confirmation') {
    throw new Error('This requisition is not awaiting confirmation.');
  }
  if (skipApproval) {
    await updateDoc(doc(db, 'Requisitions', requisition.id), {
      status: 'approved',
      skippedApproval: true,
      skipReason: skipReason || 'Not given',
      history: [...requisition.history,
        historyEntry('Confirmed — ADMIN APPROVAL SKIPPED by hiring manager', by, skipReason)],
      updatedAt: serverTimestamp(),
    });
    await logAudit(by, 'status-change', 'Requisition', requisition.id,
      `confirmed + admin approval SKIPPED (${skipReason || 'no reason given'})`);
    await notifyRole('admin', 'Requisition approved without admin review',
      `${by.name} confirmed ${requisition.referenceNumber} (${requisition.positionTitle}) and skipped admin approval. Reason: ${skipReason || 'not given'}.`,
      requisition.id);
    await notifyRole('recruiter', 'Requisition ready to publish',
      `${requisition.referenceNumber} (${requisition.positionTitle}) is approved and ready to publish.`,
      requisition.id);
  } else {
    await updateDoc(doc(db, 'Requisitions', requisition.id), {
      status: 'pending-admin',
      history: [...requisition.history, historyEntry('Confirmed by hiring manager', by)],
      updatedAt: serverTimestamp(),
    });
    await logAudit(by, 'status-change', 'Requisition', requisition.id, 'confirmed');
    await notifyRole('admin', 'Requisition awaiting your approval',
      `${by.name} confirmed ${requisition.referenceNumber} (${requisition.positionTitle}). It needs admin approval.`,
      requisition.id);
  }
}

/** HM (or admin) can push it back to the recruiter with a comment. */
export async function returnToRecruiter(
  requisition: Requisition,
  by: { id: string; name: string },
  comment: string
): Promise<void> {
  await updateDoc(doc(db, 'Requisitions', requisition.id), {
    status: 'with-recruiter',
    history: [...requisition.history, historyEntry('Returned to recruiter', by, comment)],
    updatedAt: serverTimestamp(),
  });
  await notifyRole('recruiter', 'Requisition returned for changes',
    `${by.name} returned ${requisition.referenceNumber}: ${comment}`, requisition.id);
  await logAudit(by, 'status-change', 'Requisition', requisition.id, `returned: ${comment}`);
}

/** Step 5: admin approves or rejects. */
export async function adminDecideRequisition(
  requisition: Requisition,
  decision: 'approved' | 'rejected',
  comment: string | undefined,
  by: { id: string; name: string }
): Promise<void> {
  if (requisition.status !== 'pending-admin') {
    throw new Error('This requisition is not awaiting admin approval.');
  }
  await updateDoc(doc(db, 'Requisitions', requisition.id), {
    status: decision,
    ...(comment ? { adminComment: comment } : {}),
    history: [...requisition.history, historyEntry(`Admin ${decision}`, by, comment)],
    updatedAt: serverTimestamp(),
  });
  await notify({
    userId: requisition.createdById,
    title: `Requisition ${decision}`,
    body: `${requisition.referenceNumber} (${requisition.positionTitle}) was ${decision} by ${by.name}.${comment ? ` Comment: ${comment}` : ''}`,
    type: 'general',
    relatedId: requisition.id,
  });
  if (decision === 'approved') {
    await notifyRole('recruiter', 'Requisition ready to publish',
      `${requisition.referenceNumber} (${requisition.positionTitle}) is approved and ready to publish.`, requisition.id);
  }
  await logAudit(by, 'status-change', 'Requisition', requisition.id, `admin ${decision}`);
}

/** Step 6: recruiter published the job — link it and close the loop. */
export async function markRequisitionPublished(
  requisitionId: string,
  jobId: string,
  by: { id: string; name: string }
): Promise<void> {
  const snap = await getDoc(doc(db, 'Requisitions', requisitionId));
  if (!snap.exists()) return;
  const requisition = { id: snap.id, ...snap.data() } as Requisition;
  await updateDoc(doc(db, 'Requisitions', requisitionId), {
    status: 'published',
    jobId,
    history: [...(requisition.history ?? []), historyEntry(`Job published (${jobId})`, by)],
    updatedAt: serverTimestamp(),
  });
  await notify({
    userId: requisition.createdById,
    title: 'Job published',
    body: `The job for ${requisition.referenceNumber} (${requisition.positionTitle}) has been published by ${by.name}.`,
    type: 'general',
    relatedId: jobId,
  });
  await logAudit(by, 'status-change', 'Requisition', requisitionId, `published as ${jobId}`);
}

// ── Reads ───────────────────────────────────────────────────────────

function toRequisition(id: string, data: any): Requisition {
  return { history: [], questions: [], priority: 'medium', ...data, id } as Requisition;
}

export async function getRequisitions(): Promise<Requisition[]> {
  const snap = await getDocs(query(collection(db, 'Requisitions'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => toRequisition(d.id, d.data()));
}

export async function getRequisitionById(id: string): Promise<Requisition | null> {
  const snap = await getDoc(doc(db, 'Requisitions', id));
  return snap.exists() ? toRequisition(snap.id, snap.data()) : null;
}
