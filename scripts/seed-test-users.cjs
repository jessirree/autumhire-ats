// Dev utility: seeds a complete manual-QA surface — test users, a test job,
// applications in the right statuses, and some pre-existing panel ratings.
//
// Users alone are not enough to test Wave C: ShortlistingPage filters
// applications to ['longlisted', 'shortlisted', 'rejected'], so without
// applications a hiring manager sees an empty table and there is nothing to
// rate. This script creates the whole chain.
//
// For each user it writes all three things the app needs to be consistent:
//   1. a Firebase Auth user (email + password, pre-verified)
//   2. a Users/{uid} Firestore document (AuthContext.fetchUserProfile signs
//      the user straight back out if this is missing)
//   3. the "role" custom claim — storage.rules reads request.auth.token.role,
//      so without it every CV upload and download denies while Firestore still
//      works, which is a confusing failure to debug. Normally the
//      syncUserRoleClaim Cloud Function does this; set here directly so the
//      users work even if that function has not been deployed.
//
// The job uses a JOB-TEST-#### reference rather than drawing from
// Counters/jobs, so real job numbering is never shifted by seeding.
//
// Re-running is safe and idempotent: everything is upserted by a fixed id.
//
// Usage:
//   node scripts/seed-test-users.cjs path/to/serviceAccountKey.json
//   node scripts/seed-test-users.cjs path/to/serviceAccountKey.json --users-only
//   node scripts/seed-test-users.cjs path/to/serviceAccountKey.json --delete
//
// NEVER run this against production. The primary guard is
// FIRESTORE_EMULATOR_HOST: this script refuses to run unless it is set,
// full stop. ALLOWED_PROJECTS below is a second check, not the first one —
// ALLOWED_PROJECTS used to list the real project id (so the emulator run
// would pass it), which is exactly backwards: it let this script through
// for the one project it must never touch. Six fake applications and a
// live public job advert ended up in production because of that.

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const crypto = require('crypto');
const path = require('path');

// A tiny real PDF, so the CV zip download (request 10) can actually be tested.
// Reads "TEST CV / Seed data for Autumhire ATS manual QA." on one A4 page.
const TEST_CV_PDF_BASE64 =
  'JVBERi0xLjMKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUgo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagozIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAovQ29udGVudHMgOCAwIFIgL01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCA3IDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9QYWdlTW9kZSAvVXNlTm9uZSAvUGFnZXMgNyAwIFIgL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0F1dGhvciAoYW5vbnltb3VzKSAvQ3JlYXRpb25EYXRlIChEOjIwMjYxMDAyMTQxNjUyKzAzJzAwJykgL0NyZWF0b3IgKGFub255bW91cykgL0tleXdvcmRzICgpIC9Nb2REYXRlIChEOjIwMjYxMDAyMTQxNjUyKzAzJzAwJykgL1Byb2R1Y2VyIChSZXBvcnRMYWIgUERGIExpYnJhcnkgLSBcKG9wZW5zb3VyY2VcKSkgCiAgL1N1YmplY3QgKHVuc3BlY2lmaWVkKSAvVGl0bGUgKHVudGl0bGVkKSAvVHJhcHBlZCAvRmFsc2UKPj4KZW5kb2JqCjcgMCBvYmoKPDwKL0NvdW50IDEgL0tpZHMgWyA0IDAgUiBdIC9UeXBlIC9QYWdlcwo+PgplbmRvYmoKOCAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAyMDUKPj4Kc3RyZWFtCkdhcldwXyRcJTUmLVVALF5MRTVnK2EuQSNrOjYtTUpuNEJtUk9xUi8oLyJIJ2BbRl9OIVhrRlBIJVw6RDkhZScnSlslP004OnQsQ1RhTDksMi5uQWlkLm8zRE1qLUVANSJBYnFYaUg8N19gNk4oaSE0TXVEK0JrU1xsOEhUXk5mTDRMa0UlTVUpYlVcRi11cD5SZmpIRkdXWC1YYTBlZ1tyMCNHZzBwYVcxQFprdW1mWU1dLSdFcXVONW9BUlZRaFhvOWFJWSs5Ni8pfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA5CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTAyIDAwMDAwIG4gCjAwMDAwMDAyMDkgMDAwMDAgbiAKMDAwMDAwMDMyMSAwMDAwMCBuIAowMDAwMDAwNTI0IDAwMDAwIG4gCjAwMDAwMDA1OTIgMDAwMDAgbiAKMDAwMDAwMDg1MyAwMDAwMCBuIAowMDAwMDAwOTEyIDAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIApbPGQ5ODU4OWUxODYyNjE5OGY3MTQ1M2I2YmJkYWZmYWE2PjxkOTg1ODllMTg2MjYxOThmNzE0NTNiNmJiZGFmZmFhNj5dCiUgUmVwb3J0TGFiIGdlbmVyYXRlZCBQREYgZG9jdW1lbnQgLS0gZGlnZXN0IChvcGVuc291cmNlKQoKL0luZm8gNiAwIFIKL1Jvb3QgNSAwIFIKL1NpemUgOQo+PgpzdGFydHhyZWYKMTIwNwolJUVPRgo=';

