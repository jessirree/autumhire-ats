import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type NotificationType =
  | 'application-received'
  | 'status-update'
  | 'interview'
  | 'offer'
  | 'regret'
  | 'reference-check'
  | 'general';

export interface AppNotification {
  id: string;
  userId: string; // recipient uid ('' when only an email is known)
  email?: string;
  title: string;
  body: string;
  type: NotificationType;
  relatedId?: string;
  read: boolean;
  createdAt?: Timestamp | null;
}

const COL = 'Notifications';

/**
 * In-app notification log. Doubles as the outbox for a future email sender
 * (Cloud Function can watch this collection and deliver by email).
 */
export async function notify(input: {
  userId: string;
  email?: string;
  title: string;
  body: string;
  type: NotificationType;
  relatedId?: string;
}): Promise<void> {
  try {
    await addDoc(collection(db, COL), {
      ...input,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Notifications are best-effort; never block the main action.
  }
}

export async function getNotificationsForUser(userId: string): Promise<AppNotification[]> {
  const snap = await getDocs(
    query(collection(db, COL), where('userId', '==', userId), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { read: true });
}
