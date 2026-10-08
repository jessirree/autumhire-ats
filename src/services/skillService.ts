import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logAudit } from './auditService';

/**
 * Admin-managed skills taxonomy (candidate-matching spec §2.1). A skill is
 * deactivated rather than deleted — one already selected on a candidate
 * profile or a job's requirements must not vanish from under them, so
 * `active` gates the typeahead pickers (steps 2-3) while the admin screen
 * still shows and can reactivate inactive entries.
 */
export interface Skill {
  id: string;
  name: string;
  department?: string;
  active: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface SkillInput {
  name: string;
  department?: string;
}

export interface SkillUpdate {
  name?: string;
  department?: string;
  active?: boolean;
}

const COL = 'Skills';

function toSkill(id: string, data: any): Skill {
  return { active: true, ...data, id } as Skill;
}

/**
 * All skills, name-sorted. `includeInactive` defaults to true because the
 * admin management screen is the primary caller and needs to show (and
 * reactivate) deactivated entries; typeahead pickers elsewhere pass false.
 */
export async function getSkills(includeInactive = true): Promise<Skill[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('name', 'asc')));
  const skills = snap.docs.map((d) => toSkill(d.id, d.data()));
  return includeInactive ? skills : skills.filter((s) => s.active);
}

export async function createSkill(input: SkillInput, by: { id: string; name: string }): Promise<Skill> {
  const name = input.name.trim();
  if (!name) throw new Error('Skill name is required.');
  const docData: any = {
    name,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(input.department?.trim() ? { department: input.department.trim() } : {}),
  };
  const ref = await addDoc(collection(db, COL), docData);
  await logAudit(by, 'create', 'Skill', ref.id, `Added skill "${name}"`);
  return toSkill(ref.id, docData);
}

/** Rename, re-scope or deactivate/reactivate a skill. */
export async function updateSkill(
  id: string,
  updates: SkillUpdate,
  by: { id: string; name: string }
): Promise<void> {
  const payload: any = { updatedAt: serverTimestamp() };
  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (!trimmed) throw new Error('Skill name is required.');
    payload.name = trimmed;
  }
  if (updates.department !== undefined) payload.department = updates.department.trim();
  if (updates.active !== undefined) payload.active = updates.active;

  await updateDoc(doc(db, COL, id), payload);
  const detail =
    updates.active !== undefined
      ? updates.active
        ? 'Reactivated'
        : 'Deactivated'
      : `Updated (${Object.keys(updates).join(', ')})`;
  await logAudit(by, 'update', 'Skill', id, detail);
}
