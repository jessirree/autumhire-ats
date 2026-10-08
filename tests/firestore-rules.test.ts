import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

// Fixed uids so the assertions read clearly.
const ADMIN = 'uid-admin';
const RECRUITER = 'uid-recruiter';
const PANEL1 = 'uid-panel1';
const PANEL2 = 'uid-panel2';
const CANDIDATE = 'uid-candidate';
const CANDIDATE2 = 'uid-candidate2';
const APP = 'APP-TEST-01';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-autumhire',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // isStaff()/isAdmin() resolve the role (and now status) with a get() against
  // Users/{uid}, so those documents must exist or every staff rule evaluates
  // false. This is exactly what the Console Playground could not do.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'Users', ADMIN), { role: 'admin', name: 'Admin' });
    // RECRUITER deliberately has NO status field — this is the
    // backward-compatibility fixture for S3's "no status at all" case.
    await setDoc(doc(db, 'Users', RECRUITER), { role: 'recruiter', name: 'Recruiter' });
    await setDoc(doc(db, 'Users', PANEL1), { role: 'hiring-manager', name: 'Panel One' });
    await setDoc(doc(db, 'Users', PANEL2), { role: 'hiring-manager', name: 'Panel Two' });
    await setDoc(doc(db, 'Users', CANDIDATE), { role: 'candidate', name: 'Candidate' });
    await setDoc(doc(db, 'Users', CANDIDATE2), { role: 'candidate', name: 'Candidate Two' });

    await setDoc(doc(db, 'Applications', APP), {
      jobId: 'JOB-TEST-9001',
      candidateId: CANDIDATE,
      candidateName: 'Asha Wanjiru',
      status: 'longlisted',
      prescreenScore: 72,
      consentGiven: true,
    });
  });
});

const rating = (panelistId: string, score: unknown) => ({
  panelistId,
  panelistName: 'Panel',
  score,
  stage: 'shortlisting',
});

// ── Baseline regression: panel ratings (from docs/rules-testing-setup.md) ──
describe('Applications/{id}/ratings', () => {
  it('a panelist may write their own rating', async () => {
    const db = testEnv.authenticatedContext(PANEL1).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'Applications', APP, 'ratings', PANEL1), rating(PANEL1, 3))
    );
  });

  // The P0. One panel member silently overwriting another's score.
  it('a panelist may NOT write at another panelist id', async () => {
    const db = testEnv.authenticatedContext(PANEL1).firestore();
    await assertFails(
      setDoc(doc(db, 'Applications', APP, 'ratings', PANEL2), rating(PANEL2, 3))
    );
  });

  it('the document id and the panelistId field must agree', async () => {
    const db = testEnv.authenticatedContext(PANEL1).firestore();
    await assertFails(
      setDoc(doc(db, 'Applications', APP, 'ratings', PANEL1), rating(PANEL2, 3))
    );
  });

  it('rejects a score below 1', async () => {
    const db = testEnv.authenticatedContext(PANEL1).firestore();
    await assertFails(
      setDoc(doc(db, 'Applications', APP, 'ratings', PANEL1), rating(PANEL1, 0))
    );
  });

  it('rejects a score above 3', async () => {
    const db = testEnv.authenticatedContext(PANEL1).firestore();
    await assertFails(
      setDoc(doc(db, 'Applications', APP, 'ratings', PANEL1), rating(PANEL1, 4))
    );
  });

  // Tests `is int`, not just the range. "3" passes a naive >= 1 && <= 3.
  it('rejects a score that is a string', async () => {
    const db = testEnv.authenticatedContext(PANEL1).firestore();
    await assertFails(
      setDoc(doc(db, 'Applications', APP, 'ratings', PANEL1), rating(PANEL1, '3'))
    );
  });

  it('a candidate may not read panel ratings about themselves', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'Applications', APP, 'ratings', PANEL1),
        rating(PANEL1, 3)
      );
    });
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertFails(getDoc(doc(db, 'Applications', APP, 'ratings', PANEL1)));
  });

  it('a panelist may not delete another panelist rating', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'Applications', APP, 'ratings', PANEL1),
        rating(PANEL1, 3)
      );
    });
    const db = testEnv.authenticatedContext(PANEL2).firestore();
    await assertFails(deleteDoc(doc(db, 'Applications', APP, 'ratings', PANEL1)));
  });

  it('a panelist may delete their own rating', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'Applications', APP, 'ratings', PANEL1),
        rating(PANEL1, 3)
      );
    });
    const db = testEnv.authenticatedContext(PANEL1).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'Applications', APP, 'ratings', PANEL1)));
  });

  it('a signed-out user may not write a rating', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(db, 'Applications', APP, 'ratings', PANEL1), rating(PANEL1, 3))
    );
  });
});

