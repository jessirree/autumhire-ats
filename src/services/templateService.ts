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

export type TemplateCategory = 'Email' | 'Interview' | 'Job Ad';
export type TemplateStatus = 'Active' | 'Draft' | 'Archived';

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  subject?: string; // Email only
  /** Content supports {{placeholders}} e.g. {{candidate_name}}, {{job_title}}. */
  content: string;
  status: TemplateStatus;
  updatedAt?: Timestamp | null;
  updatedBy?: string;
}

const COL = 'Templates';

export async function getTemplates(): Promise<Template[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('name')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Template));
}

export async function createTemplate(
  input: Omit<Template, 'id' | 'updatedAt' | 'updatedBy'>,
  by: { id: string; name: string }
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    name: input.name,
    category: input.category,
    ...(input.subject !== undefined ? { subject: input.subject } : {}),
    content: input.content,
    status: input.status,
    updatedAt: serverTimestamp(),
    updatedBy: by.name,
  });
  await logAudit(by, 'create', 'Template', ref.id, input.name);
  return ref.id;
}

export async function updateTemplate(
  template: Template,
  by: { id: string; name: string }
): Promise<void> {
  await updateDoc(doc(db, COL, template.id), {
    name: template.name,
    category: template.category,
    ...(template.subject !== undefined ? { subject: template.subject } : {}),
    content: template.content,
    status: template.status,
    updatedAt: serverTimestamp(),
    updatedBy: by.name,
  });
  await logAudit(by, 'update', 'Template', template.id, template.name);
}

export async function deleteTemplate(id: string, by: { id: string; name: string }): Promise<void> {
  await deleteDoc(doc(db, COL, id));
  await logAudit(by, 'delete', 'Template', id);
}

/** Replace {{placeholders}} in a template body/subject. */
export function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
