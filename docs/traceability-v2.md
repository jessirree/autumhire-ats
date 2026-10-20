# Requirements Traceability v2 — Autumhire ATS

**Re-baseline, 2026-10-15.** Supersedes `docs/traceability-requirements.md`. Two things changed:

1. **IDs.** `docs/requirements-source.md` assigns stable IDs (PR-1, LL-3, JA-8, ...) extracted verbatim from the signed client document. The old `stage.row` numbering (5.1, 5.8, 10.3) is retired. The mapping used here is **positional**: both documents list every requirement in the same order, section for section, with identical counts per section — confirmed by checking every section header and spot-checking wording on the five rows flagged for deep resolution (LL-9=old 5.9, SL-5=old 6.5, JA-4=old 3.4, JA-8=old 3.8, FLEX-1=old 10.1). A full ID-mapping table is at the end of this document.
2. **Scheme.** Five verdicts replace the old doc's six: **VERIFIED / BUILT UNVERIFIED / OPEN / DEFERRED / NOT A FEATURE**. There is no partial-credit bucket — a requirement with any materially unmet piece is OPEN, with the working part stated in Notes. `DEFERRED` is reserved for JA-5 and JA-13, the only two rows where the client's own Comment column in `docs/requirements-source.md` says "deferred" — a pre-existing position from the signed document, not a mid-project decision. `NOT A FEATURE` is reserved for the vendor-questionnaire rows (ARCH-1–5, TRN-1/2, SUP-1/2, GOV-1, OWN-1, CS-1) that ask Autumhire a question rather than requesting a system behavior.