// ── S1 — any new account can make itself an admin ──────────────────────
describe('Users create (S1 — self-elevation to admin)', () => {
  it('a signed-in user may create their own Users doc as candidate', async () => {
    const db = testEnv.authenticatedContext('uid-new').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'Users', 'uid-new'), { role: 'candidate', name: 'New' })
    );
  });

  it('a signed-in user may NOT create their own Users doc as admin', async () => {
    const db = testEnv.authenticatedContext('uid-new').firestore();
    await assertFails(
      setDoc(doc(db, 'Users', 'uid-new'), { role: 'admin', name: 'New' })
    );
  });

  it('a signed-in user may NOT create their own Users doc as recruiter', async () => {
    const db = testEnv.authenticatedContext('uid-new').firestore();
    await assertFails(
      setDoc(doc(db, 'Users', 'uid-new'), { role: 'recruiter', name: 'New' })
    );
  });

  it('a signed-in user may NOT create their own Users doc as hiring-manager', async () => {
    const db = testEnv.authenticatedContext('uid-new').firestore();
    await assertFails(
      setDoc(doc(db, 'Users', 'uid-new'), { role: 'hiring-manager', name: 'New' })
    );
  });

  it('an admin may create another user doc with any role', async () => {
    const db = testEnv.authenticatedContext(ADMIN).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'Users', 'uid-new'), { role: 'recruiter', name: 'New' })
    );
  });

  it('a non-admin may not create a document at someone else’s uid', async () => {
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertFails(
      setDoc(doc(db, 'Users', 'uid-someone-else'), { role: 'candidate', name: 'X' })
    );
  });
});

// ── S2 — any candidate can read every other candidate's PII and CV ─────
describe('Users read (S2 — candidate PII and CV leak)', () => {
  it('a candidate may read their own Users doc', async () => {
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertSucceeds(getDoc(doc(db, 'Users', CANDIDATE)));
  });

  it('a candidate may NOT read another candidate’s Users doc', async () => {
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertFails(getDoc(doc(db, 'Users', CANDIDATE2)));
  });

  it('a candidate may NOT read a recruiter’s Users doc', async () => {
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertFails(getDoc(doc(db, 'Users', RECRUITER)));
  });

  it('a recruiter may read a candidate’s Users doc', async () => {
    const db = testEnv.authenticatedContext(RECRUITER).firestore();
    await assertSucceeds(getDoc(doc(db, 'Users', CANDIDATE)));
  });

  it('a signed-out user may NOT read any Users doc', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'Users', CANDIDATE)));
  });
});

// ── S3 — deactivation is cosmetic ───────────────────────────────────────
describe('Deactivation (S3 — isActive gating)', () => {
  it('an inactive recruiter may NOT read Applications', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'Users', RECRUITER), { status: 'inactive' });
    });
    const db = testEnv.authenticatedContext(RECRUITER).firestore();
    await assertFails(getDoc(doc(db, 'Applications', APP)));
  });

  it('an inactive recruiter may still read their own Users doc (deliberate exception)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'Users', RECRUITER), { status: 'inactive' });
    });
    const db = testEnv.authenticatedContext(RECRUITER).firestore();
    await assertSucceeds(getDoc(doc(db, 'Users', RECRUITER)));
  });

  it('an inactive candidate may NOT create an Application', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'Users', CANDIDATE2), { status: 'inactive' });
    });
    const db = testEnv.authenticatedContext(CANDIDATE2).firestore();
    await assertFails(
      setDoc(doc(db, 'Applications', 'APP-NEW'), {
        jobId: 'JOB-TEST-9001',
        candidateId: CANDIDATE2,
        candidateName: 'X',
        status: 'applied',
        consentGiven: true,
      })
    );
  });

  // The backward-compatibility case. RECRUITER was seeded above with no
  // `status` field at all — accounts created before this field existed must
  // keep working exactly as if they were active.
  it('a user with no status field at all behaves exactly as active', async () => {
    const db = testEnv.authenticatedContext(RECRUITER).firestore();
    await assertSucceeds(getDoc(doc(db, 'Applications', APP)));
  });
});