const keyPath = process.argv[2];
const shouldDelete = process.argv.includes('--delete');
const usersOnly = process.argv.includes('--users-only');

if (!keyPath) {
  console.error('Usage: node scripts/seed-test-users.cjs <serviceAccountKey.json> [--users-only|--delete]');
  process.exit(1);
}

// Primary guard. This script writes fake users, applications and a public
// job advert — it must never run against a real project, emulator or not.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    'Refusing to run: FIRESTORE_EMULATOR_HOST is not set.\n' +
    'Start the Firestore emulator and set FIRESTORE_EMULATOR_HOST (e.g. 127.0.0.1:8080)\n' +
    'before running this script. It never runs against a real project.'
  );
  process.exit(1);
}

// Secondary guard rail. Add a staging project id here; never a production one.
const ALLOWED_PROJECTS = ['autumhire2-4a087'];

const PASSWORD = 'TestPass123!';
const JOB_ID = 'JOB-TEST-9001'; // doc id == referenceNumber, as createJob does

// Screening questions on the test job, so the per-job Excel export (request 12)
// has a real question matrix to render.
const QUESTIONS = [
  { id: 'q_years',  text: 'How many years of hands-on R or Python experience do you have?', type: 'number', mandatory: true,  instructions: '', score: 10 },
  { id: 'q_survey', text: 'Describe your experience with large survey datasets.',           type: 'text',   mandatory: true,  instructions: '', score: 20 },
  { id: 'q_field',  text: 'Do you have East Africa field experience?',                      type: 'text',   mandatory: false, instructions: '', score: 5 },
];

// One answer deliberately contains a comma, a semicolon, double quotes AND a
// newline. That combination is the entire reason request 12 is .xlsx and not CSV,
// and it must survive the export intact.
const TORTURE_ANSWER =
  'Line one, with a comma; a "quoted" phrase\nLine two on a new line';

// Answers per candidate. 'c4' deliberately leaves q_field unanswered, so the
// export can be checked for a blank cell rather than the string "undefined".
const ANSWERS = {
  c1: { q_years: '4',  q_survey: 'Cleaned and analysed LSMS household panels at ILRI.', q_field: 'Yes, Kajiado and Narok.' },
  c2: { q_years: '7',  q_survey: TORTURE_ANSWER,                                        q_field: 'Yes, extensive.' },
  c3: { q_years: '1',  q_survey: 'Limited — coursework only.',                          q_field: 'No' },
  c4: { q_years: '6',  q_survey: 'Statistics Iceland register data, 5 years.' },
  c5: { q_years: '0',  q_survey: 'None',                                                q_field: 'No' },
  c6: { q_years: '3',  q_survey: 'DHS and MICS survey rounds.',                         q_field: 'Yes, Turkana.' },
};

const USERS = [
  { key: 'admin',     email: 'admin@test.autumhire.local',      name: 'Test Admin',          role: 'admin' },
  { key: 'recruiter', email: 'recruiter@test.autumhire.local',  name: 'Test Recruiter',      role: 'recruiter' },
  { key: 'hm',        email: 'hm@test.autumhire.local',         name: 'Test Hiring Manager', role: 'hiring-manager' },
  { key: 'panel1',    email: 'panel1@test.autumhire.local',     name: 'Panel Member One',    role: 'hiring-manager' },
  { key: 'panel2',    email: 'panel2@test.autumhire.local',     name: 'Panel Member Two',    role: 'hiring-manager' },
  // Candidate names are deliberately chosen so A-Z and Z-A differ visibly, and
  // 'Olafur' carries an accent to exercise localeCompare.
  { key: 'c1', email: 'candidate1@test.autumhire.local', name: 'Asha Wanjiru',    role: 'candidate' },
  { key: 'c2', email: 'candidate2@test.autumhire.local', name: 'Brian Otieno',    role: 'candidate' },
  { key: 'c3', email: 'candidate3@test.autumhire.local', name: 'Cynthia Mwangi',  role: 'candidate' },
  { key: 'c4', email: 'candidate4@test.autumhire.local', name: 'Ólafur Jónsson',  role: 'candidate' },
  { key: 'c5', email: 'candidate5@test.autumhire.local', name: 'Zainab Ali',      role: 'candidate' },
  { key: 'c6', email: 'candidate6@test.autumhire.local', name: 'Daniel Kiprop',   role: 'candidate' },
];

