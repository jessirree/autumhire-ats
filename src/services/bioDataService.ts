import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Extended bio-data collected from shortlisted candidates. Kept in its own
 * collection (rather than on the Application document) because candidates
 * are never allowed to amend their submitted application — see the
 * "No amendments/deletions on applications by the applicant" requirement.
 */
export interface BioData {
  applicationId: string;
  candidateId: string;
  nationalId: string;
  postalAddress: string;
  submittedAt?: Timestamp | null;
}

const COL = 'BioData';

export async function getBioData(applicationId: string): Promise<BioData | null> {
  const snap = await getDoc(doc(db, COL, applicationId));
  return snap.exists() ? (snap.data() as BioData) : null;
}

export async function submitBioData(
  applicationId: string,
  candidateId: string,
  data: { nationalId: string; postalAddress: string }
): Promise<void> {
  await setDoc(doc(db, COL, applicationId), {
    applicationId,
    candidateId,
    nationalId: data.nationalId.trim(),
    postalAddress: data.postalAddress.trim(),
    submittedAt: serverTimestamp(),
  });
}