**Basis.** The old audit (`docs/traceability-requirements.md`, static read of commit `428b8ba`, 2026-10-03) supplies the file:line research for every row and is reused as evidence where nothing has changed. Twelve days of work happened between that audit and this one — the "What changed" section below documents exactly what was re-verified fresh against current code, and why the old doc's verdict could not simply be carried over for those rows. Every other row keeps the old doc's evidence, translated into the new five-verdict scheme by the mechanical rule: VERIFIED→VERIFIED, IMPLEMENTED UNTESTED→BUILT UNVERIFIED, PARTIAL→OPEN, BROKEN→OPEN, NOT IMPLEMENTED→OPEN, N/A→NOT A FEATURE (named rows only, else OPEN/BUILT per the row's actual wording).

**Evidence tier** — `clickthrough` (a named human walkthrough or recorded QA result), `automated test` (a passing test in `tests/`), `code read only` (traced but never run — the weakest tier, and the reason three of this project's dead features passed earlier review). Tier is per-row in the tables below.

---

## What changed in this re-baseline

**Security (SEC-1/2/3, APP-10).** `docs/security-pass-2026-10-03.md` fixed all four holes the old audit's X3/X2 findings described: self-registration as admin (S1), every candidate reading every other candidate's PII and CV link (S2), deactivation not being enforced (S3), and `JobAlerts` having no rule block at all (S4). Confirmed directly in current `firestore.rules` (`isActive()`/`isAdmin()`/`isStaff()` helpers, `Users` create/read rules, `JobAlerts` match block) and in `tests/firestore-rules.test.ts`, which now has named cases for all four (and the full suite passes 71/71 — run this session). SEC-2 upgrades from BROKEN to VERIFIED. APP-10 upgrades from BROKEN to BUILT UNVERIFIED (the rule layer is now tested; the Subscribe button itself has no recorded human click).

**Email (APP-12, INT-1, REF-2, OFF-2, OFF-4).** The old audit's X1 ("no email is ever sent — treat every dependent row as BROKEN") is no longer true. `functions/outbox.js` exports `deliverNotificationEmail`, a Firestore trigger (`onDocumentCreated('Notifications/{id}')`) that fires automatically on every `notify()` write and sends real SMTP mail — confirmed by reading the trigger directly. `docs/phase-3-clickthrough.md` records a real clickthrough of the application-confirmation email (items 1.5–1.6: email arrived, Firestore shows `emailStatus: 'sent'` and a `messageId`) — APP-12 upgrades to VERIFIED. The other four templates were explicitly "never been seen by anyone" as of that doc (2026-10-07) and nothing in this session confirms they were since clicked through, so they upgrade only to BUILT UNVERIFIED, not VERIFIED — but each also had a *second*, non-email bug in the old audit, and those were checked fresh this pass:
- **OFF-2** (hiring-manager notified of offer status): the wrong-recipient bug is fixed — `functions/offerNotifications.js`'s `notifyOfferResponse` now resolves the real hiring manager (via the requisition or the job's hiring team) instead of `offer.createdById`. Confirmed by reading the function directly.
- **OFF-4** (regret notifications): the over-broad-regret bug is fixed — `sendRegretsForJob` (`applicationService.ts:707-717`) now filters to `['shortlisted', 'interview']` only, matching the requirement's own wording ("shortlisted candidates who are not hired"). Confirmed by reading the function directly.
- **REF-2** (referee email): the "status: 'sent' was a lie" bug is fixed — `createReferenceCheck` (`offerService.ts:293-325`) now calls `notify()` with the referee's real email via a no-account (`userId: ''`) path the outbox supports, with a comment explicitly documenting the old lie and the fix.
- **INT-1** (interview invitation): only the email-sender half is confirmed fixed. The old audit's second finding — the candidate dashboard shows no interview date/time/location, only a count — was not re-checked this pass and is carried forward as open.

**Matching gate (LL-1, LL-6, LL-8).** `src/config/features.ts`'s `MATCHING_ENABLED = false` parks the structured capability-profile/skills-matching UI by client decision, 2026-10-15 (`docs/wave-g-brief.md` §4, Option 1) — this is a scope decision, not a defect, and is not marked DEFERRED (that word is reserved for JA-5/JA-13; this is graded on what the *current* system does).
- **LL-1** (preliminary long list by matching applicant details to job specs): now satisfied via auto-scored screening-question answers, ranked on the Screening page. Graded BUILT UNVERIFIED — real and wired, but no named walkthrough of the Screening-page sort specifically is on record (the walkthrough citations that exist cover the Shortlisting-page sort, a different screen).
- **LL-6** (CV/personal-details data bank, identifying competencies/experience/academics and application source): CV, personal details and source genuinely work. The competency/experience/academic-attainment sub-fields are the parked capability profile — a real, acknowledged gap against the literal text, not a defect. Graded OPEN, with the working two-thirds stated in Notes.
- **LL-8** (reports comparing required vs. existing competencies): now satisfied differently than the old audit's evidence (which pointed at `BestMatchReport.tsx`, now gated off). `src/lib/scoreBreakdown.ts` (new, committed `8a76e00` this session) computes each question's required maximum from its own rubric and each candidate's achieved score, excluding unscored questions from both sides rather than zeroing them; `src/lib/exportApplicationsXlsx.ts` renders this per job, ranked by total score descending. This was verified this session by downloading the real `.xlsx` from the actual "Export to Excel" button against the emulator and inspecting cell values for six candidates — correct sort order, correct blank-not-zero handling for a skipped question, correct "all answered, all zero" handling. Graded **VERIFIED** — a real run, not just the 10 passing unit tests in `tests/scoreBreakdown.test.ts` (which also pass and are cited as corroborating automated-test evidence).

**Two new standard screening questions** ("Highest level of education completed", "Total years of relevant work experience") ship on every new job this session, no backfill. Relevant to LL-2/JA-11 (scores are defined for them like any other question) and JA-9. Noted where relevant; does not change any verdict.

**CORS, re-read.** The old audit's X5 flagged the CV-zip download as failing on the deployed domain because `cors.json` only listed localhost. `CLAUDE.md`'s Deploy Targets table now documents this as a known, named operational step (`node scripts/set-storage-cors.cjs`) rather than an open code defect — LL-10 and LOC-1 are graded BUILT UNVERIFIED rather than OPEN on this specific point, since the gap is "remember to run a script," not "nothing exists to fix it."

**Five rows resolved this session by direct, deep code read** (the ones specifically asked about) — summarized here, full reasoning in the table:
- **LL-9** (share profile/questionnaire/CV/cover letter by email) — **OPEN.** "Share Profile" genuinely opens a real `mailto:` draft (not merely a clipboard write, correcting an earlier dismissal) carrying the profile and a questionnaire summary — but the CV and cover letter, both explicitly named in the requirement, are never attached or linked anywhere in `shareCandidateProfile.ts`, and `mailto:` cannot carry attachments at all. Structural gap, not a tweak.
- **SL-5** (shortlisting criteria) — **BUILT UNVERIFIED.** A real, wired, free-text "Shortlisting Criteria" field: authored in `CreateJob.tsx`, persisted on `Job.shortlistingCriteria`, shown to the hiring manager/panel in `ShortlistingPage.tsx` as an info-icon tooltip. Free text, not structured scoring, but the requirement's own wording ("creation of criteria") is loose and this is a genuine round trip.
- **JA-4** (job statuses) — **OPEN** overall, but the prior audit's F16 note was half-wrong: **Pending is reachable** (the dropdown offers it and it persists on editing an already-non-Draft job — the same caveat as the rest of that dropdown, not a block), while **Cancelled is genuinely unreachable** — it exists only in the TypeScript union and as a cosmetic filter-dropdown option; a repo-wide grep for any code path writing `status: 'Cancelled'` found zero matches. Active/Closed/Re-advertised/Internal-visibility all work.
- **JA-8** (RSS feed broadcast) — **BUILT UNVERIFIED.** Two real mechanisms: `feedService.ts`'s RSS XML feed (uploaded to Storage, a URL meant for RSS readers/automation tools) and a separate one-click LinkedIn/Twitter share-link dropdown per job. **F13's removed "LinkedIn Apply" control was a different, unscoped, never-signed feature** (one-click-apply on the candidate application form) — unrelated to this row. No signed requirement was deleted.
- **FLEX-1** (Excel/photo/referee/attachment import) — **OPEN.** A repo-wide search found no import mechanism of any kind. `Application.referees` is a real field, but it is populated only by direct manual entry, never imported from anything — it answers a different need (REF-1/REF-2) and does not touch this requirement.

**Playwright flow suite (`tests/flows/`, `pnpm test:flows`).** Manual clickthrough was never going to clear the 47 BUILT UNVERIFIED rows, so a scripted suite replaces it for the rows a browser can actually assert against the emulator — one named test per requirement ID. Three proved the pattern first (APP-7, APP-10, SL-2); this pass added every other **bucket-A, category-1** row (fails silently: status transitions, notification sends, rule enforcement) — JA-6, JA-12, APP-4, APP-13, LL-4, OFF-1, OFF-3 — bringing the suite to 10 tests, all upgraded to VERIFIED. Every one of the 10 was deliberately broken in the real source, shown failing, restored, and shown passing again before being trusted — a test that has never been seen to fail is not evidence. One of the ten (JA-12) caught a genuine flaw in its *own* first draft, not the product: asserting "the confidential job's title has zero matches" immediately after navigation passed trivially before the page's async job fetch had even resolved, regardless of whether the leak existed. Fixed by seeding a same-shaped control job and waiting for it to render first, which gave the assertion something to anchor on — after the fix, the same deliberate break in `getPublicJobs()`'s query (paired with the matching `firestore.rules` condition) was caught correctly. Category 2 (bulk/concurrent — `ARC-1`) and category 3 (everything else in bucket A) are not attempted yet. Bucket B (`REF-2`, `OFF-2`, `OFF-4`, `SEC-1` — need a Firestore read or a rules test, not a browser) and bucket C (`JA-14`, `APP-1`, `LOC-1` — see VERIFIED BY ARCHITECTURE/DISCLOSED below) are explicitly out of scope for this suite, not an oversight.

---

## Position requisition

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| PR-1 | Pre-loading of all current job positions | BUILT UNVERIFIED | code read only | Admin → Job Positions (`PositionsPage.tsx:67-69,85`) → `createPosition`/`updatePosition` (`requisitionService.ts:121-139`) → `Positions`, staff read/admin write (`firestore.rules:32-35`). | Entered one at a time; no bulk import. Position changes are not audited. |
| PR-2 | Positions and vacancies linked to positions | BUILT UNVERIFIED | code read only | Requisition stores `positionId`/`vacancies` (`requisitionService.ts:211-229`); published job links back via `requisitionId` (`CreateJob.tsx:388-391`). | A job posted directly without a requisition carries no position link. |
| PR-3 | Single/multiple levels of approval of the requisition | OPEN | code read only | HM-raised path works end to end (recruiter refine → HM confirm → admin approve/reject, with a documented skip-admin-approval option). | **Recruiter-raised requisitions never reach a hiring manager** — the confirmation notice goes to the creator (the recruiter), and the HM queue only shows rows the viewing HM themself created, so no HM can ever confirm one. Approval-chain depth is fixed, not configurable, and enforced only in the browser. |
| PR-4 | Attach job description to the requisition | BUILT UNVERIFIED | code read only | Upload (`NewRequisitionPage.tsx:256-297`) → `job-descriptions/{REQ}/` (`requisitionService.ts:203-209`) → `storage.rules:21-24`. | Depends on `syncUserRoleClaim` being deployed (storage rules read the role claim). |
| PR-5 | Define internal/external advert | BUILT UNVERIFIED | code read only | Radio on requisition → `advertType` carried to the job builder (`CreateJob.tsx:310`) → `Job.advertType`. | What "internal" means for candidates is a separate question — see JA-4/JA-15. |
| PR-6 | Auto-generate job reference number | BUILT UNVERIFIED | code read only | `REQ-YYYY-####`/`JOB-YYYY-####`, each a transaction on `Counters` (`requisitionService.ts:143-155`, `jobService.ts:100-112`). | — |

## Job Evaluation

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| JE-1 | Accept job grade from the Job Evaluation Manager/Tool | BUILT UNVERIFIED | code read only | Grade hint on the position prefills the mandatory grade on the requisition (`PositionsPage.tsx:235-241`, `NewRequisitionPage.tsx:47-53,150-162`). | Manual entry; no integration with an external evaluation tool. |
| JE-2 | Do not allow proceeding unless job grade is input | OPEN | code read only | Enforced on the requisition path (button disabled, service throws). | **`Job` has no grade field at all** — an admin can publish a job directly (no requisition) with no grade whatsoever. |
| JE-3 | Notify hiring manager of job grade for approval | OPEN | code read only | In-app notice to the requisition creator; HM confirmation screen shows the grade. | The generic SMTP sender (Wave F0) now exists project-wide, but this specific call was not re-verified this pass. The notice goes to the creator, so recruiter-raised requisitions still never reach an HM — same root cause as PR-3. |

## Job advertisement

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| JA-1 | Standard template for job adverts | OPEN | code read only | Admins can author "Job Ad" templates (`TemplateManagement.tsx`). | **The job builder never loads them** — no caller of `getTemplates`/`renderTemplate` outside Template Management itself. "Duplicate Job" is the working substitute. |
| JA-2 | Disallow posting incomplete adverts | OPEN | code read only | Title, location, contract type, description enforced in the wizard and service. | **Grade cannot be enforced** — not a field on `Job` (see JE-2). |
| JA-3 | Single/multiple levels of approval of the advert | OPEN | code read only | No advert approval exists; any new non-draft job is forced to `Active` and goes live immediately regardless of the "Pending" option shown in the wizard. | — |
| JA-4 | Job statuses: Pending/Cancelled/Re-advertised/Internal/Re-opened | OPEN | code read only | See "What changed" above. Active/Closed/Re-advertised work (`reopenJob`, `jobService.ts:276-288`); internal-advert visibility works (`getPublicJobs` filters `advertType==='external'`, `jobService.ts:342-356`); **Pending is reachable** on edit of a non-Draft job (`CreateJob.tsx:672-678`). | **Cancelled is unreachable by any role or screen** — in the type union and a cosmetic filter dropdown only, never written anywhere. This is the one gap keeping the row OPEN; corrects the prior audit's F16 note, which wrongly also flagged Pending. |
| JA-5 | Customizable advert page for unique positions (e.g. consultancies) | DEFERRED | — | Client's own Comment column in `docs/requirements-source.md` says "deferred". | Not re-derived against code, per instruction. |
| JA-6 | Re-open closed jobs, auto-status Re-advertised | VERIFIED | automated test | "Re-open" (`JobAdvertsPage.tsx:170-180`) → `reopenJob` sets `Re-advertised` (`jobService.ts:276-288`), audited. Flow test `JA-6: re-opening a closed job automatically sets status to Re-advertised` passed 2026-10-20 (`tests/flows/job-advertisement.spec.ts`). | No named walkthrough of this specific action exists. |
| JA-7 | Automatic closure after closing date unless re-opened | OPEN | code read only | Candidates cannot see/apply past the deadline (public query filter, detail-page message, apply-service re-check). | **No scheduled job** — the stored status only flips to Closed when a staff member next loads a job list, and that write's error is swallowed. Reports count a stale-open job until then. |
| JA-8 | RSS feeds to broadcast adverts to LinkedIn/Twitter etc. | BUILT UNVERIFIED | code read only | See "What changed" above — `feedService.ts` RSS feed + per-job LinkedIn/Twitter share links, both real. | F13 is unrelated (confirmed — see above). Auto-regeneration after publish/close has a swallowed error. |
| JA-9 | Support for pre-screening questions | BUILT UNVERIFIED | code read only | Admin question bank + per-job questions; candidates answer and are auto-scored. | Two standard questions (education, years of experience) now ship on every new job as of this session. Authoring/answering through the UI (not seed scripts) has no named walkthrough. |
| JA-10 | Minor editing of posted jobs | BUILT UNVERIFIED | code read only | Edit routes → `updateJob` (`jobService.ts:179-188`). | Every save of an Active job resets `postedAt`, re-dating the advert, and re-runs the subscriber fan-out. |
| JA-11 | Set/define scores for pre-screening answers during long listing | OPEN | code read only | Answer points defined at job-build time; auto-scored on submission. | During long-listing a recruiter can only override the **total**, not re-score individual answers — the literal "during long listing" scoring ask is not available there. |
| JA-12 | Confidential jobs absent from the main page | VERIFIED | automated test | Checkbox → `isConfidential`, excluded by both the public query and the rule. Flow test `JA-12: a confidential job is hidden from the public advert but visible to staff` passed 2026-10-20 (`tests/flows/job-advertisement.spec.ts`). | The checkbox copy promises an "internal board" that does not exist. |
| JA-13 | Customization of the advert link | DEFERRED | — | Client's own Comment column says "deferred". | Not re-derived against code. Code fact for the record: links are always `/jobs/{JOB-YYYY-####}`, no slug/custom URL exists. |
| JA-14 | Unlimited job adverts | VERIFIED BY ARCHITECTURE/DISCLOSED | code read only | No finite test can falsify "unlimited" — creating job N+1 only proves N+1 didn't hit an arbitrary cap, nothing stronger. No cap exists in code. The client's own Comment column already reads "done (depends on storage subscription)" — a disclosed limitation (Firestore/Storage plan ceilings), not an open behavioural gap. | Yearly reference-number counter pads to 4 digits but keeps counting past 9999 — a real, separate code note, not what this status is about. |
| JA-15 | Internal adverts absent from the main page | OPEN | code read only | Hiding works (excluded from the public rule/query). | **Nobody can apply to one** — staff-only read of non-public adverts means a candidate opening an internal link gets "job no longer available," and the apply service throws. No internal job board exists. |

## Job applications

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| APP-1 | Unlimited number of candidates | VERIFIED BY ARCHITECTURE/DISCLOSED | code read only | Same reasoning as JA-14: unfalsifiable by any finite test, no cap exists in code, and the client's own Comment column reads "done (depends on storage subscription)" — disclosed, not open. | Staff pages load the entire `Applications` collection client-side, no paging — a real performance note at volume, not what this status is about. |
| APP-2 | Candidates set a profile and upload a reusable CV | BUILT UNVERIFIED | clickthrough (profile) + code read only (CV) | Profile-save half VERIFIED by prior walkthrough. CV upload/reuse traced through code (`profileService.ts`, `ApplicationForm.tsx`), no named CV-specific walkthrough. | Graded on the weaker, unconfirmed half — the CV path is the one actually at risk. |
| APP-3 | Checklist of necessary documents (cover letter, CV, other) | OPEN | code read only | CV/cover-letter checklist shown and enforced. | **"Any other relevant document" has no upload control** — the service supports `otherFiles` but the form never passes them. |
| APP-4 | Alert if necessary documents are not attached | VERIFIED | automated test | Native `required` on file inputs plus a service-level error, shown to the user. Flow test `APP-4: the system alerts when a required document is missing, rather than submitting silently` passed 2026-10-20 (`tests/flows/job-applications.spec.ts`). | — |
| APP-5 | Cannot apply to closed jobs; shows "no longer available" | OPEN | code read only | Works via the detail page and the service re-check. | **Opening `/jobs/:id/apply` directly redirects silently to `/jobs`** instead of showing the message — the one path where the literal requirement text fails. |
| APP-6 | Determine if applicant applied before (same/other positions) | BUILT UNVERIFIED | code read only | "Other Applications by This Candidate" panel, matched by account. | A second account by the same person is not detected. |
| APP-7 | No duplicate application for the same job | VERIFIED | automated test | Form blocks with a message; service throws; **also enforced atomically at the rule layer** (a second create targets an existing doc id, denied — confirmed in `firestore.rules` comments referencing row 4.7/G2). Flow test `APP-7: the system does not allow a duplicate application for the same job` passed 2026-10-15 (`tests/flows/job-applications.spec.ts`). | — |
| APP-8 | Determine if applicant worked for the organization before | BUILT UNVERIFIED | code read only | Self-declared checkbox → badge. | Not verified against any HR record — self-declaration only. |
| APP-9 | Determine if applicants are internal candidates | BUILT UNVERIFIED | code read only | Self-declared checkbox → badge + internal-hire-ratio report. | Self-declaration only. |
| APP-10 | Candidates subscribe to Autumhire jobs | VERIFIED | automated test | **Upgraded from the old audit's BROKEN.** `JobAlerts` now has a rule block (S4 fix) with named test cases (`tests/firestore-rules.test.ts:277-299`), confirmed passing in this session's 71/71 run. Flow test `APP-10: candidates can subscribe to Autumhire job alerts` passed 2026-10-15 (`tests/flows/job-applications.spec.ts`) — clicks the real Subscribe button and confirms the state survives a reload. | Delivery of the actual alert email still depends on the same generic sender as the rest of this section, and is not asserted by the flow test. |
| APP-11 | Capture age, gender, nationality, city/country of residence | BUILT UNVERIFIED | code read only (DOB: clickthrough) | Required fields on the application form, prefilled from profile, stored on the application. | Nationality is free text — reports split spelling variants ("Kenyan" vs "kenyan"). |
| APP-12 | Automatic alert to candidates on submission | VERIFIED | clickthrough | **Upgraded from the old audit's BROKEN.** `docs/phase-3-clickthrough.md` items 1.5–1.6: email arrived, Firestore shows `emailStatus: 'sent'` + `messageId`. | — |
| APP-13 | Declaration that information is correct; false info disqualifies | VERIFIED | automated test | Mandatory checkbox with that wording; service rejects without it; **the create rule also requires `consentGiven == true`** — enforced at all three layers. Flow test `APP-13: the consent declaration is required — a candidate can't submit without it` passed 2026-10-20 (`tests/flows/job-applications.spec.ts`) — confirms the browser-side block specifically; the rule-layer enforcement is still corroborated by code read only. | — |

## Long Listing

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| LL-1 | Preliminary long list by matching applicant details to job specs | BUILT UNVERIFIED | code read only | See "What changed" above — now satisfied via auto-scored screening answers, ranked on the Screening page, per job-specific questions. | Structured capability matching parked by client decision, 2026-10-15 — a scope choice, not the reason this is ungraded higher; it's BUILT UNVERIFIED because no named walkthrough of the Screening-page sort exists. |
| LL-2 | Define scores for the pre-screening questions | BUILT UNVERIFIED | code read only | Points per question/choice in the question bank and per job. | Includes the two new standard questions as of this session. |
| LL-3 | Access to position and candidate specs for easy reference | OPEN | code read only | Candidate spec: full detail page works. | **Job spec button opens the job editor**, not a read-only view; a hiring manager viewing the same page is bounced to their dashboard by the route guard (though HMs do see shortlisting criteria separately, SL-5). |
| LL-4 | Online tracking of applicants through each stage | VERIFIED | automated test | Every status change appends to `statusHistory`, shown to staff and to the candidate as a timeline. Flow test `LL-4: a staff status change is reflected to the candidate as online tracking through the stage` passed 2026-10-20 (`tests/flows/long-listing.spec.ts`). | — |
| LL-5 | Query facility to search and drill into detailed resume info | VERIFIED | clickthrough | Search on Applications/Candidates → detail page with documents, answers, ratings. | Covers name/email/job/role, not CV text. |
| LL-6 | CV/personal-details data bank; identify competencies, experience, academics, application source | OPEN | code read only | See "What changed" above. **CV, personal details and source all work.** | **Structured competency/experience/academic-attainment fields are the parked capability profile** (`MATCHING_ENABLED = false`) — a real gap against the literal text, acknowledged as a client-directed scope choice rather than a defect, but still unmet as written. |
| LL-7 | Bulk status changes in one activity/screen | VERIFIED | clickthrough | Select-all + bulk action → one batched write. | — |
| LL-8 | Reports comparing required vs. existing competencies for a job | VERIFIED | manual run this session + automated test | See "What changed" above — real `.xlsx` downloaded via the actual UI against the emulator this session, cell values inspected and correct; `tests/scoreBreakdown.test.ts` (10/10) corroborates. | Supersedes the old audit's `BestMatchReport.tsx` evidence, now gated off by the matching-park decision. |
| LL-9 | Share candidate profile/questionnaire/CV/cover letter by email | OPEN | code read only | See "What changed" above — "Share Profile" genuinely opens a `mailto:` draft (profile + questionnaire summary). | **CV and cover letter are never attached or linked anywhere in the share flow** — a structural gap, since `mailto:` cannot carry attachments. |
| LL-10 | Download CVs/cover letters with automatic renaming | OPEN | clickthrough (CV) / code read only (rest) | **Bulk CV zip VERIFIED on localhost** (prior walkthrough): renamed `{REF}_{Name}_CV.pdf`. | **Cover letters and other documents are not in the zip.** Single-document download via the `download=` attribute is ignored by browsers for cross-origin Storage URLs, so those aren't renamed. The deployed-site CORS gap is now a documented operational step (`scripts/set-storage-cors.cjs`, see `CLAUDE.md`), not an open defect — but the missing-documents gap keeps this row OPEN regardless. |

## Short Listing

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| SL-1 | Share the long list with the hiring manager/panel | VERIFIED | clickthrough | Shortlisting page lists longlisted/shortlisted/rejected applications; confirmed by walkthrough. | — |
| SL-2 | Update status after shortlisting | VERIFIED | automated test | Shortlist/Reject with rationale → `updateApplicationStatus`. Flow test `SL-2: a hiring manager can update an application's status after shortlisting` passed 2026-10-15 (`tests/flows/short-listing.spec.ts`). | A walkthrough item exists for this but no result is recorded. |
| SL-3 | Panel collaboration without affecting results | VERIFIED | clickthrough + automated test (Rules Playground) | 1–3 ratings with isolation (no average/names/scores visible until you've rated); rule binds doc id to panelist uid and score range. | An open design question (sort-by-rating-before-rating) still awaits a client answer — noted, doesn't change the verdict. |
| SL-4 | Rationale/comments to support shortlisting decisions | VERIFIED | clickthrough | Rating comments and notes, seen on the detail page by the tester. | — |
| SL-5 | Creation of criteria to be used for shortlisting | BUILT UNVERIFIED | code read only | See "What changed" above — real, wired, free-text "Shortlisting Criteria" field, authored in `CreateJob.tsx`, round-tripped to the hiring manager's shortlisting view. | Free text, not a structured scored rubric — the requirement's own wording is loose enough that this counts as built. |
| SL-6 | Shortlisted candidates fill bio-data online | OPEN | code read only | Submit path works ("Complete Bio-Data" → `BioData` create by owner). | **Status read fails for a not-yet-submitted record** — the read rule needs an existing document, so a pending bio-data read is denied, the error is swallowed, and an already-submitted record can show as "not submitted" when a candidate has more than one shortlisted application. Only national ID and postal address are collected. |
| SL-7 | Specified hiring-manager duties on every page | BUILT UNVERIFIED | code read only | A `DutyBanner` with static text on every HM page (dashboard, requisitions, shortlisting, candidate detail, interviews, offer approvals). | — |

## Interviews

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| INT-1 | Load and share interview schedules via templates | OPEN | code read only | Scheduling itself works. **Email-sender half fixed** — see "What changed" above (generic SMTP sender now fires on every notification). | **Not re-verified this pass:** the candidate dashboard previously showed no interview date/time/location, only a count. **Templates are never applied** — "Interview" templates can be authored but nothing in the scheduling flow uses them. Two unresolved gaps keep this OPEN despite the email fix. |
| INT-2 | Load interview questions | BUILT UNVERIFIED | code read only | Free-text questions, one per line, per interview. | Not drawn from the question bank. |
| INT-3 | Record interview scores/results with detailed comments | OPEN | code read only | Per-panelist score + comments; result/notes on completion. | **`recordPanelScore` rewrites the whole scores array from the copy the browser loaded** — two panelists saving near-simultaneously can silently wipe one another's score. Not audited. |
| INT-4 | Generation of interview reports | BUILT UNVERIFIED | code read only | "Print report" builds a printable HTML summary with per-panelist scores, average, consensus, from already-loaded data. | — |

## Reference checks

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| REF-1 | Resourcing team performs reference checks on the selected candidate | BUILT UNVERIFIED | code read only | "Add Referee" → `createReferenceCheck` → `ReferenceChecks`; "Record response" flow. | Referees are not collected on the application form — staff type them in by hand. Responses are not audited. |
| REF-2 | Auto-generated reference email from the advert, to referees | BUILT UNVERIFIED | code read only | **Upgraded from the old audit's BROKEN.** See "What changed" above — `createReferenceCheck` (`offerService.ts:293-325`) now genuinely emails the referee via the generic outbox, with a comment documenting the old "status: sent was a lie" bug and its fix. | The email content is built from the **application** (job title, department), not literally "the advert" — a minor wording gap, not a functional one. No named clickthrough on record (`docs/phase-3-clickthrough.md` item 2.9 flags this template as unexercised). |

## Offers & regrets

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| OFF-1 | Status for "offer accepted"/"offer rejected" | VERIFIED | automated test | Candidate accepts/declines on the dashboard → `respondToOffer`; rule allows the candidate to flip only `status` from `sent` to `accepted`/`rejected`. Staff can also record it. Flow test `OFF-1: a candidate accepting an offer actually changes its status, not just local UI state` passed 2026-10-20 (`tests/flows/offers-regrets.spec.ts`). | — |
| OFF-2 | Notify hiring manager of offer status | BUILT UNVERIFIED | code read only | **Upgraded from the old audit's BROKEN.** Both prior bugs fixed and confirmed by direct code read this pass: `notifyOfferResponse` (`functions/offerNotifications.js`) resolves the real hiring manager (not the offer's creator), and the generic SMTP sender delivers the email. | `docs/phase-3-clickthrough.md` item 3.3 calls this "the single highest-value item" to check and has no recorded result — kept at BUILT UNVERIFIED, not VERIFIED, for that reason. |
| OFF-3 | Status to "Hired" on candidate acceptance | VERIFIED | automated test | Recruiter clicks "Finalize hire" after the candidate accepts, which sets the application to `hired`. Flow test `OFF-3: finalizing a hire actually sets the application status to Hired` passed 2026-10-20 (`tests/flows/offers-regrets.spec.ts`). | Deliberate recruiter step, not automatic. |
| OFF-4 | Regret notification to shortlisted candidates not hired | BUILT UNVERIFIED | code read only | **Upgraded from the old audit's BROKEN.** Email sender fixed (generic outbox); **the over-broad-regret logic bug is also fixed** — `sendRegretsForJob` (`applicationService.ts:707-717`) now filters to `shortlisted`/`interview` only, confirmed by direct code read this pass. | No named clickthrough of the regret email itself on record. |
| OFF-5 | Simple mechanism to move people through the cycle into onboarding | BUILT UNVERIFIED | code read only | Pipeline actions plus an "onboarding handoff" CSV of accepted offers. | No integration with any onboarding system; the CSV excludes bio-data fields. |

## Flexibility

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| FLEX-1 | Import data from Excel, photos, referees, email attachments | OPEN | code read only | See "What changed" above — a repo-wide search found no import mechanism of any kind. | `Application.referees` exists but is manually entered, never imported — answers a different need (REF-1/REF-2), not this one. |
| FLEX-2 | Calculation functions (e.g. number of days) | BUILT UNVERIFIED | code read only | Age from DOB, days-to-hire, averages — all built-in. | No user-defined calculations. Accuracy caveats carried under REL-1/REP-6. |
| FLEX-3 | Sort function, search function | VERIFIED | clickthrough | Named walkthrough covers shortlisting sort (including accented-name and unrated-last cases), candidates sort, and search. | — |

## Metrics / Reports

Reports page reachable by admin and recruiter (VERIFIED by walkthrough), not by hiring managers.

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| REP-1 | Multiple report views: spreadsheets, graphical (pie, timeline) | OPEN | clickthrough (spreadsheets) / code read only (rest) | CSV and per-job Excel exports VERIFIED by walkthrough; pie/bar charts present. | **No timeline view.** The "Custom Range" date filter has no handler and silently behaves as all-time. |
| REP-2 | Recruits per department/directorate | OPEN | code read only | Hires-per-department exists in the funnel chart. | **No directorate (or other org-level) field exists at all.** |
| REP-3 | Gantt/pie/bar graphs | OPEN | code read only | Pie and bar exist. | **No Gantt chart.** |
| REP-4 | Age ratio | BUILT UNVERIFIED | code read only | Age-band chart from applicant date of birth. | Counts applicants, not hires — see REP-10/REP-14 for the same pattern. |
| REP-5 | Cost per hire | BUILT UNVERIFIED | code read only | Sum of manually entered `recruitmentCost` for jobs with hires, divided by hire count. | Only as good as the manual cost entries; hire count is date-filtered, cost is not. |
| REP-6 | Time taken to fill a position | OPEN | code read only | Calculated from application date to the hired application's `updatedAt`. | **`updatedAt` drifts upward on any later edit** (archiving, ratings) — not a stable fill-time figure. Grouped by month, not per position. The real hire date already exists in `statusHistory` and is unused. |
| REP-7 | Vacancy costs | BUILT UNVERIFIED | code read only | Sum of `recruitmentCost` on open adverts. | Includes past-deadline adverts not yet auto-closed (JA-7). |
| REP-8 | Turnover rate | OPEN | code read only | No employee or exit data exists in the system at all. | Arguably outside an applicant-tracking system's scope — worth a scope conversation with the client rather than treating as a build gap. |
| REP-9 | Source of job adverts | OPEN | code read only | A chart of applications by source exists. | **Mislabelled**: titled "Source of Hire," series named `hires`, but it counts all applications, not hires. |
| REP-10 | Age-band hire ratio (30–40, 40–50, 50–60) | OPEN | code read only | The bands exist. | Counts **applicants, not hires**; boundaries overlap (40-year-olds fall in both bands); under-18s are silently dropped. |
| REP-11 | Nationality | BUILT UNVERIFIED | code read only | Top-8 applicant nationalities chart. | Free-text nationality input splits spelling variants (same root cause as APP-11). |
| REP-12 | Ad-hoc reports | OPEN | code read only | Date/department filters plus raw CSV/Excel export for analysis elsewhere. | No in-app ad-hoc query builder. |
| REP-13 | Internal candidates hired ratio | BUILT UNVERIFIED | code read only | `isInternal` hires ÷ total hires. | Relies entirely on the candidate's self-declaration (APP-9). |
| REP-14 | Gender hire ratio | OPEN | code read only | A gender pie chart exists. | Counts **applicants, not hires** — no actual hire-by-gender figure exists. |
| REP-15 | Ability to create our own reports | OPEN | code read only | Fixed dashboard. | No report designer, no saved/custom reports. |

## Security

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| SEC-1 | No amendments/deletions of applications by the applicant | BUILT UNVERIFIED | code read only | Applications `update` is staff-only, `delete` denied for everyone, by rule. Candidate UI has no edit control. | No dedicated Rules Playground test found for this specific case in the current suite — still worth one, as the old audit also said. |
| SEC-2 | No access to unauthorized personnel | VERIFIED | automated test | **Upgraded from the old audit's most severe finding (BROKEN).** `docs/security-pass-2026-10-03.md` fixed all three holes the old audit found: self-registration as admin, every candidate reading every other candidate's PII/CV link, and deactivation not being enforced. Confirmed in current `firestore.rules` and in `tests/firestore-rules.test.ts`'s named cases (self-admin denied, inactive users blocked, own-doc read allowed) — full suite 71/71, run this session. | The repo fix is confirmed; whether these rules are **deployed** to the production Firestore project is outside what a code read can confirm — `firebase deploy --only firestore:rules` is a separate step per `CLAUDE.md`'s Deploy Targets table, worth a direct check before relying on this in production. |
| SEC-3 | Different roles/access levels (admin, candidate, hiring manager, ...) | OPEN | clickthrough (partial) + code read only | Four roles, route guards, per-role menus; recruiter access to Reports and rating-rule isolation both VERIFIED by walkthrough. | **Recruiters and hiring managers have identical write rights** at the rule layer for requisitions/jobs/applications/offers — the UI distinguishes their duties (`DutyBanner`), but nothing in `firestore.rules` does. A real, if narrower, gap against "different roles **and access levels**." |
| SEC-4 | Audit trail for all user actions with time and date | OPEN | automated test (rule) + code read only (coverage) | The `AuditLog` rule block exists and is exercised by the rules test suite; `logAudit` timestamps with server time and no longer swallows. | **Not "all actions"**: no entry for login (the `'login'` action type is declared in `auditService.ts:13` but never actually used anywhere), user creation/deactivation, positions, interview score entry, panel notes, referee responses, bio-data or profile saves. Confirmed `'login'` is still unused by a direct grep this pass. |

## Backup and recovery

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| BAK-1 | Built-in backup and recovery protection | OPEN | code read only | A genuine system property to verify, not a questionnaire row — read literally. Nothing in `firebase.json`/`functions/` configures Firestore point-in-time recovery, scheduled exports, or Storage versioning. | Firebase does not provide restorable backups unless these are explicitly switched on; this is unconfigured, not merely undocumented. |

## Integration with other systems

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| INTG-1 | Integration with other systems (e.g. OCS) | OPEN | code read only | No outbound integration, no inbound API. The only Cloud Functions are role-claim sync, the mail outbox, offer-response notification and the SMTP health check. | — |
| INTG-2 | Web Services out of the box (WSDL, SOAP, RDF, RSS); describe what's out of the box | OPEN | code read only | RSS exists (JA-8). No REST, SOAP/WSDL, or RDF endpoint of any kind. | The row mixes a build ask (support for WS) with a documentation ask (describe what's out of the box) — graded OPEN on the unmet build half; the description half is answerable in writing in one line ("RSS only") rather than needing code. |

