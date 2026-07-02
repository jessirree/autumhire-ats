import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logAudit } from './auditService';

export type StageRole = 'Recruiter' | 'Hiring Manager' | 'Admin';

export interface WorkflowStage {
  id: string;
  name: string;
  role: StageRole;
  autoEmail: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  stages: WorkflowStage[];
  updatedAt?: Timestamp | null;
  updatedBy?: string;
}

export const DEFAULT_STAGES: WorkflowStage[] = [
  { id: 's1', name: 'Applied', role: 'Recruiter', autoEmail: true },
  { id: 's2', name: 'Screening', role: 'Recruiter', autoEmail: false },
  { id: 's3', name: 'Shortlisting', role: 'Hiring Manager', autoEmail: false },
  { id: 's4', name: 'Interview', role: 'Hiring Manager', autoEmail: true },
  { id: 's5', name: 'Offer', role: 'Recruiter', autoEmail: true },
  { id: 's6', name: 'Hired', role: 'Admin', autoEmail: true },
];

const COL = 'Workflows';

export async function getWorkflows(): Promise<Workflow[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('name')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Workflow));
}

export async function createWorkflow(
  name: string,
  stages: WorkflowStage[],
  by: { id: string; name: string }
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    name,
    stages,
    updatedAt: serverTimestamp(),
    updatedBy: by.name,
  });
  await logAudit(by, 'create', 'Workflow', ref.id, name);
  return ref.id;
}

export async function updateWorkflow(
  id: string,
  updates: { name?: string; stages?: WorkflowStage[] },
  by: { id: string; name: string }
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: by.name,
  });
  await logAudit(by, 'update', 'Workflow', id, updates.name);
}

export async function deleteWorkflow(id: string, by: { id: string; name: string }): Promise<void> {
  await deleteDoc(doc(db, COL, id));
  await logAudit(by, 'delete', 'Workflow', id);
}