// Applications. Ids are fixed so re-seeding overwrites rather than duplicates.
//
// Coverage this gives you:
//   - varied prescreenScore          -> score sort is visibly different
//   - varied daysAgo                 -> date sort is visibly different
//   - APP-TEST-01 unrated            -> "No ratings yet", first-rating path, nulls-last in sort
//   - APP-TEST-02 rated by both      -> avg 2.5 visible to panel1/panel2, HIDDEN from hm
//   - APP-TEST-03 rated by panel1    -> avg 1.0, exercises the red colour band
//   - APP-TEST-06 status 'applied'   -> must NOT appear on the shortlisting page
//   - cv: true uploads a real test PDF so the CV zip download (request 10) has
//     something to fetch. APP-TEST-03 and 05 deliberately have NO cv, so the
//     skip-don't-fail path is exercised in the same run.
const APPLICATIONS = [
  { id: 'APP-TEST-01', user: 'c1', status: 'longlisted',  prescreenScore: 72, daysAgo: 3,  cv: true,  ratings: [] },
  { id: 'APP-TEST-02', user: 'c2', status: 'longlisted',  prescreenScore: 91, daysAgo: 9,  cv: true,  ratings: [{ by: 'panel1', score: 3 }, { by: 'panel2', score: 2 }] },
  { id: 'APP-TEST-03', user: 'c3', status: 'longlisted',  prescreenScore: 48, daysAgo: 1,  cv: false, ratings: [{ by: 'panel1', score: 1, comment: 'No relevant sector experience.' }] },
  { id: 'APP-TEST-04', user: 'c4', status: 'shortlisted', prescreenScore: 85, daysAgo: 14, cv: true,  ratings: [{ by: 'panel1', score: 3 }, { by: 'panel2', score: 3 }] },
  { id: 'APP-TEST-05', user: 'c5', status: 'rejected',    prescreenScore: 31, daysAgo: 20, cv: false, ratings: [] },
  { id: 'APP-TEST-06', user: 'c6', status: 'applied',     prescreenScore: 66, daysAgo: 2,  cv: true,  ratings: [] },
];

const serviceAccount = require(path.resolve(keyPath));

