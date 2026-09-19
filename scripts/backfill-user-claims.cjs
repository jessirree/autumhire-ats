// One-off utility: sets the "role" custom claim on every existing Firebase
// Auth user to match their Firestore Users/{uid}.role, for accounts created
// before the syncUserRoleClaim Cloud Function existed (which keeps this in
// sync automatically for every write going forward).
// Usage: node scripts/backfill-user-claims.cjs path/to/serviceAccountKey.json
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Usage: node scripts/backfill-user-claims.cjs path/to/serviceAccountKey.json');
  process.exit(1);
}

const VALID_ROLES = ['admin', 'recruiter', 'hiring-manager', 'candidate'];

initializeApp({ credential: cert(require(require('path').resolve(keyPath))) });
const db = getFirestore();
const auth = getAuth();

(async () => {
  const snap = await db.collection('Users').get();
  let updated = 0;
  let skipped = 0;
  for (const doc of snap.docs) {
    const role = doc.data().role;
    if (!VALID_ROLES.includes(role)) {
      console.warn(`Skipping ${doc.id}: unrecognized role "${role}"`);
      skipped++;
      continue;
    }
    try {
      const user = await auth.getUser(doc.id);
      if (user.customClaims?.role === role) {
        skipped++;
        continue;
      }
      await auth.setCustomUserClaims(doc.id, { role });
      console.log(`Set role="${role}" for ${doc.id} (${doc.data().name || doc.data().email})`);
      updated++;
    } catch (e) {
      console.warn(`Skipping ${doc.id}: ${e.message}`);
      skipped++;
    }
  }
  console.log(`Done. Updated ${updated}, skipped ${skipped}.`);
})();
