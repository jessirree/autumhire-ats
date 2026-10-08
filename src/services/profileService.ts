import { doc, getDoc, updateDoc, serverTimestamp, deleteField, type FieldValue } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { STORAGE_ENABLED } from '../lib/featureFlags';
import type { EducationLevel } from '../lib/education';

// Re-exported so a component clearing a field can call updateCandidateProfile
// with { field: deleteField() } without importing firebase/firestore itself
// (CLAUDE.md: components never import firebase/firestore directly — services
// own all Firestore access).
export { deleteField };

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
  /**
   * Candidate-matching spec §2.2 capability profile. References to Skills
   * document ids, never names — step 1 made skills deactivatable rather
   * than deletable precisely so a taxonomy rename doesn't orphan a profile
   * that used the old string; resolve ids to names on read
   * (skillService.getSkills), never store the resolved name here.
   */
  skillIds?: string[];
  yearsOfExperience?: number;
  highestEducation?: EducationLevel;
}

export async function getCandidateProfile(userId: string): Promise<CandidateProfile> {
  const snap = await getDoc(doc(db, 'Users', userId));
  return snap.exists() ? (snap.data() as CandidateProfile) : {};
}

/**
 * An update may explicitly clear a field with deleteField() rather than
 * provide a value for it — distinct from omitting the key entirely,
 * which updateCandidateProfile below treats as "leave this field alone".
 */
export type CandidateProfileUpdate = {
  [K in keyof CandidateProfile]?: CandidateProfile[K] | FieldValue;
};

/** Saves profile fields (never touches `role` — rules forbid it anyway). */
export async function updateCandidateProfile(
  userId: string,
  updates: CandidateProfileUpdate
): Promise<void> {
  // Strip undefined — Firestore rejects undefined values. A deleteField()
  // sentinel is an object, not undefined, so it survives this filter and is
  // sent through to actually clear the field; only an omitted/undefined key
  // is treated as "no change".
  const clean = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );
  await updateDoc(doc(db, 'Users', userId), { ...clean, updatedAt: serverTimestamp() });
}

/**
 * H4: fills in profile fields from a just-submitted application, but only
 * ones the candidate's profile doesn't already have — never overwrites
 * something they set deliberately. Row 4.2 promises a profile and CV
 * reusable across applications; without this, applying before ever
 * touching the profile page leaves it permanently empty, so every later
 * application starts from scratch.
 */
export async function backfillProfileFromApplication(
  userId: string,
  fields: Pick<CandidateProfile, 'phone' | 'dateOfBirth' | 'gender' | 'nationality' | 'city' | 'country' | 'cvUrl' | 'cvFileName'>
): Promise<void> {
  const current = await getCandidateProfile(userId);
  const toBackfill: CandidateProfile = {};

  (['phone', 'dateOfBirth', 'gender', 'nationality', 'city', 'country'] as const).forEach((key) => {
    if (!current[key] && fields[key]) {
      toBackfill[key] = fields[key];
    }
  });

  // cvUrl/cvFileName are a pair — only backfill together, and only when
  // there's no existing profile CV at all.
  if (!current.cvUrl && fields.cvUrl) {
    toBackfill.cvUrl = fields.cvUrl;
    toBackfill.cvFileName = fields.cvFileName;
  }

  if (Object.keys(toBackfill).length > 0) {
    await updateCandidateProfile(userId, toBackfill);
  }
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
  await uploadBytes(storageRef, file, { contentType: 'application/pdf' });
  const url = await getDownloadURL(storageRef);
  await updateCandidateProfile(userId, { cvUrl: url, cvFileName: file.name });
  return { url, name: file.name };
}
