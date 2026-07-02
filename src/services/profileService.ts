import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { STORAGE_ENABLED } from '../lib/featureFlags';

/** Extended candidate profile stored on the Users document. */
export interface CandidateProfile {
  name?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  city?: string;
  country?: string;
  cvUrl?: string;
  cvFileName?: string;
}

export async function getCandidateProfile(userId: string): Promise<CandidateProfile> {
  const snap = await getDoc(doc(db, 'Users', userId));
  return snap.exists() ? (snap.data() as CandidateProfile) : {};
}

/** Saves profile fields (never touches `role` — rules forbid it anyway). */
export async function updateCandidateProfile(
  userId: string,
  updates: CandidateProfile
): Promise<void> {
  // Strip undefined — Firestore rejects undefined values.
  const clean = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );
  await updateDoc(doc(db, 'Users', userId), { ...clean, updatedAt: serverTimestamp() });
}

/** Uploads a reusable CV to the candidate's profile folder. */
export async function uploadProfileCv(
  userId: string,
  file: File
): Promise<{ url: string; name: string }> {
  if (!STORAGE_ENABLED) {
    throw new Error('Document storage is not enabled yet — CV uploads will be available soon.');
  }
  const storageRef = ref(storage, `profiles/${userId}/cv-${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateCandidateProfile(userId, { cvUrl: url, cvFileName: file.name });
  return { url, name: file.name };
}