// ── S4 — JobAlerts has no match block ───────────────────────────────────
describe('JobAlerts (S4 — missing match block)', () => {
  it('a candidate may create JobAlerts/{own uid}', async () => {
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'JobAlerts', CANDIDATE), { subscribedAt: '2026-10-03' })
    );
  });

  it('a candidate may NOT create JobAlerts/{another uid}', async () => {
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertFails(
      setDoc(doc(db, 'JobAlerts', CANDIDATE2), { subscribedAt: '2026-10-03' })
    );
  });

  it('a recruiter may list the whole JobAlerts collection', async () => {
    const db = testEnv.authenticatedContext(RECRUITER).firestore();
    await assertSucceeds(getDocs(collection(db, 'JobAlerts')));
  });

  it('a candidate may NOT list the whole JobAlerts collection', async () => {
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertFails(getDocs(collection(db, 'JobAlerts')));
  });
});

// ── AuditLog regression (F8) — already fixed, guarded against regressing ──
describe('AuditLog (F8 regression)', () => {
  it('a user may create an audit entry with their own actorId', async () => {
    const db = testEnv.authenticatedContext(RECRUITER).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'AuditLog'), {
        actorId: RECRUITER,
        actorName: 'Recruiter',
        action: 'update',
        entity: 'Application',
        entityId: APP,
        detail: 'x',
      })
    );
  });

  it('a user may NOT create an audit entry with a forged actorId', async () => {
    const db = testEnv.authenticatedContext(RECRUITER).firestore();
    await assertFails(
      addDoc(collection(db, 'AuditLog'), {
        actorId: ADMIN,
        actorName: 'Admin',
        action: 'update',
        entity: 'Application',
        entityId: APP,
        detail: 'forged',
      })
    );
  });

  it('a candidate may create an audit entry for their own action (apply)', async () => {
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'AuditLog'), {
        actorId: CANDIDATE,
        actorName: 'Candidate',
        action: 'apply',
        entity: 'Application',
        entityId: APP,
        detail: 'x',
      })
    );
  });

  it('an admin may read the AuditLog collection', async () => {
    const db = testEnv.authenticatedContext(ADMIN).firestore();
    await assertSucceeds(getDocs(collection(db, 'AuditLog')));
  });

  it('a non-admin may NOT read the AuditLog collection', async () => {
    const db = testEnv.authenticatedContext(RECRUITER).firestore();
    await assertFails(getDocs(collection(db, 'AuditLog')));
  });

  it('nobody, including admin, may update or delete an existing audit entry', async () => {
    let entryId = '';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), 'AuditLog'), {
        actorId: RECRUITER,
        actorName: 'Recruiter',
        action: 'update',
        entity: 'Application',
        entityId: APP,
        detail: 'x',
      });
      entryId = ref.id;
    });
    const db = testEnv.authenticatedContext(ADMIN).firestore();
    await assertFails(updateDoc(doc(db, 'AuditLog', entryId), { detail: 'edited' }));
    await assertFails(deleteDoc(doc(db, 'AuditLog', entryId)));
  });
});

