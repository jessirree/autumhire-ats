const nodemailer = require('nodemailer');

// Created lazily (see getTransport) and reused for the life of the function
// instance — pool:true keeps one connection open across sends in the same
// instance rather than negotiating TLS per email, which a shared cPanel host
// does not tolerate well from a burst of sends.
let transport;

function getTransport() {
  if (transport) return transport;
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    // SMTP_SECURE=true for port 465, false for 587 — see
    // docs/wave-f0-email-brief.md §3.3. Never force this; a mismatch here is
    // a config bug to fix in the env file, not something to code around.
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      // Only ever read here, inside a function that declared `secrets:
      // ['SMTP_PASSWORD']` in its definition — never at module load, and
      // never logged, written to a document, or included in an error
      // message built by this module.
      pass: process.env.SMTP_PASSWORD,
    },
    pool: true,
    maxConnections: 1,
    maxMessages: 50,
  });
  return transport;
}

/**
 * Sends one email. Throws on failure with nodemailer's own error — callers
 * decide what to do with that (e.g. write emailStatus: 'failed' onto a
 * Notifications document), this module never swallows it.
 *
 * Returns `{ skipped: true }` without opening a connection when
 * MAIL_ENABLED=false, the kill switch for every caller including the
 * "Send test email" admin control — there is deliberately no bypass.
 */
async function sendMail({ to, subject, html, text }) {
  if (process.env.MAIL_ENABLED === 'false') {
    return { skipped: true };
  }

  const fromName = process.env.MAIL_FROM_NAME || 'Autumhire Careers';
  const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER;
  const replyTo = process.env.MAIL_REPLY_TO || fromAddress;

  const info = await getTransport().sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    replyTo,
    to,
    subject,
    html,
    text,
  });

  return { messageId: info.messageId, response: info.response };
}

module.exports = { sendMail };
