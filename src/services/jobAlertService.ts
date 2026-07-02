import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notify } from './notificationService';

export interface JobAlert {
  userId: string;
  email: string;
  name: string;
  createdAt?: any;
}

const COL = 'JobAlerts';

/** One subscription per user — the doc id is the uid. */
export async function subscribeToJobAlerts(user: { id: string; email: string; name: string }): Promise<void> {
  await setDoc(doc(db, COL, user.id), {
    userId: user.id,
    email: user.email,
    name: user.name,
    createdAt: serverTimestamp(),
  });
}

export async function unsubscribeFromJobAlerts(userId: string): Promise<void> {
  await deleteDoc(doc(db, COL, userId));
}

export async function isSubscribed(userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, COL, userId));
  return snap.exists();
}

/**
 * Sends an in-app notification to every subscriber when a new job goes live.
 * (The Notifications collection also acts as the email outbox once a sender
 * is connected.)
 */
export async function notifyJobAlertSubscribers(jobTitle: string, location: string): Promise<number> {
  const snap = await getDocs(collection(db, COL));
  const subscribers = snap.docs.map((d) => d.data() as JobAlert);
  await Promise.all(
    subscribers.map((s) =>
      notify({
        userId: s.userId,
        email: s.email,
        title: 'New job posted at Autumhire',
        body: `A new position has just been advertised: ${jobTitle} (${location}). Visit the vacancies page to apply.`,
        type: 'general',
      })
    )
  );
  return subscribers.length;
}