if (!ALLOWED_PROJECTS.includes(serviceAccount.project_id)) {
  console.error(
    `Refusing to run against project "${serviceAccount.project_id}".\n` +
    `Add it to ALLOWED_PROJECTS in this script only if it is a dev or staging project.`
  );
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

const uids = {}; // key -> uid
const round1 = (n) => Math.round(n * 10) / 10;
const daysAgoTs = (d) => Timestamp.fromDate(new Date(Date.now() - d * 86400000));

async function upsertUser(spec) {
  let user;
  try {
    user = await auth.getUserByEmail(spec.email);
    await auth.updateUser(user.uid, { password: PASSWORD, displayName: spec.name, emailVerified: true });
    console.log(`  updated  ${spec.email.padEnd(38)} ${spec.role}`);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    user = await auth.createUser({ email: spec.email, password: PASSWORD, displayName: spec.name, emailVerified: true });
    console.log(`  created  ${spec.email.padEnd(38)} ${spec.role}`);
  }

  // Shape matches AuthContext.signup() exactly.
  await db.collection('Users').doc(user.uid).set(
    { name: spec.name, email: spec.email, role: spec.role, createdAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  await auth.setCustomUserClaims(user.uid, { role: spec.role });

  uids[spec.key] = user.uid;
  return user.uid;
}

const BUCKET = 'autumhire2-4a087.firebasestorage.app';

/**
 * Uploads the embedded test PDF to the path storage.rules expects for an
 * application document, and returns a Firebase download URL for it.
 *
 * The download URL needs a token in the object's metadata; the Admin SDK does
 * not mint one, so we set firebaseStorageDownloadTokens ourselves and build the
 * URL the same way getDownloadURL() would.
 */
async function uploadTestCv(jobId, candidateId, candidateName) {
  const token = crypto.randomUUID();
  const objectPath = `applications/${jobId}/${candidateId}/cv-test.pdf`;
  const file = getStorage().bucket(BUCKET).file(objectPath);

  await file.save(Buffer.from(TEST_CV_PDF_BASE64, 'base64'), {
    contentType: 'application/pdf',
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/` +
    `${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

async function seedJob() {
  await db.collection('Jobs').doc(JOB_ID).set({
    referenceNumber: JOB_ID,
    title: 'Research Data Analyst (TEST)',
    department: 'Research Methods',
    location: 'Nairobi, Kenya',
    jobType: 'Full-time',
    remoteType: 'Hybrid',
    description:
      '<p>Seed data for manual QA. Supports the livestock research programme with data ' +
      'cleaning, analysis and reporting.</p><p><strong>Requirements:</strong> degree in ' +
      'statistics or a related field, 3+ years with R or Python, experience with survey data.</p>',
    shortlistingCriteria:
      'Degree in statistics, data science or related. Minimum 3 years hands-on R or Python. ' +
      'Prior work with large survey datasets. East Africa field experience preferred.',
    status: 'Active',
    advertType: 'external',
    isConfidential: false,
    showOnCareerSite: true,
    isFeatured: false,
    requireResume: true,
    requireCoverLetter: false,
    questions: QUESTIONS,
    hiringTeam: [
      { id: uids.panel1, name: 'Panel Member One', email: 'panel1@test.autumhire.local', role: 'hiring-manager' },
      { id: uids.panel2, name: 'Panel Member Two', email: 'panel2@test.autumhire.local', role: 'hiring-manager' },
    ],
    closingDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    createdBy: uids.admin,
    createdByName: 'Test Admin',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    postedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`  job      ${JOB_ID}  Research Data Analyst (TEST)`);
}

async function seedApplication(spec) {
  const u = USERS.find((x) => x.key === spec.user);
  const appliedAt = daysAgoTs(spec.daysAgo);

  let cvFields = {};
  if (spec.cv) {
    try {
      const cvUrl = await uploadTestCv(JOB_ID, uids[spec.user], u.name);
      cvFields = { cvUrl, cvFileName: `${u.name.replace(/\s+/g, '_')}_CV.pdf` };
    } catch (e) {
      console.warn(`    CV upload failed for ${u.name}: ${e.message}`);
    }
  }

  const scores = spec.ratings.map((r) => r.score);
  const avg = scores.length ? round1(scores.reduce((s, v) => s + v, 0) / scores.length) : null;

  await db.collection('Applications').doc(spec.id).set({
    jobId: JOB_ID,
    jobTitle: 'Research Data Analyst (TEST)',
    department: 'Research Methods',
    candidateId: uids[spec.user],
    candidateName: u.name,
    email: u.email,
    phone: '+254700000000',
    gender: spec.user === 'c1' || spec.user === 'c3' || spec.user === 'c5' ? 'Female' : 'Male',
    nationality: 'Kenyan',
    city: 'Nairobi',
    country: 'Kenya',
    isInternal: false,
    workedHereBefore: false,
    source: 'Seed script',
    ...cvFields,
    answers: QUESTIONS
      .filter((q) => (ANSWERS[spec.user] ?? {})[q.id] !== undefined)
      .map((q) => ({
        questionId: q.id,
        question: q.text,
        answer: ANSWERS[spec.user][q.id],
        score: 0,
      })),
    prescreenScore: spec.prescreenScore,
    status: spec.status,
    statusHistory: [
      { status: 'applied', byId: uids[spec.user], byName: u.name, comment: 'Seeded', at: appliedAt },
      ...(spec.status !== 'applied'
        ? [{ status: spec.status, byId: uids.recruiter, byName: 'Test Recruiter', comment: 'Seeded', at: appliedAt }]
        : []),
    ],
    consentGiven: true,
    archived: false,
    // Denormalised aggregate, kept consistent with the ratings written below.
    panelRatingAvg: avg,
    panelRatingCount: scores.length,
    appliedAt,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // Clear any ratings from a previous run so the aggregate cannot drift.
  const existing = await db.collection('Applications').doc(spec.id).collection('ratings').get();
  await Promise.all(existing.docs.map((d) => d.ref.delete()));

  for (const r of spec.ratings) {
    const panelist = USERS.find((x) => x.key === r.by);
    await db.collection('Applications').doc(spec.id).collection('ratings').doc(uids[r.by]).set({
      panelistId: uids[r.by],
      panelistName: panelist.name,
      score: r.score,
      ...(r.comment ? { comment: r.comment } : {}),
      stage: 'shortlisting',
      ratedAt: appliedAt,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const ratingNote = scores.length ? `avg ${avg} from ${scores.length}` : 'unrated';
  const cvNote = cvFields.cvUrl ? 'CV' : 'no CV';
  console.log(`  app      ${spec.id}  ${u.name.padEnd(16)} ${spec.status.padEnd(12)} score ${spec.prescreenScore}  ${ratingNote.padEnd(16)} ${cvNote}`);
}

async function deleteAll() {
  for (const spec of APPLICATIONS) {
    const ref = db.collection('Applications').doc(spec.id);
    const subs = await ref.collection('ratings').get();
    await Promise.all(subs.docs.map((d) => d.ref.delete()));
    const comments = await ref.collection('comments').get();
    await Promise.all(comments.docs.map((d) => d.ref.delete()));
    await ref.delete();
    console.log(`  deleted  ${spec.id}`);
  }
  await db.collection('Jobs').doc(JOB_ID).delete();
  console.log(`  deleted  ${JOB_ID}`);

  try {
    const [files] = await getStorage().bucket(BUCKET).getFiles({ prefix: `applications/${JOB_ID}/` });
    await Promise.all(files.map((f) => f.delete()));
    console.log(`  deleted  ${files.length} uploaded test CV(s)`);
  } catch (e) {
    console.warn(`  CV cleanup failed: ${e.message}`);
  }

  for (const spec of USERS) {
    try {
      const user = await auth.getUserByEmail(spec.email);
      await db.collection('Users').doc(user.uid).delete();
      await auth.deleteUser(user.uid);
      console.log(`  deleted  ${spec.email}`);
    } catch (e) {
      if (e.code === 'auth/user-not-found') console.log(`  absent   ${spec.email}`);
      else console.warn(`  FAILED   ${spec.email}: ${e.message}`);
    }
  }
}

(async () => {
  console.log(`Project: ${serviceAccount.project_id}\n`);

  if (shouldDelete) {
    console.log('Deleting seed data…\n');
    await deleteAll();
    console.log('\nDone.');
    process.exit(0);
  }

  console.log('Users');
  for (const spec of USERS) {
    try { await upsertUser(spec); }
    catch (e) { console.error(`  FAILED   ${spec.email}: ${e.message}`); }
  }

  if (!usersOnly) {
    console.log('\nJob');
    await seedJob();
    console.log('\nApplications');
    for (const spec of APPLICATIONS) {
      try { await seedApplication(spec); }
      catch (e) { console.error(`  FAILED   ${spec.id}: ${e.message}`); }
    }
  }

  console.log(`\nDone. Password for every test user: ${PASSWORD}`);
  console.log('\nWave C walkthrough:');
  console.log('  1. Log in as hm@       -> APP-TEST-02 shows "2 rated" and NO average (isolation holds)');
  console.log('  2. Rate it 2           -> average appears as 2.3 from 3, breakdown on hover');
  console.log('  3. Log in as panel1@   -> APP-TEST-02 shows the average immediately (already rated)');
  console.log('  4. Sort by rating      -> APP-TEST-01 and 05 sit last in BOTH directions (unrated)');
  console.log('  5. Sort by name        -> Olafur orders correctly against O, not after Z');
  console.log('  6. APP-TEST-06         -> must NOT appear at all (status "applied")');
  console.log('\nWave D walkthrough:');
  console.log('  7. Job Adverts         -> click Applications on JOB-TEST-9001, list filters to it');
  console.log('  8. Download all CVs    -> 4 zipped, 2 skipped (Cynthia and Zainab have no CV)');
  console.log('  9. Filenames inside    -> JOB-TEST-9001_Asha_Wanjiru_CV.pdf and friends');
  console.log(' 10. Reports > Excel     -> 3 question columns; Brian\'s survey answer holds a');
  console.log('                            comma, quotes AND a newline, all intact. Olafur has');
  console.log('                            a BLANK field-experience cell, not "undefined".');
  process.exit(0);
})();