## Training

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| TRN-1 | Cost of training | NOT A FEATURE | — | Vendor question, needs a written commercial answer. | — |
| TRN-2 | Time required for training | NOT A FEATURE | — | Vendor question, needs a written commercial answer. | — |

## Data ownership

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| OWN-1 | Autumhire should own the data | NOT A FEATURE | — | Contractual/commercial, not a system behavior. | In practice, ownership follows whoever owns the Firebase/GCP project and Vercel account — worth confirming those sit in the client's own organization, as a commercial matter. |

## Support & Maintenance

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| SUP-1 | Maintenance and upkeep costs | NOT A FEATURE | — | Vendor question. | Running costs are Firebase Blaze usage plus Vercel, as a factual note; the cost figure itself is commercial. |
| SUP-2 | Managed/maintained at Autumhire premises and by Autumhire? | NOT A FEATURE | — | Vendor question. | The system is cloud-hosted (Firebase + Vercel), not on-premises, as a factual note. |

## Archiving

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| ARC-1 | Archive multiple jobs, candidates, etc. | BUILT UNVERIFIED | code read only | Bulk archive/restore of adverts and of candidate files, batched and audited. | A flag, never a delete. Candidates are archived per application, not per person. |

## Location independent

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| LOC-1 | Work from multiple locations (Addis, Nairobi, etc.) | VERIFIED BY ARCHITECTURE/DISCLOSED | code read only | A cloud-hosted web app (Vercel frontend, Firebase backend) with one single shared backend, reachable from any browser anywhere — there is no location-dependent logic in the codebase to test at all, so this is satisfied by what the system *is*, not by a behaviour a script could assert. | The deployed-domain CORS gap for the CV zip is now a documented operational step (`scripts/set-storage-cors.cjs`), not an open code defect — see LL-10. |

