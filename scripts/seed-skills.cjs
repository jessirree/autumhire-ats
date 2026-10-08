// One-time setup: seeds a small starter Skills taxonomy (candidate-matching
// spec §2.1) so the admin Skills screen and the profile/job-requirements
// typeahead pickers aren't empty on day one.
//
// Deliberately generic and small (~25 entries), not an occupational
// standard import — the spec is explicit that a recruiter who opens a list
// of three thousand ESCO skills will not use it. The client is expected to
// edit this list (rename, deactivate, add their own) through the admin
// Skills screen; this script only needs to run once, against whichever
// project is pointed at — including production, since this is real setup
// data the client keeps, not a disposable test fixture.
//
// Upserts by a deterministic slug id, so re-running is safe and idempotent:
// it will never duplicate a skill, and it never touches `active` on an
// existing document (so it can't silently reactivate one the client chose
// to deactivate).
//
// Usage:
//   node scripts/seed-skills.cjs path/to/serviceAccountKey.json

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path');

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Usage: node scripts/seed-skills.cjs <serviceAccountKey.json>');
  process.exit(1);
}

const STARTER_SKILLS = [
  'JavaScript',
  'TypeScript',
  'Python',
  'SQL',
  'Cloud Computing (AWS)',
  'Networking',
  'Project Management',
  'Microsoft Excel',
  'Data Analysis',
  'Customer Service',
  'Sales',
  'Digital Marketing',
  'Social Media Management',
  'Content Writing',
  'Graphic Design',
  'Accounting',
  'Bookkeeping',
  'Human Resources Management',
  'Recruitment',
  'Negotiation',
  'Public Speaking',
  'Team Leadership',
  'Procurement',
  'Supply Chain Management',
  'Legal Compliance',
];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const serviceAccount = require(path.resolve(keyPath));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  console.log(`Project: ${serviceAccount.project_id}\n`);
  let created = 0;
  let skipped = 0;

  for (const name of STARTER_SKILLS) {
    const id = slugify(name);
    const ref = db.collection('Skills').doc(id);
    const existing = await ref.get();
    if (existing.exists) {
      skipped++;
      continue;
    }
    await ref.set({
      name,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    created++;
  }

  console.log(`Created ${created} skill(s), skipped ${skipped} already present.`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
