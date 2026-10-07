import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface SendTestEmailResult {
  messageId: string;
  response: string;
}

/**
 * Admin-only health check for the SMTP transport (Wave F0 §4 F0a). Calls
 * the sendTestEmail Cloud Function, which throws with the real SMTP error
 * text on failure — never swallowed here, the caller renders it directly.
 */
export async function sendTestEmail(to: string): Promise<SendTestEmailResult> {
  const callable = httpsCallable<{ to: string }, SendTestEmailResult>(functions, 'sendTestEmail');
  const result = await callable({ to });
  return result.data;
}