## Government compliance

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| GOV-1 | Compliance with regulations (copyright, etc.) | NOT A FEATURE | — | Legal/process question, not a system behavior to build or test. | Relevant software fact for the record: the application-consent clause exists (APP-13) and a Terms page exists; the SEC-2 data-exposure fix is directly relevant to data-protection compliance. |

## System architecture

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| ARCH-1 | Describe the system architecture | NOT A FEATURE | — | Descriptive answer, not a build item. | React 18 SPA (Vite, TypeScript) on Vercel; Firebase Auth, Firestore, Storage, Cloud Functions; access control in `firestore.rules`/`storage.rules`. |
| ARCH-2 | Databases supported | NOT A FEATURE | — | Descriptive answer. | Google Cloud Firestore (NoSQL document database) only. |
| ARCH-3 | Is the system modular? | NOT A FEATURE | — | Descriptive answer. | Yes — one service module per domain in `src/services/`, pages grouped by role. |
| ARCH-4 | Browsers and versions supported | NOT A FEATURE | — | Descriptive answer. | Current evergreen browsers (Chrome, Edge, Firefox, Safari) targeted; no browser compatibility matrix has been tested. |
| ARCH-5 | Development languages to extend the system | NOT A FEATURE | — | Descriptive answer. | TypeScript/React (frontend), JavaScript/Node (Cloud Functions). |