// ── F0 §0 — Notifications create was an open relay ──────────────────────
describe('Notifications create (F0 §0 — open relay)', () => {
  it('a candidate may create a notification addressed to themselves', async () => {
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'Notifications'), {
        userId: CANDIDATE,
        title: 'x',
        body: 'x',
        type: 'application-received',
        createdById: CANDIDATE,
      })
    );
  });

  // The open relay this rule exists to close: before this fix, any signed-in
  // candidate could plant a Notifications doc addressed to someone else.
  it('a candidate may NOT create a notification addressed to another user', async () => {
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertFails(
      addDoc(collection(db, 'Notifications'), {
        userId: CANDIDATE2,
        title: 'x',
        body: 'x',
        type: 'general',
        createdById: CANDIDATE,
      })
    );
  });

  it('a candidate may NOT forge createdById as someone else, even when userId is their own', async () => {
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertFails(
      addDoc(collection(db, 'Notifications'), {
        userId: CANDIDATE,
        title: 'x',
        body: 'x',
        type: 'general',
        createdById: ADMIN,
      })
    );
  });

  // Acceptance criterion 7, second half: the rule only controls WHO a
  // non-staff write is addressed to by uid. An arbitrary `email` field is
  // allowed through at this layer — the future sender (F0b) is what ignores
  // it and resolves the real address itself, never trusting a client-
  // supplied email from a non-staff creator.
  it('a candidate may write an arbitrary email field onto their own notification (the sender ignores it, not this rule)', async () => {
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'Notifications'), {
        userId: CANDIDATE,
        email: 'someone-else@example.com',
        title: 'x',
        body: 'x',
        type: 'general',
        createdById: CANDIDATE,
      })
    );
  });

  it('staff may create a notification addressed to any user', async () => {
    const db = testEnv.authenticatedContext(RECRUITER).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'Notifications'), {
        userId: CANDIDATE,
        title: 'x',
        body: 'x',
        type: 'status-update',
        createdById: RECRUITER,
      })
    );
  });

  it('a signed-out user may NOT create a notification', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      addDoc(collection(db, 'Notifications'), {
        userId: CANDIDATE,
        title: 'x',
        body: 'x',
        type: 'general',
        createdById: CANDIDATE,
      })
    );
  });
});

// ── BioData read — null `resource` on a not-yet-submitted document ──────
describe('BioData read (clean negative, not a thrown error)', () => {
  it('a candidate checking their own not-yet-submitted bio-data gets a clean negative', async () => {
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    const snap = await assertSucceeds(getDoc(doc(db, 'BioData', APP)));
    expect(snap.exists()).toBe(false);
  });

  it('a candidate may read their own existing bio-data', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'BioData', APP), {
        candidateId: CANDIDATE,
        applicationId: APP,
      });
    });
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    const snap = await assertSucceeds(getDoc(doc(db, 'BioData', APP)));
    expect(snap.exists()).toBe(true);
  });

  // Regression guard: the null-resource fix must not widen access to a
  // real document belonging to someone else.
  it('a different candidate may NOT read that bio-data once it exists', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'BioData', APP), {
        candidateId: CANDIDATE,
        applicationId: APP,
      });
    });
    const db = testEnv.authenticatedContext(CANDIDATE2).firestore();
    await assertFails(getDoc(doc(db, 'BioData', APP)));
  });

  it('staff may read bio-data that does not exist yet', async () => {
    const db = testEnv.authenticatedContext(RECRUITER).firestore();
    const snap = await assertSucceeds(getDoc(doc(db, 'BioData', APP)));
    expect(snap.exists()).toBe(false);
  });
});

// ── Offers — respondToOffer's notification moved server-side ────────────
describe('Offers (candidate response notification moved to a Cloud Function)', () => {
  const OFFER = 'OFFER-TEST-01';

  const seedOffer = () =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'Offers', OFFER), {
        applicationId: APP,
        jobId: 'JOB-TEST-9001',
        jobTitle: 'Research Data Analyst',
        candidateId: CANDIDATE,
        candidateName: 'Asha Wanjiru',
        candidateEmail: 'asha@example.com',
        status: 'sent',
        createdById: RECRUITER,
        createdByName: 'Recruiter',
      });
    });

  // This is deliberately denied, same as the general open-relay case above —
  // a non-staff client still cannot address a notification to someone else.
  // respondToOffer used to do exactly this (addressed to offer.createdById)
  // and relied on it succeeding; it was silently broken by the F0 §0 fix.
  // The replacement is notifyOfferResponse (functions/offerNotifications.js),
  // a Cloud Function using the Admin SDK, which bypasses this rule entirely.
  // A future reader must not see this test pass and conclude the
  // notification doesn't need to exist anywhere — it does, just not here.
  it('a candidate may NOT notify the offer owner directly — delivery is server-side now', async () => {
    await seedOffer();
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertFails(
      addDoc(collection(db, 'Notifications'), {
        userId: RECRUITER,
        title: 'Offer accepted',
        body: 'x',
        type: 'offer',
        createdById: CANDIDATE,
      })
    );
  });

  it('a candidate may flip their own sent offer to accepted, setting respondedByCandidate in the same write', async () => {
    await seedOffer();
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'Offers', OFFER), {
        status: 'accepted',
        respondedByCandidate: true,
        updatedAt: new Date(),
      })
    );
  });

  // Regression guard: adding respondedByCandidate to the allowed field list
  // must not accidentally widen it further — any other field in the same
  // write is still denied.
  it('a candidate may NOT smuggle another field in alongside status and respondedByCandidate', async () => {
    await seedOffer();
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertFails(
      updateDoc(doc(db, 'Offers', OFFER), {
        status: 'accepted',
        respondedByCandidate: true,
        salary: '999999',
        updatedAt: new Date(),
      })
    );
  });
});

