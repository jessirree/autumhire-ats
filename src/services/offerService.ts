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
import {
  Application,
  getApplicationById,
  updateApplicationStatus,
  sendRegretsForJob,
  Referee,
} from './applicationService';

export type OfferStatus =
  | 'pending-approval'
  | 'approved'
  | 'declined-approval'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export interface Offer {
  id: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  salary?: string;
  currency?: string;
  startDate?: string;
  notes?: string;
  status: OfferStatus;
  approverId?: string;
  approverName?: string;
  approvalComment?: string;
  createdById: string;
  createdByName: string;
  /** Set by respondToOffer — tells notifyOfferResponse (Cloud Function) this update came from the candidate, not recordOfferDecision. */
  respondedByCandidate?: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ReferenceCheck {
  id: string;
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  referee: Referee;
  emailBody: string;
  status: 'sent' | 'responded';
  response?: string;
  createdAt?: Timestamp | null;
}

const OFFERS = 'Offers';
const REFCHECKS = 'ReferenceChecks';

// ── Offers ──────────────────────────────────────────────────────────

export async function createOffer(
  input: {
    application: Application;
    salary?: string;
    currency?: string;
    startDate?: string;
    notes?: string;
    approver?: { id: string; name: string };
  },
  by: { id: string; name: string }
): Promise<Offer> {
  const { application } = input;
  const docData: any = {
    applicationId: application.id,
    jobId: application.jobId,
    jobTitle: application.jobTitle,
    candidateId: application.candidateId,
    candidateName: application.candidateName,
    candidateEmail: application.email,
    salary: input.salary ?? '',
    currency: input.currency ?? '',
    startDate: input.startDate ?? '',
    notes: input.notes ?? '',
    status: input.approver ? ('pending-approval' as OfferStatus) : ('approved' as OfferStatus),
    ...(input.approver ? { approverId: input.approver.id, approverName: input.approver.name } : {}),
    createdById: by.id,
    createdByName: by.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, OFFERS), docData);
  await updateApplicationStatus(application, 'offer', by, 'Offer prepared', false);
  if (input.approver) {
    await notify({
      userId: input.approver.id,
      title: 'Offer approval needed',
      body: `An offer for ${application.candidateName} (${application.jobTitle}) is awaiting your approval.`,
      type: 'offer',
      relatedId: docRef.id,
      createdById: by.id,
    });
  }
  await logAudit(by, 'create', 'Offer', docRef.id, `Offer for ${application.candidateName}`);
  return { id: docRef.id, ...docData } as Offer;
}

export async function getOffers(): Promise<Offer[]> {
  const snap = await getDocs(query(collection(db, OFFERS), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Offer));
}