## Reliability

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| REL-1 | Mathematically correct checks and reports, including candidate ranking | OPEN | clickthrough (ranking) + code read only (reports) | **Ranking and averages VERIFIED** by prior walkthrough (panel averages including the null-not-NaN case; sort orders). **LL-8's export now has its own dedicated correctness guarantees**, verified this session (excluded-not-zeroed unscored questions, correct descending sort) — a genuine strength. | **Several report figures are not mathematically honest as labeled**, carried forward from the old audit: offer-accept rate excludes declined offers from the denominator (overstates the rate); "Source of Hire" counts all applications, not hires; age-band boundaries overlap; gender/age "ratios" are applicant counts, not hire counts (REP-9/10/14). These keep the row OPEN despite the real, verified improvements elsewhere. |

## Data & templates management

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| DTM-1 | Various rule sets for differing recruitment cycles | OPEN | code read only | Admins can define named workflows of stages/roles/auto-email flags; a job stores the chosen workflow's name. | **Nothing reads it afterward** — every job follows the same fixed pipeline regardless of the chosen workflow, and the `autoEmail` flags do nothing even though a real SMTP sender now exists elsewhere in the app. |
| DTM-2 | Various templates managed by administrators | OPEN | code read only | Template create/edit/delete for Email, Interview and Job Ad works end to end and is audited. | **No screen applies a template** — authoring works, nothing downstream consumes it. (The old audit's "email templates can't be sent" half of this finding is now resolved generically, but the lack of any applying screen remains and is the row's real blocker.) |
| DTM-3 | Maintain data on recruitment and advertising agents | OPEN | code read only | No agents entity exists. | "Recruitment agency" exists only as one `source` option on the application form — not a maintained entity with its own data. |
| DTM-4 | Maintain employment-activity-phase data (applicant, exam/test, interview...) | OPEN | code read only | Applicant → longlist → shortlist → interview → offer → hired, with full history and interview records. | **No exam/test phase or test-result data exists anywhere.** |
| DTM-5 | Maintain new hiring data for reporting/analysis | BUILT UNVERIFIED | code read only | Hired applications are kept (never deleted, by rule), feeding the Reports page and the onboarding CSV. | — |

## What constitutes customer service

| ID | Requirement | Verdict | Evidence tier | Evidence | Notes |
|---|---|---|---|---|---|
| CS-1 | Upgrades, training, etc. | NOT A FEATURE | — | Vendor/commercial question. | — |

---

## 1. Scorecard

### Overall (110 rows)

| Verdict | Rows |
|---|---|
| VERIFIED | 19 |
| BUILT UNVERIFIED | 34 |
| OPEN | 40 |
| DEFERRED | 2 |
| VERIFIED BY ARCHITECTURE/DISCLOSED | 3 |
| NOT A FEATURE | 12 |
| **Total** | **110** |

Counted directly from the tables below, not hand-tallied. Reflects, since the original 9/47/40/2/12 count: ten BUILT UNVERIFIED rows upgraded to VERIFIED by the Playwright flow suite (APP-7, APP-10, SL-2 proved first; JA-6, JA-12, APP-4, APP-13, LL-4, OFF-1, OFF-3 proved in the category-1 pass — `tests/flows/`, see "What changed" below), and three moved to the new **VERIFIED BY ARCHITECTURE/DISCLOSED** status (JA-14, APP-1, LOC-1 — see immediately below for what that status means and why).

**VERIFIED BY ARCHITECTURE/DISCLOSED** is for a row where no finite test could ever prove or disprove the requirement, but the system's own shape (or the client's own Comment column) settles it anyway. It is not a weaker synonym for BUILT UNVERIFIED and not a dodge — it exists specifically so these three rows have an honest, closed status instead of sitting in BUILT UNVERIFIED forever waiting for a test that can't be written:

