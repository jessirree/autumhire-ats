const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp();

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
