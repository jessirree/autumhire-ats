import { doc, getDoc, setDoc, getDocs, collection, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
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

const QUESTION_BANK_COLLECTION = collection(db, 'QuestionBank');

export async function getQuestionBank(): Promise<BankQuestion[]> {
  try {
    // Get all question documents from QuestionBank collection
    const snapshot = await getDocs(QUESTION_BANK_COLLECTION);
    const questions: BankQuestion[] = [];

    // For each question document, fetch its choices subcollection
    for (const docSnap of snapshot.docs) {
      const questionData = docSnap.data();
      const questionId = docSnap.id;

      // Fetch choices subcollection for this question
      const choicesRef = collection(db, 'QuestionBank', questionId, 'choices');
      const choicesSnap = await getDocs(choicesRef);
      const choices: QuestionChoice[] = [];

      choicesSnap.docs.forEach((choiceDoc) => {
        const choiceData = choiceDoc.data();
        const label = typeof choiceData.label === 'string' ? choiceData.label : '';
        const points = typeof choiceData.points === 'number' ? choiceData.points : 0;
        choices.push({
          label,
          points,
        });
      });

      questions.push({
        id: questionId,
        text: questionData.text ?? '',
        type: (questionData.type ?? 'Short Text') as BankQuestionType,
        required: questionData.required ?? false,
        score: questionData.score ?? 0,
        ...(Array.isArray(questionData.options) ? { options: questionData.options as string[] } : {}),
        ...(choices.length > 0 ? { choices } : {}),
      });
    }

    return questions;
  } catch (err) {
    console.error('Failed to load question bank:', err);
    return [];
  }
}

export async function saveQuestionBank(
  questions: BankQuestion[],
  by: { id: string; name: string }
): Promise<void> {
  const batch = writeBatch(db);

  // Save each question and its choices subcollection
  for (const q of questions) {
    const isChoiceType = q.type === 'Yes/No' || q.type === 'Multiple Choice';
    
    // Prepare choices for this question
    let finalChoices = q.choices || [];
    if (isChoiceType && finalChoices.length === 0) {
      // Fallback: create from options if choices are missing
      if (q.options && q.options.length > 0) {
        finalChoices = q.options.map((label) => ({ label, points: 0 }));
      }
    }

    // Calculate max score from choices
    const score = finalChoices.length > 0
      ? Math.max(0, ...finalChoices.map((c) => c.points))
      : q.score;

    // Save the question document
    const questionDocRef = doc(QUESTION_BANK_COLLECTION, q.id);
    batch.set(questionDocRef, {
      text: q.text,
      type: q.type,
      required: q.required,
      score,
      ...(q.options ? { options: q.options } : {}),
      updatedAt: serverTimestamp(),
      updatedBy: by.name,
    });

    // Delete all existing choices for this question (they'll be recreated below)
    if (finalChoices.length > 0) {
      const choicesRef = collection(db, 'QuestionBank', q.id, 'choices');
      const existingChoices = await getDocs(choicesRef);
      existingChoices.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Save each choice as a separate document in the choices subcollection
      finalChoices.forEach((choice, idx) => {
        const choiceDocRef = doc(QUESTION_BANK_COLLECTION, q.id, 'choices', `choice_${idx}`);
        batch.set(choiceDocRef, {
          label: choice.label,
          points: choice.points,
        });
      });
    }
  }

  await batch.commit();
  await logAudit(by, 'update', 'QuestionBank', '*', `${questions.length} questions updated`);
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