- **JA-14 / APP-1** ("unlimited job adverts" / "unlimited candidates"): "unlimited" is unfalsifiable by any finite test — creating record N+1 only shows N+1 didn't hit an arbitrary cap, which proves nothing about "unlimited." No cap exists anywhere in the code (confirmed by code read), and the client's own Comment column in `docs/requirements-source.md` already reads "done (depends on storage subscription)" for both — the client themselves frames this as a disclosed plan-ceiling limitation, not an open behavioural gap.
- **LOC-1** ("work from multiple locations"): satisfied by what the system *is* — a cloud-hosted web app (Vercel frontend, Firebase backend) with a single shared backend, reachable identically from any browser anywhere. There is no location-dependent code path to exercise; a test asserting "this works from Nairobi and Addis" would just be asserting the app loads, which every other test in this suite already does.

These three are deliberately excluded from the Playwright flow suite below and always will be — not a gap in coverage, a correct absence of one. Their status does not change if the suite grows; nothing a browser or a Firestore read could check would move them.

### By section

| Section | Rows | VERIFIED | BUILT UNVERIFIED | OPEN | DEFERRED | VbA/D | NOT A FEATURE |
|---|---|---|---|---|---|---|---|
| Position requisition | 6 | 0 | 5 | 1 | 0 | 0 | 0 |
| Job Evaluation | 3 | 0 | 1 | 2 | 0 | 0 | 0 |
| Job advertisement | 15 | 2 | 3 | 7 | 2 | 1 | 0 |
| Job applications | 13 | 5 | 5 | 2 | 0 | 1 | 0 |
| Long Listing | 10 | 4 | 2 | 4 | 0 | 0 | 0 |
| Short Listing | 7 | 4 | 2 | 1 | 0 | 0 | 0 |
| Interviews | 4 | 0 | 2 | 2 | 0 | 0 | 0 |
| Reference checks | 2 | 0 | 2 | 0 | 0 | 0 | 0 |
| Offers & regrets | 5 | 2 | 3 | 0 | 0 | 0 | 0 |
| Flexibility | 3 | 1 | 1 | 1 | 0 | 0 | 0 |
| Metrics / Reports | 15 | 0 | 5 | 10 | 0 | 0 | 0 |
| Security | 4 | 1 | 1 | 2 | 0 | 0 | 0 |
| Backup and recovery | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| Integration | 2 | 0 | 0 | 2 | 0 | 0 | 0 |
| Training | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Data ownership | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Support & maintenance | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Archiving | 1 | 0 | 1 | 0 | 0 | 0 | 0 |
| Location independent | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| Government compliance | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| System architecture | 5 | 0 | 0 | 0 | 0 | 0 | 5 |
| Reliability | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| Data & templates mgmt | 5 | 0 | 1 | 4 | 0 | 0 | 0 |
| Customer service | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| **Total** | **110** | **19** | **34** | **40** | **2** | **3** | **12** |