// ── Interviews/{id}/scores — G6, the identical ratings race, in a new place ──
describe('Interviews/{id}/scores (G6 — panel score subcollection)', () => {
  const INTERVIEW = 'INTERVIEW-TEST-01';

  const panelScore = (panelistId: string, score: unknown) => ({
    panelistId,
    panelistName: 'Panel',
    score,
  });

  const seedInterview = () =>
    testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'Interviews', INTERVIEW), {
        applicationId: APP,
        jobId: 'JOB-TEST-9001',
        jobTitle: 'Research Data Analyst',
        candidateId: CANDIDATE,
        candidateName: 'Asha Wanjiru',
        candidateEmail: 'asha@example.com',
        scheduledAt: new Date().toISOString(),
        panel: [{ id: PANEL1, name: 'Panel One' }, { id: PANEL2, name: 'Panel Two' }],
        questions: [],
        scores: [],
        status: 'scheduled',
      });
    });

  it('a panellist may write their own score', async () => {
    await seedInterview();
    const db = testEnv.authenticatedContext(PANEL1).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'Interviews', INTERVIEW, 'scores', PANEL1), panelScore(PANEL1, 85))
    );
  });

  // The identical race recordPanelScore used to lose: two panellists each
  // writing the whole array from their own stale copy, second write wins. A
  // panellist-id-keyed document makes that impossible by construction.
  it('a panellist may NOT write at another panellist id', async () => {
    const db = testEnv.authenticatedContext(PANEL1).firestore();
    await assertFails(
      setDoc(doc(db, 'Interviews', INTERVIEW, 'scores', PANEL2), panelScore(PANEL2, 85))
    );
  });

  it('the document id and the panelistId field must agree', async () => {
    const db = testEnv.authenticatedContext(PANEL1).firestore();
    await assertFails(
      setDoc(doc(db, 'Interviews', INTERVIEW, 'scores', PANEL1), panelScore(PANEL2, 85))
    );
  });

  it('rejects a score below 0', async () => {
    const db = testEnv.authenticatedContext(PANEL1).firestore();
    await assertFails(
      setDoc(doc(db, 'Interviews', INTERVIEW, 'scores', PANEL1), panelScore(PANEL1, -1))
    );
  });

  it('rejects a score above 100', async () => {
    const db = testEnv.authenticatedContext(PANEL1).firestore();
    await assertFails(
      setDoc(doc(db, 'Interviews', INTERVIEW, 'scores', PANEL1), panelScore(PANEL1, 101))
    );
  });

  it('rejects a score that is a string', async () => {
    const db = testEnv.authenticatedContext(PANEL1).firestore();
    await assertFails(
      setDoc(doc(db, 'Interviews', INTERVIEW, 'scores', PANEL1), panelScore(PANEL1, '85'))
    );
  });

  // The second reason to prefer a subcollection over a transaction on the
  // parent array: it is never returned by a read of the parent document, so
  // the candidate's own-Interview read (allowed, for their schedule) cannot
  // also hand them the panel's scores the way the old array field did.
  it('a candidate may NOT read the scores subcollection of their own interview', async () => {
    await seedInterview();
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertFails(getDocs(collection(db, 'Interviews', INTERVIEW, 'scores')));
  });

  it('a candidate may still read the parent Interview document itself', async () => {
    await seedInterview();
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertSucceeds(getDoc(doc(db, 'Interviews', INTERVIEW)));
  });
});

