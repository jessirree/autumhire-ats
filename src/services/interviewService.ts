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
  setDoc,
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
  // Shown to the candidate verbatim (dashboard + notification body) —
  // distinct from `notes`, which is staff-only post-interview writeup.
  candidateInstructions?: string;
  panel: { id: string; name: string }[];
  questions: string[];
  scores: PanelScore[];
  status: InterviewStatus;
  result?: 'recommended' | 'not-recommended' | 'on-hold';
  notes?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

/**
 * G5: the fields a candidate is allowed to see, and nothing else — a type
 * with no `panel`/`questions`/`scores`/`notes`/`result` fields at all, so
 * there is no later field this view could accidentally render. The G6
 * subcollection move already makes the scores leak structurally
 * impossible (firestore.rules:161-170, scores read is isStaff()-only,
 * never returned by a read of the parent either way), but this function
 * never even calls resolveScores() to begin with — unlike
 * getInterviewsForCandidate() above, which is staff-only precisely
 * because it does call it, and that subcollection read would throw a
 * permission-denied for a candidate session.
 */
export interface CandidateInterviewView {
  id: string;
  jobTitle: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: Interview['mode'];
  locationOrLink?: string;
  candidateInstructions?: string;
  status: InterviewStatus;
}

const COL = 'Interviews';

function toInterview(id: string, data: any): Interview {
  return { panel: [], questions: [], scores: [], ...data, id } as Interview;
}

/**
 * G6: scores now live in a subcollection (see firestore.rules), one doc per
 * panelist, which is what stops two panellists' saves from racing each
 * other. Legacy interviews still carry scores as an array on the parent —
 * this merges the two per panelist, same shape as
 * requisitionService.ts's `hiringManagerId ?? createdById` default: a
 * panelist's subcollection entry wins when they have one; otherwise their
 * legacy array entry (if any) still counts. This is not a plain "prefer the
 * subcollection unless it's empty" fallback, because that would drop a
 * legacy score the moment any other panelist on the same interview saves
 * through the subcollection — correctness here means staying right when
 * some panellists have scored through one path and others through the
 * other, not just when nobody has used the subcollection yet.
 */
async function resolveScores(interviewId: string, legacyScores: PanelScore[]): Promise<PanelScore[]> {
  const snap = await getDocs(collection(db, COL, interviewId, 'scores'));
  const fromSubcollection = snap.docs.map((d) => d.data() as PanelScore);
  const covered = new Set(fromSubcollection.map((s) => s.panelistId));
  const legacyRemainder = (legacyScores ?? []).filter((s) => !covered.has(s.panelistId));
  return [...fromSubcollection, ...legacyRemainder];
}

async function withResolvedScores(interviews: Interview[]): Promise<Interview[]> {
  return Promise.all(
    interviews.map(async (iv) => ({ ...iv, scores: await resolveScores(iv.id, iv.scores) }))
  );
}

export async function scheduleInterview(
  input: {
    application: Application;
    scheduledAt: string;
    durationMinutes?: number;
    mode?: Interview['mode'];
    locationOrLink?: string;
    candidateInstructions?: string;
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
    candidateInstructions: input.candidateInstructions ?? '',
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
  // G5: the invitation email is deferred, so this notification body is the
  // only channel a candidate has for this detail — it carries everything
  // the dashboard card does (mode, duration, instructions), not just the
  // date and location the pre-G5 body had.
  const modeLabel = { 'in-person': 'In person', video: 'Video call', phone: 'Phone call' }[docData.mode as Interview['mode']];
  const bodyParts = [
    `You have been invited to an interview on ${new Date(input.scheduledAt).toLocaleString()}.`,
    `${modeLabel}, ${docData.durationMinutes} minutes.`,
  ];
  if (input.locationOrLink) bodyParts.push(`Location/link: ${input.locationOrLink}.`);
  if (input.candidateInstructions) bodyParts.push(input.candidateInstructions);
  await notify({
    userId: application.candidateId,
    email: application.email,
    title: `Interview invitation — ${application.jobTitle}`,
    body: bodyParts.join(' '),
    type: 'interview',
    relatedId: docRef.id,
    createdById: by.id,
  });
  await logAudit(by, 'create', 'Interview', docRef.id, `Scheduled for ${application.candidateName}`);
  return toInterview(docRef.id, docData);
}

export async function getInterviews(): Promise<Interview[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('scheduledAt', 'desc')));
  return withResolvedScores(snap.docs.map((d) => toInterview(d.id, d.data())));
}

export async function getInterviewsForJob(jobId: string): Promise<Interview[]> {
  const snap = await getDocs(query(collection(db, COL), where('jobId', '==', jobId)));
  return withResolvedScores(snap.docs.map((d) => toInterview(d.id, d.data())));
}

/** Staff-only, like the other two reads here — the scores subcollection rule denies a non-staff read. */
export async function getInterviewsForCandidate(candidateId: string): Promise<Interview[]> {
  const snap = await getDocs(query(collection(db, COL), where('candidateId', '==', candidateId)));
  return withResolvedScores(snap.docs.map((d) => toInterview(d.id, d.data())));
}

/**
 * G5: the candidate dashboard's only interview read. Deliberately
 * separate from getInterviewsForCandidate() above — that one calls
 * withResolvedScores(), which queries the scores subcollection, which
 * firestore.rules denies to a non-staff reader; calling it from a
 * candidate session would reject the whole fetch with permission-denied,
 * not just omit the scores. This function never touches that
 * subcollection, and its return type has no field a panel score could
 * even be assigned to.
 */
export async function getUpcomingInterviewsForCandidate(candidateId: string): Promise<CandidateInterviewView[]> {
  const snap = await getDocs(
    query(collection(db, COL), where('candidateId', '==', candidateId), where('status', '==', 'scheduled'))
  );
  return snap.docs
    .map((d) => {
      const data = d.data();
      const view: CandidateInterviewView = {
        id: d.id,
        jobTitle: data.jobTitle,
        scheduledAt: data.scheduledAt,
        durationMinutes: data.durationMinutes,
        mode: data.mode,
        locationOrLink: data.locationOrLink || undefined,
        candidateInstructions: data.candidateInstructions || undefined,
        status: data.status,
      };
      return view;
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

/**
 * Record (or replace) one panelist's score. G6: writes to
 * Interviews/{id}/scores/{panelistId} — a document keyed by the writer's
 * own uid, not a read-filter-rewrite of a shared array — so two panellists
 * saving close together can no longer race each other; the second write
 * only ever overwrites its own prior entry, never the other panelist's.
 */
export async function recordPanelScore(
  interviewId: string,
  score: PanelScore,
  by: { id: string; name: string }
): Promise<void> {
  const ref = doc(db, COL, interviewId, 'scores', score.panelistId);
  const existing = await getDoc(ref);
  await setDoc(ref, { ...score, recordedAt: serverTimestamp() });
  await logAudit(
    by,
    existing.exists() ? 'update' : 'create',
    'Interview',
    interviewId,
    `Panel score ${existing.exists() ? 'updated' : 'recorded'}: ${score.score}`
  );
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

/**
 * Average of whatever scores list is passed in — the caller is expected to
 * have already read the merged (subcollection + legacy) list via
 * getInterviews()/getInterviewsForJob()/getInterviewsForCandidate(), not to
 * reach into a stale Interview.scores itself. Stays correct regardless of
 * how many panellists have scored, including partial lists.
 */
export function averageScore(scores: PanelScore[]): number | null {
  if (!scores.length) return null;
  return Math.round((scores.reduce((sum, x) => sum + x.score, 0) / scores.length) * 10) / 10;
}
