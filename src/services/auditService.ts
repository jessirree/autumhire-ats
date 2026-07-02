import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type AuditAction = 'create' | 'update' | 'delete' | 'status-change' | 'login' | 'apply';

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  detail: string;
  at?: Timestamp | null;
}

/** Most recent audit entries (admin viewer). */
export async function getAuditLog(max = 200): Promise<AuditEntry[]> {
  const snap = await getDocs(query(collection(db, 'AuditLog'), orderBy('at', 'desc'), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditEntry));
}

/**
 * Fire-and-forget audit trail. Never throws — an audit failure must not
 * break the user-facing action.
 */
export async function logAudit(
  actor: { id: string; name: string },
  action: AuditAction,
  entity: string,
  entityId: string,
  detail?: string
): Promise<void> {
  try {
    await addDoc(collection(db, 'AuditLog'), {
      actorId: actor.id,
      actorName: actor.name,
      action,
      entity,
      entityId,
      detail: detail ?? '',
      at: serverTimestamp(),
    });
  } catch {
    // swallow — audit logging is best-effort on the client
  }
}
