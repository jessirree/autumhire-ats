const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { sendMail } = require('./mail');
const { notifyOfferResponse } = require('./offerNotifications');
const { deliverNotificationEmail } = require('./outbox');

initializeApp();

exports.notifyOfferResponse = notifyOfferResponse;
exports.deliverNotificationEmail = deliverNotificationEmail;

const VALID_ROLES = ['admin', 'recruiter', 'hiring-manager', 'candidate'];

/**
 * Keeps each user's Auth custom claim in sync with their Firestore role.
 * Storage Security Rules read `request.auth.token.role` instead of doing a
 * cross-service Firestore lookup (which proved unreliable) — this is what
 * keeps that claim current whenever a Users/{uid} doc is created or edited.
 */
exports.syncUserRoleClaim = onDocumentWritten('Users/{uid}', async (event) => {
  const uid = event.params.uid;
  const after = event.data?.after?.data();

  // Document deleted — nothing to sync.
  if (!after) return;

  const role = after.role;
  if (!VALID_ROLES.includes(role)) {
    console.warn(`Users/${uid} has an unrecognized role "${role}" — skipping claim sync.`);
    return;
  }

  const user = await getAuth().getUser(uid);
  if (user.customClaims?.role === role) return; // already in sync

  await getAuth().setCustomUserClaims(uid, { role });
  console.log(`Set custom claim role="${role}" for uid=${uid}`);
});

/**
 * Admin-only health check for the SMTP transport (Wave F0, brief §4 F0a).
 * Deliberately permanent, not throwaway: when the client rotates the mailbox
 * password, this is how they find out mail still works without waiting for
 * a candidate to report a missing email.
 *
 * Returns the real messageId/response on success and throws with the real
 * SMTP error message on failure — the admin UI shows exactly this, not a
 * toast that just says "sent".
 */
exports.sendTestEmail = onCall({ secrets: ['SMTP_PASSWORD'] }, async (request) => {
  if (!request.auth || request.auth.token?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin only.');
  }

  const to = request.data?.to;
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw new HttpsError('invalid-argument', 'A valid destination email address is required.');
  }

  try {
    const result = await sendMail({
      to,
      subject: 'Autumhire ATS — test email',
      html: '<p>This is a test email sent from the Autumhire ATS admin panel. If you received this, outbound SMTP delivery is working.</p>',
      text: 'This is a test email sent from the Autumhire ATS admin panel. If you received this, outbound SMTP delivery is working.',
    });
    if (result.skipped) {
      throw new HttpsError('failed-precondition', 'MAIL_ENABLED is set to false — no connection was opened.');
    }
    return { messageId: result.messageId, response: result.response };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    // Never log the password — only the recipient and the SMTP error text.
    console.error('sendTestEmail failed', { to, message: err?.message });
    throw new HttpsError('internal', err?.message || 'SMTP send failed.');
  }
});