export async function getOffersForCandidate(candidateId: string): Promise<Offer[]> {
  const snap = await getDocs(
    query(collection(db, OFFERS), where('candidateId', '==', candidateId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Offer));
}

/**
 * Candidate's own response to a sent offer. Only flips the offer status —
 * the recruiter then finalizes the hire (which updates the application and
 * sends regrets).
 *
 * The notification used to be written here, addressed to offer.createdById.
 * That is a non-staff client creating a Notifications doc addressed to
 * someone else, which the Notifications create rule (tightened for the F0
 * open-relay fix) denies outright — notify() swallowed the failure, so
 * nobody was ever told. Moved server-side instead: notifyOfferResponse
 * (functions/index.js) fires on this document's own update, via the Admin
 * SDK, which bypasses the rule entirely and also resolves the correct
 * recipient (the hiring manager, not whoever drafted the offer — row 9.2).
 * respondedByCandidate is the signal that tells that function this update
 * came from the candidate, not from recordOfferDecision.
 */
export async function respondToOffer(
  offer: Offer,
  decision: 'accepted' | 'rejected',
  candidate: { id: string; name: string }
): Promise<void> {
  if (offer.status !== 'sent') {
    throw new Error('This offer is not awaiting your response.');
  }
  await updateDoc(doc(db, OFFERS, offer.id), {
    status: decision,
    respondedByCandidate: true,
    updatedAt: serverTimestamp(),
  });
  await logAudit(candidate, 'status-change', 'Offer', offer.id, `candidate ${decision}`);
}

/**
 * Recruiter step after a candidate accepts: marks the application as hired,
 * notifies the candidate, and optionally sends regrets to the rest.
 */
export async function finalizeHire(
  offer: Offer,
  by: { id: string; name: string },
  options?: { sendRegrets?: boolean }
): Promise<void> {
  const application = await getApplicationById(offer.applicationId);
  if (!application) throw new Error('Application not found.');
  if (application.status === 'hired') return; // already done
  await updateApplicationStatus(application, 'hired', by, 'Offer accepted', true);
  if (options?.sendRegrets) {
    await sendRegretsForJob(offer.jobId, by);
  }
  await logAudit(by, 'status-change', 'Offer', offer.id, 'hire finalized');
}

export async function getOffersPendingApproval(approverId: string): Promise<Offer[]> {
  const snap = await getDocs(
    query(
      collection(db, OFFERS),
      where('approverId', '==', approverId),
      where('status', '==', 'pending-approval')
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Offer));
}

export async function decideOfferApproval(
  offer: Offer,
  decision: 'approved' | 'declined-approval',
  comment: string | undefined,
  by: { id: string; name: string }
): Promise<void> {
  await updateDoc(doc(db, OFFERS, offer.id), {
    status: decision,
    ...(comment ? { approvalComment: comment } : {}),
    updatedAt: serverTimestamp(),
  });
  await notify({
    userId: offer.createdById,
    title: `Offer ${decision === 'approved' ? 'approved' : 'declined'}`,
    body: `The offer for ${offer.candidateName} (${offer.jobTitle}) was ${decision === 'approved' ? 'approved' : 'declined'} by ${by.name}.${comment ? ` Comment: ${comment}` : ''}`,
    type: 'offer',
    relatedId: offer.id,
    createdById: by.id,
  });
  await logAudit(by, 'status-change', 'Offer', offer.id, decision);
}

/** Mark an approved offer as sent to the candidate. */
export async function sendOffer(offer: Offer, by: { id: string; name: string }): Promise<void> {
  // Mirrors respondToOffer's guard (above). The UI's in-flight disable
  // handles the double-click case; this is what stops a second send from
  // any other caller — a double-click is not the only way to call this
  // twice on the same offer.
  if (offer.status !== 'approved') {
    throw new Error('This offer is not awaiting sending.');
  }
  await updateDoc(doc(db, OFFERS, offer.id), { status: 'sent', updatedAt: serverTimestamp() });
  await notify({
    userId: offer.candidateId,
    email: offer.candidateEmail,
    title: `Offer of employment — ${offer.jobTitle}`,
    body: `Congratulations! You have received an offer for the ${offer.jobTitle} position. Please respond from your dashboard.`,
    type: 'offer',
    relatedId: offer.id,
    createdById: by.id,
  });
  await logAudit(by, 'status-change', 'Offer', offer.id, 'sent');
}

/**
 * Record the candidate's decision. On acceptance the application becomes
 * 'hired', the hiring manager is notified, and regrets go to the remaining
 * candidates for that job.
 */
export async function recordOfferDecision(
  offer: Offer,
  decision: 'accepted' | 'rejected',
  by: { id: string; name: string },
  options?: { notifyUserId?: string; sendRegrets?: boolean }
): Promise<void> {
  await updateDoc(doc(db, OFFERS, offer.id), { status: decision, updatedAt: serverTimestamp() });

  const application = await getApplicationById(offer.applicationId);
  if (application) {
    if (decision === 'accepted') {
      await updateApplicationStatus(application, 'hired', by, 'Offer accepted', true);
      if (options?.sendRegrets !== false) {
        await sendRegretsForJob(offer.jobId, by);
      }
    } else {
      // H2: nothing else in this branch tells the candidate — the notify()
      // below this block is addressed to staff (notifyUserId/createdById),
      // not the candidate.
      await updateApplicationStatus(application, 'rejected', by, 'Offer rejected by candidate', true);
    }
  }

  // Keep the hiring manager / offer owner updated.
  await notify({
    userId: options?.notifyUserId ?? offer.createdById,
    title: `Offer ${decision} — ${offer.candidateName}`,
    body: `${offer.candidateName} has ${decision} the offer for ${offer.jobTitle}.`,
    type: 'offer',
    relatedId: offer.id,
    createdById: by.id,
  });
  await logAudit(by, 'status-change', 'Offer', offer.id, decision);
}

// ── Reference checks ────────────────────────────────────────────────

/** Auto-generate the referee email body from application + job details. */
export function buildRefereeEmail(application: Application, referee: Referee): string {
  return (
    `Dear ${referee.name},\n\n` +
    `${application.candidateName} has applied for the position of ${application.jobTitle} ` +
    `in our ${application.department} department and listed you as a referee` +
    `${referee.organization ? ` (${referee.organization})` : ''}.\n\n` +
    `We would appreciate your feedback on the candidate's suitability, character and past performance. ` +
    `Please reply to this email with your comments.\n\n` +
    `Kind regards,\nAutumhire Resourcing Team`
  );
}

export async function createReferenceCheck(
  application: Application,
  referee: Referee,
  by: { id: string; name: string }
): Promise<ReferenceCheck> {
  const emailBody = buildRefereeEmail(application, referee);
  const docData: any = {
    applicationId: application.id,
    candidateName: application.candidateName,
    jobTitle: application.jobTitle,
    referee,
    emailBody,
    status: 'sent',
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, REFCHECKS), docData);
  // userId: '' is the staff-created path the Notifications rule and the
  // outbox (functions/outbox.js) already support — the referee has no
  // account, so there's no uid to address this to, only an email a staff
  // member vouches for. Without this, status: 'sent' was a lie: nothing
  // ever emailed the referee.
  await notify({
    userId: '',
    email: referee.email,
    title: `Reference request — ${application.candidateName} (${application.jobTitle})`,
    body: emailBody,
    type: 'reference-check',
    relatedId: docRef.id,
    createdById: by.id,
  });
  await logAudit(by, 'create', 'ReferenceCheck', docRef.id, `Referee: ${referee.name}`);
  return { id: docRef.id, ...docData } as ReferenceCheck;
}

export async function getReferenceChecks(applicationId: string): Promise<ReferenceCheck[]> {
  const snap = await getDocs(
    query(collection(db, REFCHECKS), where('applicationId', '==', applicationId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReferenceCheck));
}

export async function recordReferenceResponse(id: string, response: string): Promise<void> {
  await updateDoc(doc(db, REFCHECKS, id), { status: 'responded', response });
}
