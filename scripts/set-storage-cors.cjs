// Sets Firebase Storage bucket CORS directly via the Admin SDK, so neither
// gsutil nor the gcloud CLI needs to be installed on the machine running
// this. Editing cors.json alone changes nothing — bucket CORS is set out of
// band and `firebase deploy` never touches it (row 5.10, the mass CV
// download on the deployed site, was broken by exactly this twice already).
//
// This is the only record of how bucket CORS gets (re)applied. Re-run it
// whenever cors.json changes — most notably when the client's real domain
// replaces the vercel.app one.
//
// Usage:
//   node scripts/set-storage-cors.cjs path/to/serviceAccountKey.json
//
// NEVER run this against production. It refuses any project not in
// ALLOWED_PROJECTS, same guard as scripts/seed-test-users.cjs.

const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');

const keyPath = process.argv[2];

if (!keyPath) {
  console.error('Usage: node scripts/set-storage-cors.cjs <serviceAccountKey.json>');
  process.exit(1);
}

// Guard rail. Add a staging project id here; never a production one.
const ALLOWED_PROJECTS = ['autumhire2-4a087'];

const BUCKET = 'autumhire2-4a087.firebasestorage.app';

const serviceAccount = require(path.resolve(keyPath));

if (!ALLOWED_PROJECTS.includes(serviceAccount.project_id)) {
  console.error(
    `Refusing to run against project "${serviceAccount.project_id}".\n` +
    `Add it to ALLOWED_PROJECTS in this script only if it is a dev or staging project.`
  );
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });

const corsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cors.json'), 'utf8'));

(async () => {
  console.log(`Project: ${serviceAccount.project_id}`);
  console.log(`Bucket:  ${BUCKET}\n`);

  const bucket = getStorage().bucket(BUCKET);

  console.log('Applying cors.json...');
  await bucket.setCorsConfiguration(corsConfig);

  console.log('\nReading back what the bucket actually has (not what we sent):');
  const [metadata] = await bucket.getMetadata();
  console.log(JSON.stringify(metadata.cors, null, 2));

  process.exit(0);
})().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
