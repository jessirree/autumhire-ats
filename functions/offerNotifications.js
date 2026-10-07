const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

/**
 * "The hiring manager" for an offer's job, in priority order:
 *   1. The named owner of the requisition it was posted from (set in Wave B
 *      — the most authoritative source, since a recruiter can raise a
 *      requisition on a hiring manager's behalf).
 *   2. Whoever on the job's hiring team has the hiring-manager role.
 *   3. The job's coordinator, then whoever created it.
 * Returns null if none of those resolve — the caller skips rather than
 * guessing a recipient.
 */
async function resolveHiringManagerId(jobId) {
  const db = getFirestore();
  const jobSnap = await db.collection('Jobs').doc(jobId).get();
  if (!jobSnap.exists) return null;
  const job = jobSnap.data();

  if (job.requisitionId) {
    const reqSnap = await db.collection('Requisitions').doc(job.requisitionId).get();
    if (reqSnap.exists && reqSnap.data().hiringManagerId) {
      return reqSnap.data().hiringManagerId;
    }
  }

  const hiringTeamManager = (job.hiringTeam || []).find((m) => m.role === 'hiring-manager');
  if (hiringTeamManager) return hiringTeamManager.id;

  return job.coordinatorId || job.createdBy || null;
}

/**
 * Delivers the "candidate responded to an offer" notification server-side.
 *
 * respondToOffer (src/services/offerService.ts) used to write this
 * notification from the candidate's own client, addressed to
 * offer.createdById. The Notifications create rule only allows a non-staff
 * client to address a notification to itself, so that write was silently
 * denied the moment the rule was tightened to close the F0 open relay — the
 * candidate's accept/decline updated the offer but notified nobody.
 *
 * Moving it here fixes that (the Admin SDK bypasses rules) and fixes row 9.2
 * properly at the same time: the recipient is resolved to the actual hiring
 * manager, not whoever happens to be offer.createdById.
 *
 * respondedByCandidate is what tells this apart from a staff-recorded
 * decision (recordOfferDecision, via OffersPage) — that path already
 * notifies client-side as a staff action, which the rule allows; firing here
 * too would double it.
 */
exports.notifyOfferResponse = onDocumentUpdated('Offers/{offerId}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;

  if (!after.respondedByCandidate || before.respondedByCandidate) return;
  if (before.status === after.status) return;
  if (!['accepted', 'rejected'].includes(after.status)) return;

  const offerId = event.params.offerId;
  const recipientId = await resolveHiringManagerId(after.jobId);
  if (!recipientId) {
    console.warn(`notifyOfferResponse: no hiring manager resolved for offer ${offerId} (job ${after.jobId})`);
    return;
  }

  // Deterministic id + create() (fails if it already exists) rather than
  // add(), since Firestore triggers can fire more than once for the same
  // underlying write and a duplicate offer-response notification would be a
  // visible, confusing defect.
  const notificationRef = getFirestore().collection('Notifications').doc(`offer-response-${offerId}`);
  try {
    await notificationRef.create({
      userId: recipientId,
      title: `Offer ${after.status} — ${after.candidateName}`,
      body:
        `${after.candidateName} has ${after.status} the offer for ${after.jobTitle}.` +
        (after.status === 'accepted' ? ' Open the Offers page to finalize the hire.' : ''),
      type: 'offer',
      relatedId: offerId,
      createdById: after.candidateId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    if (err.code === 6 /* ALREADY_EXISTS */) {
      console.log(`notifyOfferResponse: ${notificationRef.id} already exists, skipping duplicate delivery`);
      return;
    }
    throw err;
  }
});