// ── Skills taxonomy (candidate-matching spec §2.1, step 1) ──────────────
describe('Skills', () => {
  it('staff may read the Skills collection', async () => {
    const db = testEnv.authenticatedContext(RECRUITER).firestore();
    await assertSucceeds(getDocs(collection(db, 'Skills')));
  });

  it('a candidate may read the Skills collection (the profile typeahead needs it)', async () => {
    const db = testEnv.authenticatedContext(CANDIDATE).firestore();
    await assertSucceeds(getDocs(collection(db, 'Skills')));
  });

  it('a deactivated user may NOT read the Skills collection', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'Users', CANDIDATE2), { status: 'inactive' });
    });
    const db = testEnv.authenticatedContext(CANDIDATE2).firestore();
    await assertFails(getDocs(collection(db, 'Skills')));
  });

  it('an admin may create a skill', async () => {
    const db = testEnv.authenticatedContext(ADMIN).firestore();
    await assertSucceeds(addDoc(collection(db, 'Skills'), { name: 'JavaScript', active: true }));
  });

  it('a non-admin staff member may NOT create a skill', async () => {
    const db = testEnv.authenticatedContext(RECRUITER).firestore();
    await assertFails(addDoc(collection(db, 'Skills'), { name: 'JavaScript', active: true }));
  });

  it('an admin may deactivate a skill', async () => {
    let skillId = '';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), 'Skills'), { name: 'Python', active: true });
      skillId = ref.id;
    });
    const db = testEnv.authenticatedContext(ADMIN).firestore();
    await assertSucceeds(updateDoc(doc(db, 'Skills', skillId), { active: false }));
  });

  it('a non-admin staff member may NOT update a skill', async () => {
    let skillId = '';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), 'Skills'), { name: 'Python', active: true });
      skillId = ref.id;
    });
    const db = testEnv.authenticatedContext(RECRUITER).firestore();
    await assertFails(updateDoc(doc(db, 'Skills', skillId), { active: false }));
  });
});

// ── Sweep: the control that stops instance seven ────────────────────────
describe('Rule coverage sweep', () => {
  it('every top-level collection written anywhere in src/ has a match block in firestore.rules', () => {
    const rulesText = readFileSync('firestore.rules', 'utf8');
    const ruledCollections = new Set(
      [...rulesText.matchAll(/match\s+\/([A-Za-z0-9_]+)\/\{/g)].map((m) => m[1])
    );

    const files = execSync('git ls-files src', { encoding: 'utf8' })
      .split('\n')
      .filter((f) => /\.(ts|tsx)$/.test(f) && f.trim().length > 0);

    const writtenCollections = new Set<string>();
    for (const file of files) {
      const text = readFileSync(file, 'utf8');

      // Local `const X = 'CollectionName';` aliases — this codebase's
      // convention (e.g. `const COL = 'Applications';`) means most calls
      // pass an identifier, not a literal, as the collection name.
      const localConsts = new Map<string, string>();
      for (const m of text.matchAll(/const\s+([A-Za-z_]\w*)\s*=\s*['"]([A-Za-z0-9_]+)['"]/g)) {
        localConsts.set(m[1], m[2]);
      }

      // `collection(db, <X>` / `doc(db, <X>` where <X> is a quoted literal
      // or a bare identifier resolved against the local consts above.
      const callPattern = /\b(?:collection|doc)\(\s*db\s*,\s*(['"]([A-Za-z0-9_]+)['"]|[A-Za-z_]\w*)/g;
      for (const m of text.matchAll(callPattern)) {
        const literal = m[2];
        if (literal) {
          writtenCollections.add(literal);
        } else {
          const resolved = localConsts.get(m[1]);
          if (resolved) writtenCollections.add(resolved);
        }
      }
    }

    const missing = [...writtenCollections].filter((c) => !ruledCollections.has(c)).sort();
    expect(
      missing,
      `Collections written in src/ with no firestore.rules match block: ${missing.join(', ') || '(none)'}`
    ).toEqual([]);
  });
});
