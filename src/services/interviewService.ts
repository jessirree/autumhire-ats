import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notify } from './notificationService';
import { logAudit } from './auditService';
import { Application, updateApplicationStatus } from './applicationService';

export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';

export interface PanelScore {
  panelistId: string;
  panelistName: string;
  score: number; // 0–100
  comments: string;
  recordedAt?: Timestamp | Date;
}

export interface Interview {
  id: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  scheduledAt: string; // ISO datetime-local
  durationMinutes: number;
  mode: 'in-person' | 'video' | 'phone';
  locationOrLink?: string;
  panel: { id: string; name: string }[];
  questions: string[];
  scores: PanelScore[];
  status: InterviewStatus;
  result?: 'recommended' | 'not-recommended' | 'on-hold';
  notes?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

const COL = 'Interviews';

function toInterview(id: string, data: any): Interview {
  return { panel: [], questions: [], scores: [], ...data, id } as Interview;
}

export async function scheduleInterview(
  input: {
    application: Application;
    scheduledAt: string;
    durationMinutes?: number;
    mode?: Interview['mode'];
    locationOrLink?: string;
    panel: { id: string; name: string }[];
    questions?: string[];
  },
  by: { id: string; name: string }
): Promise<Interview> {
  const { application } = input;
  const docData: any = {
    applicationId: application.id,
    jobId: application.jobId,
    jobTitle: application.jobTitle,
    candidateId: application.candidateId,
    candidateName: application.candidateName,
    candidateEmail: application.email,
    scheduledAt: input.scheduledAt,
    durationMinutes: input.durationMinutes ?? 60,
    mode: input.mode ?? 'in-person',
    locationOrLink: input.locationOrLink ?? '',
    panel: input.panel,
    questions: input.questions ?? [],
    scores: [],
    status: 'scheduled' as InterviewStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, COL), docData);

  // Move the application into the interview stage + tell the candidate.
  await updateApplicationStatus(application, 'interview', by, 'Interview scheduled', false);
  await notify({
    userId: application.candidateId,
    email: application.email,
    title: `Interview invitation — ${application.jobTitle}`,
    body: `You have been invited to an interview on ${new Date(input.scheduledAt).toLocaleString()}. ${input.locationOrLink ? `Location/link: ${input.locationOrLink}` : ''}`,
    type: 'interview',
    relatedId: docRef.id,
  });
  await logAudit(by, 'create', 'Interview', docRef.id, `Scheduled for ${application.candidateName}`);
  return toInterview(docRef.id, docData);
}

export async function getInterviews(): Promise<Interview[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('scheduledAt', 'desc')));
  return snap.docs.map((d) => toInterview(d.id, d.data()));
}

export async function getInterviewsForJob(jobId: string): Promise<Interview[]> {
  const snap = await getDocs(query(collection(db, COL), where('jobId', '==', jobId)));
  return snap.docs.map((d) => toInterview(d.id, d.data()));
}

export async function getInterviewsForCandidate(candidateId: string): Promise<Interview[]> {
  const snap = await getDocs(query(collection(db, COL), where('candidateId', '==', candidateId)));
  return snap.docs.map((d) => toInterview(d.id, d.data()));
}

/** Record (or replace) one panelist's score. */
export async function recordPanelScore(
  interview: Interview,
  score: PanelScore
): Promise<void> {
  const others = (interview.scores ?? []).filter((s) => s.panelistId !== score.panelistId);
  await updateDoc(doc(db, COL, interview.id), {
    scores: [...others, { ...score, recordedAt: new Date() }],
    updatedAt: serverTimestamp(),
  });
}

export async function completeInterview(
  interview: Interview,
  result: NonNullable<Interview['result']>,
  notes: string,
  by: { id: string; name: string }
): Promise<void> {
  await updateDoc(doc(db, COL, interview.id), {
    status: 'completed',
    result,
    notes,
    updatedAt: serverTimestamp(),
  });
  await logAudit(by, 'update', 'Interview', interview.id, `Completed: ${result}`);
}

export async function cancelInterview(id: string, by: { id: string; name: string }): Promise<void> {
  await updateDoc(doc(db, COL, id), { status: 'cancelled', updatedAt: serverTimestamp() });
  await logAudit(by, 'update', 'Interview', id, 'Cancelled');
}

/** Average of all recorded panel scores. */
export function averageScore(interview: Interview): number | null {
  const s = interview.scores ?? [];
  if (!s.length) return null;
  return Math.round((s.reduce((sum, x) => sum + x.score, 0) / s.length) * 10) / 10;
}