## 2. The serious list — OPEN rows ranked by UAT visibility

| Rank | Row | Why the client will notice |
|---|---|---|
| 1 | SEC-3 | Recruiters and hiring managers can write anything the other can, at the rule layer — invisible until someone deliberately tests role separation, but a real gap against an explicit security requirement. |
| 2 | JA-3 | A tester picks "Pending" expecting an approval step; the advert goes live immediately. |
| 3 | LL-9 | "Share Profile" looks complete (opens an email draft) but silently omits the CV and cover letter the requirement names — easy to miss until someone checks what's actually in the email. |
| 4 | SL-6 | An already-submitted bio-data record can show as "not submitted" for a candidate with two shortlisted applications — looks like data loss. |
| 5 | FLEX-1 | Any data-migration test fails at step one — there is no import of any kind. |
| 6 | JA-4 (Cancelled) | A recruiter who wants to cancel an advert finds no way to do it. |
| 7 | BAK-1 | Unseen in UAT, but a real contractual risk if a restore is ever needed. |
| 8 | APP-3 | "Any other relevant document" has no upload control at all, despite being named in the requirement. |
| 9 | REP-9 / REP-10 / REP-14 | Several report labels ("Source of Hire," age/gender "ratios") don't match what they actually count — will mislead a reader who takes the label at face value. |
| 10 | LL-3 | "View Job Specification" opens the editor, not a read-only spec view, for the recruiter; hiring managers can't reach it at all. |

