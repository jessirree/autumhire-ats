# Phase 3 clickthrough — 2026-10-07

What shipped in the Phase 3 closeout and the F0 email work, tested by hand.
Supersedes Sessions 11A and 11B of `manual-qa-checklist.md` for this pass.

Run it on `https://autumhire-ats.vercel.app` or localhost; both work now that
bucket CORS covers the deployed origin.

Roughly 30 minutes.

---

## Why this one is different

This pass is mostly email, and **six of the seven templates have never been
seen by anyone**. Only `application-received` has been confirmed against a real
inbox. That is where the risk is, not in the UI changes.

So you need real inboxes. Gmail plus-addressing gives you as many as you want
off one account: `yourname+c1@gmail.com`, `+c2`, `+hm` all arrive in your normal
inbox and Firebase treats each as a separate account.

**One trap before you start.** The supporting-documents upload is gated behind
the job's `allowOtherDocuments` toggle. Apply to an existing job and you will
see nothing and conclude row 4.3 is broken. Create a fresh job with the toggle
on.

**Second trap, added 2026-10-15.** Two standard pre-screening questions
("Highest level of education completed", "Total years of relevant work
experience") now ship on every *new* job — fixed wording, fixed answer type,
not editable or deletable, replacing what the now-parked capability profile
was collecting. **Deliberately not backfilled onto existing jobs.** A job
created before this change, or one already mid-application, will not show
these two questions, and candidates who already applied will not have
answered them — that is a half-empty column by design, not a bug. Create a
fresh job to see them; do not expect them on `JOB-TEST-9001` or any other
pre-existing job's applicant list.

---

## Setup, as admin

| # | Do this |
|---|---|
| 0.1 | Create job **QA-OTHERDOCS**: closing date next month, CV and cover letter required, **Other supporting documents toggle ON**, one screening question with points per choice |
| 0.2 | Note any existing job whose closing date has passed, or set one, for item 7 |
| 0.3 | Register three accounts with plus-addressed real emails: two candidates and one hiring manager |
| 0.4 | Set the hiring-manager account as the hiring manager on QA-OTHERDOCS |

---

## 1. As candidate 1

| # | Do this | Expected |
|---|---|---|
| 1.1 | Open the apply form for QA-OTHERDOCS | "Other supporting documents (optional)" block is visible, stating PDF only, up to 5 files, max 10MB each |
| 1.2 | Attach two PDFs | Both listed, each with a remove control. Remove one and it goes |
| 1.3 | Try to attach a sixth file | Blocked: "at most 5 supporting documents" |
| 1.4 | Try an 11MB file | Blocked on size |
| 1.5 | Submit the application | Confirmation email arrives |
| 1.6 | In Firestore, open the new `Notifications` document | `emailStatus: 'sent'`, a `messageId`, and `emailSentAt` |
| 1.7 | Apply to the same job again | Blocked: "You've already applied" |
| 1.8 | Open a **closed** job's `/jobs/:id/apply` URL directly | "This job is no longer available", **not** a silent bounce to `/jobs`. Row 4.5; it redirected silently before this pass |
| 1.9 | On the dashboard, check the bio-data section | Nothing you have submitted reads "not submitted". Submit bio-data, reload, status is correct. Row 6.6 |

## 2. As recruiter

| # | Do this | Expected |
|---|---|---|
| 2.1 | Open candidate 1's detail page | Both supporting documents listed and downloadable |
| 2.2 | Download the CV | Saves as `{REF}_{Name}_CV.pdf`, not a raw Storage filename. Row 5.10 |
| 2.3 | Download a supporting document | Same renaming behaviour |
| 2.4 | Edit the points on one screening answer | The total recomputes automatically. Row 3.11 |
| 2.5 | Set a manual total override | The override wins over the recomputed total |
| 2.6 | Move candidate 1 to Screening | **`status-update` email arrives.** First time this template has run |
| 2.7 | Shortlist candidate 1. Leave candidate 2 at `applied` | Status changes |
| 2.8 | Schedule an interview for candidate 1 | **Interview invitation email arrives. Check whether it carries date, time and location, or only a bare notice.** Row 7.1 is still recorded as Phase 4's email exception; this item is what decides whether that is still true |
| 2.9 | Add a referee on candidate 1 and save | **The referee address receives a reference request.** Row 8.2 has displayed "Awaiting response" for an email that was never sent, for the entire life of this project |
| 2.10 | Send regrets for the job | Candidate 2, still at `applied`, must **not** receive one. Only shortlisted and interviewed candidates do. Row 9.4 |

## 3. Offers

| # | Do this | Expected |
|---|---|---|
| 3.1 | As the hiring manager or recruiter, create and send an offer to candidate 1 | Candidate receives the offer email |
| 3.2 | As candidate 1, accept it from the dashboard | Status updates |
| 3.3 | **Check the hiring manager is notified, by email and in the bell** | This is the single highest-value item here. Before this pass it went to whoever drafted the offer (row 9.2), and after the Step 1 security fix it stopped working entirely until the server-side fix |
| 3.4 | Repeat with a declined offer | Same notification reaches the hiring manager |

## 4. As admin

| # | Do this | Expected |
|---|---|---|
| 4.1 | Subscribe to job alerts as a candidate, then publish a job | The subscriber receives an alert email |
| 4.2 | If the fan-out fails | You see a toast. It used to fail in silence. Row 4.10 |
| 4.3 | Open the audit log | Entries for the status changes and the offer decisions, each naming the right actor |

---

## Where this will break, if it breaks

**2.8, 2.9 and 3.3.** Three email templates and one notification path that have
never run against a real inbox. If you are short on time, do 1.1 to 1.6, then
2.6, 2.8 and 3.3, and skip everything else.

## Still open after this pass, by design

- **Row 4.7**, one application per job enforced in the rules. Works in the
  browser only. Not attempted this pass; Phase 3 cannot fully close without it.
- **Row 5.10 part 1**, cover letters and supporting documents are still absent
  from the mass-download zip. Only the single-file rename was fixed.
- **Phase 4** items G5 to G9 untouched, as agreed.

## What to send back

For each failure: the item number, what you expected, what happened, and the
console error if there is one. For the email items, say whether it arrived, and
whether it landed in the inbox or in spam.
