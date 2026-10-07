const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { sendMail } = require('./mail');

const STAFF_ROLES = ['admin', 'recruiter', 'hiring-manager'];

// A light eyebrow label per type, shown above the subject in the email —
// not a real per-type template. F0 proves the pipe; reading real subjects/
// bodies from the Templates collection (brief §4 F0c) is a deliberate
// follow-up, not F0's job. The actual content is always the notification's
// own title and body, for every type including 'general'.
const TYPE_LABELS = {
  'application-received': 'Application update',
  'status-update': 'Application update',
  interview: 'Interview update',
  offer: 'Offer update',
  regret: 'Application update',
  'reference-check': 'Reference request',
  general: 'Notification',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailContent(notification) {
  const label = TYPE_LABELS[notification.type] || 'Notification';
  const subject = notification.title || label;
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">' +
    `<p style="color:#7C7269;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${escapeHtml(label)}</p>` +
    `<h2 style="color:#2C3E50;margin-top:0;">${escapeHtml(notification.title)}</h2>` +
    `<p style="color:#2C3E50;white-space:pre-wrap;">${escapeHtml(notification.body)}</p>` +
    '<p style="color:#7C7269;font-size:12px;margin-top:32px;">Autumhire Careers</p>' +
    '</div>';
  const text = `${notification.title}\n\n${notification.body}`;
  return { subject, html, text };
}

/**
 * Resolves the real recipient address, per brief §0.2: a client-supplied
 * `email` field is never trusted when userId is set — the address always
 * comes from Users/{userId}.email via the Admin SDK instead. The one
 * exception is a notification with userId === '' (how referee emails are
 * meant to work, row 8.2), and only when the creator resolves to a staff
 * account — otherwise a candidate could still get an arbitrary address
 * emailed by writing email on a self-addressed notification and leaving
 * userId empty... except the Notifications create rule requires userId to
 * equal the creator's own uid for a non-staff write, so userId can only
 * ever be '' on a notification a STAFF member created in the first place.
 * This check is what makes that trust decision explicit rather than implicit
 * in the rule.
 */
async function resolveRecipientEmail(notification) {
  const db = getFirestore();

  if (notification.userId) {
    const userSnap = await db.collection('Users').doc(notification.userId).get();
    const email = userSnap.exists ? userSnap.data().email : null;
    return email || null;
  }

  if (notification.createdById) {
    const creatorSnap = await db.collection('Users').doc(notification.createdById).get();
    const creatorRole = creatorSnap.exists ? creatorSnap.data().role : null;
    if (STAFF_ROLES.includes(creatorRole) && notification.email) {
      return notification.email;
    }
  }

  return null;
}

/**
 * Delivers the Notifications collection as email (brief §4 F0b). Never
 * throws on a send failure — a thrown error makes Cloud Functions retry,
 * and a retry loop against a rate-limited shared cPanel host gets the
 * sending account suspended. Writes the real outcome back onto the
 * notification instead: emailStatus 'sent' | 'failed' | 'skipped', plus
 * emailSentAt/emailMessageId on success or emailError on failure. That
 * write-back is what replaces the delivery webhooks SMTP doesn't give us.
 */
exports.deliverNotificationEmail = onDocumentCreated(
  { document: 'Notifications/{notificationId}', secrets: ['SMTP_PASSWORD'] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const notificationId = event.params.notificationId;
    const notification = snap.data();

    // Idempotency first — Firestore triggers can fire more than once for
    // the same create event, and a duplicate confirmation email is a
    // visible, confusing defect.
    if (notification.emailStatus) return;

    const recipient = await resolveRecipientEmail(notification);
    if (!recipient) {
      await snap.ref.set({ emailStatus: 'skipped', emailSkipReason: 'no-address' }, { merge: true });
      console.log(`deliverNotificationEmail: skipped ${notificationId} (type=${notification.type}) — no address`);
      return;
    }

    const { subject, html, text } = buildEmailContent(notification);

    try {
      const result = await sendMail({ to: recipient, subject, html, text });
      if (result.skipped) {
        await snap.ref.set({ emailStatus: 'skipped', emailSkipReason: 'mail-disabled' }, { merge: true });
        console.log(`deliverNotificationEmail: skipped ${notificationId} (type=${notification.type}) — MAIL_ENABLED=false`);
        return;
      }
      await snap.ref.set(
        {
          emailStatus: 'sent',
          emailSentAt: FieldValue.serverTimestamp(),
          emailMessageId: result.messageId,
        },
        { merge: true }
      );
      // Log the recipient and the type, never the body and never the password.
      console.log(`deliverNotificationEmail: sent ${notificationId} (type=${notification.type}) to ${recipient}`);
    } catch (err) {
      await snap.ref
        .set({ emailStatus: 'failed', emailError: err?.message || 'Unknown SMTP error' }, { merge: true })
        .catch((writeErr) => {
          console.error(`deliverNotificationEmail: failed to record failure for ${notificationId}`, writeErr.message);
        });
      console.error(`deliverNotificationEmail: failed ${notificationId} (type=${notification.type})`, err?.message);
    }
  }
);