## 3. Built but never asked for

Carried forward from the old audit, re-checked against current code:

- Offer approval workflow (HM/admin approves before sending) — `OfferApprovalPage.tsx`
- Requisition priority colour-coding, "skip admin approval" fast-track
- Hiring team/coordinator on every job — stored, nothing downstream uses it
- "Featured job" toggle — still dead (saved, never read)
- Contact Us form — still dead and misleading ("Simulate API call" shows success, sends nothing)
- WhatsApp share link (beyond the LinkedIn/Twitter ask)
- In-app notification bell
- "Copy full candidate summary" to clipboard
- About Us and Terms pages
- Salary range, currency, tags, category, remote type on adverts
- LinkedIn Apply checkbox and employee-referral sub-form — removed (F13/F14), confirmed unrelated to any signed requirement

**New this session, arguably in this bucket:** the two standard screening questions and the per-question score/max export columns are in-scope build (LL-2/LL-8/JA-9), not "never asked for" — not listed here.

## 4. What UAT must cover (BUILT UNVERIFIED rows, prioritised)

Run on the **deployed** build, not localhost, so environment issues (CORS, role claim deployment) surface.

1. **Email templates not yet clicked through**: interview invitation (INT-1), referee reference request (REF-2), hiring-manager offer-status notice (OFF-2 — flagged as the single highest-value item), regret letter (OFF-4). All four are now BUILT UNVERIFIED, not BROKEN — but none has a confirmed result.
2. **Security re-verification in the real (not emulator) environment**: confirm the SEC-2 rule fixes are actually deployed to the production Firestore project, not just present in the repo.
3. **APP-10** job-alert subscription — the rule now passes automated tests; nobody has clicked the Subscribe button itself.
4. **LL-1** Screening-page sort by auto-scored answers — no named walkthrough exists despite the mechanism being real.
5. The remaining BUILT UNVERIFIED rows from Position requisition, Job advertisement and Job applications — see the old audit's own priority list (requisition-to-job walkthrough, advert lifecycle, candidate journey end to end); nothing about those paths changed this pass.

---

## ID mapping (new ID → old row)

Positional, by matching section order and count between `docs/requirements-source.md` and `docs/traceability-requirements.md`:

| Section | New IDs | Old rows |
|---|---|---|
| Position requisition | PR-1…PR-6 | 1.1…1.6 |
| Job Evaluation | JE-1…JE-3 | 2.1…2.3 |
| Job advertisement | JA-1…JA-15 | 3.1…3.15 |
| Job applications | APP-1…APP-13 | 4.1…4.13 |
| Long Listing | LL-1…LL-10 | 5.1…5.10 |
| Short Listing | SL-1…SL-7 | 6.1…6.7 |
| Interviews | INT-1…INT-4 | 7.1…7.4 |
| Reference checks | REF-1…REF-2 | 8.1…8.2 |
| Offers & regrets | OFF-1…OFF-5 | 9.1…9.5 |
| Flexibility | FLEX-1…FLEX-3 | 10.1…10.3 |
| Metrics / Reports | REP-1…REP-15 | 11.1…11.15 |
| Security | SEC-1…SEC-4 | 12.1…12.4 |
| Backup and recovery | BAK-1 | 13.1 |
| Integration | INTG-1…INTG-2 | 14.1…14.2 |
| Training | TRN-1…TRN-2 | 15.1…15.2 |
| Data ownership | OWN-1 | 16.1 |
| Support & maintenance | SUP-1…SUP-2 | 17.1…17.2 |
| Archiving | ARC-1 | 18.1 |
| Location independent | LOC-1 | 19.1 |
| Government compliance | GOV-1 | 20.1 |
| System architecture | ARCH-1…ARCH-5 | 21.1…21.5 |
| Reliability | REL-1 | 22.1 |
| Data & templates mgmt | DTM-1…DTM-5 | 23.1…23.5 |
| Customer service | CS-1 | 24.1 |

Confirmed by section-count match across both documents, and by direct wording match on the five rows given deep individual verification this session (LL-9=5.9, SL-5=6.5, JA-4=3.4, JA-8=3.8, FLEX-1=10.1).
