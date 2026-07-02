import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';

export type AdvertType = 'internal' | 'external';
export type RequisitionStatus = 'pending-approval' | 'approved' | 'rejected';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

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

export interface Requisition {
  id: string;
  referenceNumber: string;
  positionId: string;
  positionTitle: string;
  department: string;
  vacancies: number;
  advertType: AdvertType;
  jobDescriptionUrl?: string;
  jobDescriptionFileName?: string;
  status: RequisitionStatus;
  currentLevel: number;
  totalLevels: number;
  requestedById: string;
  requestedByName: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Approval {
  id: string;
  level: number;
  approverId: string;
  approverName: string;
  status: ApprovalStatus;
  comment?: string;
  decidedAt?: any;
}

export interface ApproverInput {
  id: string;
  name: string;
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

// Sequential, transaction-guarded counter — avoids the collision risk of
// generating reference numbers with Math.random().
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

// ── Requisitions ────────────────────────────────────────────────────

export async function createRequisition(input: {
  positionId: string;
  positionTitle: string;
  department: string;
  vacancies: number;
  advertType: AdvertType;
  jobDescriptionFile?: File | null;
  approvers: ApproverInput[];
  requestedById: string;
  requestedByName: string;
}): Promise<Requisition> {
  const referenceNumber = await getNextReferenceNumber();

  let jobDescriptionUrl: string | undefined;
  let jobDescriptionFileName: string | undefined;
  if (input.jobDescriptionFile) {
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
    vacancies: input.vacancies,
    advertType: input.advertType,
    ...(jobDescriptionUrl ? { jobDescriptionUrl, jobDescriptionFileName } : {}),
    status: 'pending-approval',
    currentLevel: 1,
    totalLevels: input.approvers.length,
    requestedById: input.requestedById,
    requestedByName: input.requestedByName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'Requisitions', referenceNumber), requisition);

  await Promise.all(
    input.approvers.map((approver, index) =>
      setDoc(doc(db, 'Requisitions', referenceNumber, 'approvals', String(index + 1)), {
        level: index + 1,
        approverId: approver.id,
        approverName: approver.name,
        status: 'pending',
      })
    )
  );

  return { id: referenceNumber, ...requisition };
}

export async function getRequisitions(): Promise<Requisition[]> {
  const snap = await getDocs(query(collection(db, 'Requisitions'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Requisition));
}

export async function getRequisitionApprovals(requisitionId: string): Promise<Approval[]> {
  const snap = await getDocs(
    query(collection(db, 'Requisitions', requisitionId, 'approvals'), orderBy('level', 'asc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Approval));
}

// Looks up the current-level approval doc directly by ID for each
// pending requisition rather than a collection-group query, so no extra
// Firestore index needs to be deployed for this MVP.
export async function getPendingApprovalsForUser(
  userId: string
): Promise<{ requisition: Requisition; approval: Approval }[]> {
  const requisitions = (await getRequisitions()).filter((r) => r.status === 'pending-approval');
  const results: { requisition: Requisition; approval: Approval }[] = [];

  for (const requisition of requisitions) {
    const approvalSnap = await getDoc(
      doc(db, 'Requisitions', requisition.id, 'approvals', String(requisition.currentLevel))
    );
    if (approvalSnap.exists()) {
      const approval = { id: approvalSnap.id, ...approvalSnap.data() } as Approval;
      if (approval.approverId === userId && approval.status === 'pending') {
        results.push({ requisition, approval });
      }
    }
  }

  return results;
}

export async function decideApproval(
  requisitionId: string,
  level: number,
  decision: 'approved' | 'rejected',
  comment: string | undefined,
  decidedBy: { id: string; name: string }
): Promise<void> {
  const requisitionRef = doc(db, 'Requisitions', requisitionId);
  const approvalRef = doc(db, 'Requisitions', requisitionId, 'approvals', String(level));

  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(requisitionRef);
    const approvalSnap = await tx.get(approvalRef);
    if (!reqSnap.exists() || !approvalSnap.exists()) {
      throw new Error('Requisition or approval step not found.');
    }

    const requisition = reqSnap.data() as Requisition;
    const approval = approvalSnap.data() as Approval;

    if (approval.approverId !== decidedBy.id) {
      throw new Error('You are not the assigned approver for this step.');
    }
    if (approval.status !== 'pending') {
      throw new Error('This approval step has already been decided.');
    }
    if (requisition.currentLevel !== level) {
      throw new Error('This is not the current pending approval level.');
    }

    tx.update(approvalRef, {
      status: decision,
      ...(comment ? { comment } : {}),
      decidedAt: serverTimestamp(),
    });

    if (decision === 'rejected') {
      tx.update(requisitionRef, { status: 'rejected', updatedAt: serverTimestamp() });
    } else if (level >= requisition.totalLevels) {
      tx.update(requisitionRef, { status: 'approved', updatedAt: serverTimestamp() });
    } else {
      tx.update(requisitionRef, { currentLevel: level + 1, updatedAt: serverTimestamp() });
    }
  });
}
