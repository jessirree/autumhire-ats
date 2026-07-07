import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logAudit } from './auditService';

/** Shape used by the Pre-screening Builder. */
export type BankQuestionType = 'Short Text' | 'Long Text' | 'Yes/No' | 'Multiple Choice' | 'File Upload';

/** A single selectable choice for Yes/No and Multiple Choice questions, with its own point value. */
export interface QuestionChoice {
  label: string;
  points: number;
}

export interface BankQuestion {
  id: string;
  text: string;
  type: BankQuestionType;
  required: boolean;
  score: number;
  options?: string[];
  /** Per-choice scoring for 'Yes/No' (labels always 'Yes'/'No') and 'Multiple Choice'. */
  choices?: QuestionChoice[];
}

const BANK_DOC = doc(db, 'QuestionBank', 'default');

export async function getQuestionBank(): Promise<BankQuestion[]> {
  const snap = await getDoc(BANK_DOC);
  if (!snap.exists()) return [];
  const questions = (snap.data().questions ?? []) as BankQuestion[];
  return questions.map((q) => {
    if (q.choices && q.choices.length > 0) return q;
    if (q.type === 'Yes/No') {
      return { ...q, choices: [{ label: 'Yes', points: q.score ?? 0 }, { label: 'No', points: 0 }] };
    }
    if (q.options && q.options.length > 0) {
      return { ...q, choices: q.options.map((label) => ({ label, points: 0 })) };
    }
    return q;
  });
}

export async function saveQuestionBank(
  questions: BankQuestion[],
  by: { id: string; name: string }
): Promise<void> {
  // Strip undefined (Firestore rejects it).
  const isChoiceType = (t: BankQuestionType) => t === 'Yes/No' || t === 'Multiple Choice';
  const clean = questions.map((q) => {
    const hasChoices = isChoiceType(q.type) && !!q.choices && q.choices.length > 0;
    const score = hasChoices
      ? Math.max(0, ...(q.choices as QuestionChoice[]).map((c) => c.points))
      : q.score;
    return {
      id: q.id,
      text: q.text,
      type: q.type,
      required: q.required,
      score,
      ...(q.type === 'Multiple Choice' && hasChoices
        ? { options: (q.choices as QuestionChoice[]).map((c) => c.label) }
        : q.options
          ? { options: q.options }
          : {}),
      ...(hasChoices ? { choices: q.choices } : {}),
    };
  });
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
  choices?: QuestionChoice[];
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
    instructions: '',
    ...(q.choices?.length ? { choices: q.choices } : {}),
    ...(q.score ? { score: q.score } : {}),
  };
}
