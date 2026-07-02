import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logAudit } from './auditService';

/** Shape used by the Pre-screening Builder. */
export type BankQuestionType = 'Short Text' | 'Long Text' | 'Yes/No' | 'Multiple Choice' | 'File Upload';

export interface BankQuestion {
  id: string;
  text: string;
  type: BankQuestionType;
  required: boolean;
  score: number;
  options?: string[];
}

const BANK_DOC = doc(db, 'QuestionBank', 'default');

export async function getQuestionBank(): Promise<BankQuestion[]> {
  const snap = await getDoc(BANK_DOC);
  return snap.exists() ? ((snap.data().questions ?? []) as BankQuestion[]) : [];
}

export async function saveQuestionBank(
  questions: BankQuestion[],
  by: { id: string; name: string }
): Promise<void> {
  // Strip undefined (Firestore rejects it).
  const clean = questions.map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    required: q.required,
    score: q.score,
    ...(q.options ? { options: q.options } : {}),
  }));
  await setDoc(BANK_DOC, { questions: clean, updatedAt: serverTimestamp(), updatedBy: by.name });
  await logAudit(by, 'update', 'QuestionBank', 'default', `${questions.length} questions`);
}

/** Map a bank question to the per-job screening-question shape used by CreateJob. */
export function bankToJobQuestion(q: BankQuestion): {
  id: string;
  text: string;
  type: 'text' | 'checkbox' | 'dropdown' | 'number' | 'file';
  mandatory: boolean;
  instructions: string;
  expectedAnswer?: string;
  score?: number;
} {
  const typeMap: Record<BankQuestionType, 'text' | 'checkbox' | 'dropdown' | 'number' | 'file'> = {
    'Short Text': 'text',
    'Long Text': 'text',
    'Yes/No': 'checkbox',
    'Multiple Choice': 'dropdown',
    'File Upload': 'file',
  };
  return {
    id: Math.random().toString(36).slice(2, 11),
    text: q.text,
    type: typeMap[q.type],
    mandatory: q.required,
    instructions: q.options?.length ? `Options: ${q.options.join(', ')}` : '',
    ...(q.type === 'Yes/No' ? { expectedAnswer: 'yes' } : {}),
    ...(q.score ? { score: q.score } : {}),
  };
}
