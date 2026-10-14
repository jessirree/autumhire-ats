# Requirements Traceability — Autumhire ATS

**What this is.** A line-by-line statement of what is delivered against the signed-off `RECRUITMENT SYSTEM REQUIREMENTS.docx.md`, for UAT and for the delivery conversation.

**Basis.** Static audit of branch `feat/change-requests-wave-a-d` at commit `428b8ba`, 2026-10-03. Each claim is traced through four layers:

1. UI
2. Service
3. Firestore or Storage write/read
4. The security rule that permits it

No code was run for this audit. VERIFIED means someone has actually used the feature: a walkthrough item in `docs/manual-qa-checklist.md`, or a client request confirmed by that walkthrough (requests 8–14). No row was upgraded to VERIFIED on the strength of this audit's reading alone.

**Numbering.** The requirements document does not number its rows. They are numbered here `stage.row` in document order.

## How to read the statuses

| Status | Meaning for UAT |
|---|---|
| **VERIFIED** | Someone has used it and it worked. Low risk. |
| **IMPLEMENTED, UNTESTED** | The whole path exists, including a security rule that allows it, but nobody has used it end to end yet. **This is where UAT should spend its time.** It is not a criticism. |
| **PARTIAL** | Part of the requirement works and part does not. The evidence says which part. |
| **BROKEN** | Code exists but fails when used. |
| **NOT IMPLEMENTED** | Nothing in the system addresses it. |
| **N/A** | A commercial or process question, not software. |

---

## Cross-cutting findings (read these first)

These affect several rows. They are stated once here and referenced from the tables.

### X1. No email is ever sent

`notify()` (`src/services/notificationService.ts:42-62`) writes a row to the `Notifications` collection. The code comment at `:38-41` calls this collection "the outbox for a future email sender", but no sender exists. `functions/index.js` contains only `syncUserRoleClaim`.

The in-app notification itself works:
- Notifications create is allowed by `firestore.rules:143`.
- Staff see it in the bell (`DashboardLayout.tsx:41`), and candidates see it on their dashboard (`CandidateDashboard.tsx:250`).
- Nothing reaches an inbox.

**Rows classified BROKEN for this reason:** 4.12 application confirmation · 7.1 interview invitation · 8.2 referee email · 9.2 hiring-manager update · 9.4 regret letters.

Also affected, but classified on their other merits:
- 2.3 grade-approval notice (staff-facing; the in-app notice does work)
- 4.10 job alerts (fail earlier, at the rule layer)
- 23.2 email templates (nothing can send them)

### X2. A collection is written with no security rule

Every collection written in `src/` was grepped against `firestore.rules`. One has no `match` block:

| Collection | Written by | Effect |
|---|---|---|
| **`JobAlerts`** | `src/services/jobAlertService.ts:20-61` (subscribe, unsubscribe, isSubscribed, notifySubscribers) | All four operations are denied. This is the same failure as the old AuditLog problem. See row 4.10. |

Every other collection in use has a rule block: Users, Positions, Counters, Requisitions, Jobs, Applications (plus comments and ratings), BioData, Interviews, Offers, ReferenceChecks, Notifications, QuestionBank (plus choices), Templates, Workflows and AuditLog.

- The **AuditLog block is present** at `firestore.rules:177-182`: append-only, creatable only by the acting user, readable by admins.
- `Requisitions/{id}/approvals` has a rule (`:47-51`) but no code uses it. That is harmless.
- Storage paths in use (`job-descriptions/`, `public/`, `profiles/`, `applications/`) all match `storage.rules:21-49`.

### X3. Access control holes in `firestore.rules`

These are found by reading the rules. Confirm them in the Firebase Rules Playground before quoting them externally.

1. **Anyone can make themselves an admin.** `match /Users` create (`firestore.rules:26`) allows any signed-in user to create their own Users document and does not restrict the `role` field. Only *update* protects `role` (`:27-29`).
   - Using the public web config, a person can create an Auth account and write `role: 'admin'` directly.
   - `syncUserRoleClaim` (`functions/index.js:15-33`) then also grants the admin storage claim.
   - The app's own signup writes `candidate` (`AuthContext.tsx:95-100`), so this cannot be seen through the UI.
2. **Every signed-in user can read every user document.** The rule is `allow read: if isSignedIn()` (`firestore.rules:25`).
   - Candidate profiles live on the Users document: date of birth, gender, nationality, phone, city, and the CV download URL (`profileService.ts:25-34, :47`).
   - So any candidate can list every other candidate's personal data and open their CV.
   - This is a data-protection exposure (Kenya DPA).
3. **Deactivating a user does nothing.**
   - UserManagement sets `status: 'inactive'` (`UserManagement.tsx:136-149`).
   - Nothing reads that field: not `AuthContext.fetchUserProfile` (`:35-49`), not `ProtectedRoute`, and not any rule.
   - A deactivated staff member keeps full access.
4. **Smaller exposures:**
   - Any signed-in user can create a notification addressed to anyone (`firestore.rules:143`), so a candidate can plant messages in a staff member's bell.
   - Candidates can read their own Interview documents, including panel scores and comments (`:113-114`).
   - Candidates can read their own Application documents, including `statusHistory` rationale, `prescreenScore` and `panelRatingAvg` (`:71-72`).
   - The UI doesn't show these, but the API returns them.
5. **Business rules are enforced only in the browser.** The rules let any staff role write any field of Requisitions, Jobs, Applications and Offers (`:42-46, :63, :78, :125`). The requisition approval chain, the duplicate-application check and advert completeness are all client-side checks.

### X4. Errors that are still swallowed around persistence

The audit-trail lesson applies here: each of these can fail with no visible symptom.

| Where | What fails silently |
|---|---|
| `CreateJob.tsx:446` | Linking a requisition to its published job (requisition can stay "Approved" and be published twice) |
| `CreateJob.tsx:451`, `JobAdvertsPage.tsx:166, 178, 213` | RSS feed regeneration |
| `CreateJob.tsx:455` | Job-alert fan-out (always fails today, see X2) |
| `jobService.ts:148` | Auto-closing expired adverts |
| `requisitionService.ts:171` | Bare `catch {}`. If the role lookup fails, recruiters/admins are silently not told about a requisition |
| `CandidateDashboard.tsx:62` | Bio-data status read (see 6.6) |
| `JobBoard.tsx:90`, `AdminDashboard.tsx:48, 50` | Subscription status, templates count, audit log load |

### X5. Deployment dependencies that code reading cannot confirm

1. **CORS.** `cors.json:3` lists only `localhost` origins. The mass CV download fetches files from Storage and will fail on the deployed Vercel URL; `manual-qa-checklist.md:215-216` already says not to demo it there.
2. **Staff file uploads** depend on `syncUserRoleClaim` being deployed, because `storage.rules` reads the role from the auth claim. This covers job-description attachments and the RSS feed (`manual-qa-checklist.md:347-350`).
3. **Indexes** were deployed in F2a.

---

## Position requisition

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1.1 | Pre-loading of all current job positions | IMPLEMENTED, UNTESTED | Admin → Job Positions (`PositionsPage.tsx:67-69, 85`) → `requisitionService.createPosition/updatePosition` (`:121-139`) → `Positions` → `firestore.rules:32-35` (staff read, admin write). Positions are entered one at a time; there is no bulk import. Position changes are not written to the audit trail. |
| 1.2 | Positions, and vacancies linked to positions | IMPLEMENTED, UNTESTED | A requisition is raised against a position (`NewRequisitionPage.tsx:68-80`) and stores `positionId` plus `vacancies` (`requisitionService.ts:211-229`) → `Requisitions` create, staff (`firestore.rules:44`). A published job links back via `requisitionId` (`CreateJob.tsx:388-391`). Jobs posted directly by an admin (request 1) carry no position link. |
| 1.3 | Single/multiple levels of approval of the requisition | PARTIAL | **Works:** hiring-manager-raised requisitions go recruiter refine → HM confirm → admin approve/reject, with a documented "skip admin approval" option (`requisitionService.ts:240-367`; UI `JobRequisitionsPage.tsx:72-95`, `RequisitionApprovals.tsx:50-89`). **Fails:** recruiter-raised requisitions. `sendForConfirmation` notifies the creator, i.e. the recruiter (`requisitionService.ts:270-276`), and the HM queue only shows rows the viewing HM created (`RequisitionApprovals.tsx:44-48`), so no hiring manager can ever confirm them. This is the "it disappears" complaint, client request 3, not yet built. The number of levels is fixed, not configurable, and the chain is enforced only in the browser (X3.5). |
| 1.4 | Attach job description to the requisition | IMPLEMENTED, UNTESTED | Upload control `NewRequisitionPage.tsx:256-297` → `createRequisition` uploads to `job-descriptions/{REQ}/{file}` (`requisitionService.ts:203-209`) → `storage.rules:21-24` (staff read/write via role claim). Preview/download for HM/admin at `RequisitionApprovals.tsx:148-166`. Depends on `syncUserRoleClaim` being deployed (X5). |
| 1.5 | Define whether internal or external advert | IMPLEMENTED, UNTESTED | Radio `NewRequisitionPage.tsx:193-208` → `advertType` on the requisition → carried into the job builder (`CreateJob.tsx:310`) → `Job.advertType` (`:358`). What "internal" then means for candidates: see 3.15. |
| 1.6 | Auto-generate job reference number | IMPLEMENTED, UNTESTED | `REQ-YYYY-####` (`requisitionService.ts:143-155`) and `JOB-YYYY-####` (`jobService.ts:100-112`), each a transaction on `Counters` → `firestore.rules:37-40` (staff). Publishing a job was broken until F1 (`qa-fixes-2026-10-02.md` F1); the fix awaits retest of walkthrough 5.1–5.2. |

## Job Evaluation

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 2.1 | Accept definition of the job grade from the Job Evaluation Manager/Tool | IMPLEMENTED, UNTESTED | Grade hint on the position (`PositionsPage.tsx:235-241`) prefills the mandatory grade on the requisition (`NewRequisitionPage.tsx:47-53, 150-162`) → `Requisitions` (`firestore.rules:44-45`). Entry is manual; there is no integration with an external evaluation tool. |
| 2.2 | Do not allow proceeding unless the job grade is input | PARTIAL | **Requisition path enforced:** button disabled (`NewRequisitionPage.tsx:55`) and the service throws (`requisitionService.ts:176-180, 198, 248`). **Gap:** the `Job` model has no grade field at all (`jobService.ts:51-90`), and an admin can publish a job without a requisition (request 1). So a live advert can have no grade. |
| 2.3 | Notify hiring manager of the job grade for their approval | PARTIAL | `sendForConfirmation` sends an in-app notice to the requisition's creator (`requisitionService.ts:270-276`); the HM confirmation screen shows the grade (`RequisitionApprovals.tsx:143`). In-app only, no email (X1). The notice goes to the creator, so recruiter-raised requisitions never reach an HM (see 1.3). |

## Job advertisement

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 3.1 | Standard template for job adverts | PARTIAL | Admins can author "Job Ad" templates (`TemplateManagement.tsx:96-110` → `templateService.ts:38-74` → `Templates`, `firestore.rules:163-166`). **The job builder never loads them:** `getTemplates`/`renderTemplate` have no caller outside Template Management and the admin dashboard count. The working substitute is "Duplicate Job" (`CreateJob.tsx:481-499, 688-712`). |
| 3.2 | Disallow posting incomplete adverts (title, location, contract type, grade…) | PARTIAL | Title, location, contract type and description are enforced in the wizard (`CreateJob.tsx:404-415, 509-523`) and the service (`jobService.ts:160-164`). Contract type always has a default (`CreateJob.tsx:117`). **Grade cannot be enforced:** it is not a field on a job (see 2.2). |
| 3.3 | Single/multiple levels of approval of the advert | NOT IMPLEMENTED | No advert approval exists. The wizard offers a "Pending" status (`CreateJob.tsx:750-759`, default `:114`), but any new job saved as non-draft is forced to `Active` (`CreateJob.tsx:427-433`) and goes live immediately. |
| 3.4 | Job statuses: Pending, Cancelled, Re-advertised, Internal (not public), Re-opened | PARTIAL | **Works:** Re-advertised/Re-opened via `reopenJob` (`jobService.ts:196-208`); Closed; Draft; Internal as `advertType`, kept off the public site by rule (`firestore.rules:58-62`). **Gaps:** Pending is overridden on publish (3.3). `Cancelled` exists in the type (`jobService.ts:28`) and the filter (`JobAdvertsPage.tsx:290`), but no control ever sets it. |
| 3.5 | Advert page customisable for unique positions, e.g. consultancies | PARTIAL | Per-job rich-text description, screening questions, required documents, salary and tags (`CreateJob.tsx` steps 1–3). The page layout and field set are fixed; there are no position-type-specific fields (deliverables, duration, day rate). |
| 3.6 | Re-open closed jobs; status automatically "Re-advertised" | IMPLEMENTED, UNTESTED | "Re-open" action (`JobAdvertsPage.tsx:170-180, 542`) → `reopenJob` sets `Re-advertised` plus an optional new closing date (`jobService.ts:196-208`) → `Jobs` update, staff (`firestore.rules:63`). Audited (`:207`). |
| 3.7 | Automatic closure after closing date unless re-opened | IMPLEMENTED, UNTESTED | Candidates cannot see or apply past the date: the public list filters (`jobService.ts:273`), the detail page shows "no longer available" (`JobDetail.tsx:33`, `isJobOpen` `jobService.ts:292-294`), and the apply guard is at `applicationService.ts:218-221`. **Caveat:** there is no scheduled job. The stored status only flips to Closed when a staff member next loads a job list (`jobService.ts:137-152, 221`), and that write's error is swallowed (`:148`). Until then, reports count the job as an open vacancy. |
| 3.8 | RSS feeds to share/broadcast adverts (LinkedIn, Twitter…) | IMPLEMENTED, UNTESTED | "RSS feed" button (`JobAdvertsPage.tsx:94-114`) → `regenerateJobsFeed` builds RSS 2.0 from public jobs and uploads to `public/jobs-feed.xml` (`feedService.ts:35-54`) → `storage.rules:27-30` (world read, staff write). Share intents for LinkedIn/X/WhatsApp at `feedService.ts:58-74`, `JobAdvertsPage.tsx:565`. Automatic regeneration after publish/close is swallowed (X4). Nothing auto-posts to social sites; someone has to consume the feed. |
| 3.9 | Support for pre-screening questions | IMPLEMENTED, UNTESTED | Admin question bank (`PrescreeningBuilder.tsx:165` → `questionBankService.ts:71-128` → `QuestionBank`/`choices`, `firestore.rules:151-160`, admin write) and per-job questions (`CreateJob.tsx` step 3, payload `:367-385`). Candidates answer them (`ApplicationForm.tsx:482-500`); answers stored and scored (`applicationService.ts:244-251, 268`). The walkthrough's question data was seeded by script, so authoring and answering through the UI have not been exercised. |
| 3.10 | Minor editing of posted jobs | IMPLEMENTED, UNTESTED | Edit routes (`App.tsx:358, 401-403`) → `updateJob` (`jobService.ts:179-188`) → `Jobs` update, staff. **Caveats:** every save of an Active job resets `postedAt` (`jobService.ts:185`), which re-dates the advert, and re-runs the subscriber fan-out (`CreateJob.tsx:449-456`). |
| 3.11 | Set/define scores for pre-screening answers during long listing | PARTIAL | Answer points are defined when the job is built and scored automatically on submission (`applicationService.ts:134-163`). During long-listing a recruiter can only override the **total** (`CandidateDetail.tsx:86-90, 372-383` → `setPrescreenScore` `applicationService.ts:461-471`). There is no per-answer re-scoring. |
| 3.12 | Confidential jobs that do not appear on the main page | IMPLEMENTED, UNTESTED | Checkbox `CreateJob.tsx:762-784` → `isConfidential` → excluded by the public query (`jobService.ts:267`) **and** by the rule (`firestore.rules:61`). The checkbox text promises "published on internal boards" (`CreateJob.tsx:779-781`); no internal board exists. |
| 3.13 | Customisation of the advert link | NOT IMPLEMENTED | Links are always `/jobs/{JOB-YYYY-####}` (`feedService.ts:58-60`, `App.tsx:286`). There is no slug or custom URL. |
| 3.14 | Unlimited job adverts | IMPLEMENTED, UNTESTED | No cap anywhere. The yearly counter pads to four digits but keeps counting past 9999 (`jobService.ts:111`). |
| 3.15 | Internal adverts that do not appear on the main page | PARTIAL | **Hidden: works.** Internal jobs are excluded from the public site (`firestore.rules:62`, `jobService.ts:268`). **But nobody can apply.** The Jobs rule lets only staff read non-public adverts (`firestore.rules:58-62`), and staff cannot use the candidate apply route. A candidate opening an internal advert gets null from `getJobById` (`jobService.ts:282-289`), so the page says "Job is no longer available" and applying throws (`applicationService.ts:218-221`). There is no internal job board. |

## Job applications

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 4.1 | Unlimited number of candidates | IMPLEMENTED, UNTESTED | No cap. **Scale caveat:** staff pages load the entire `Applications` collection client-side with no paging (`applicationService.ts:324-328`, used by Applications, Screening, Shortlisting, Interviews, Offers, Reports and Job Adverts). Untested at volume. |
| 4.2 | Candidates set a profile and upload a CV reusable across applications | IMPLEMENTED, UNTESTED | **Profile half VERIFIED** (walkthrough 1.1–1.6, request 8): `CandidateDashboard.tsx:164-183` → `updateCandidateProfile` (`profileService.ts:25-34`) → `Users` update by owner (`firestore.rules:28-29`). **CV half untested:** upload `CandidateDashboard.tsx:185-202` → `profiles/{uid}/` (`profileService.ts:37-49`) → `storage.rules:33-39` (owner, PDF, <10 MB). Reused when applying: `ApplicationForm.tsx:397-409, 166-169`. |
| 4.3 | Checklist of necessary documents (cover letter, CV, any other relevant document) | PARTIAL | A per-job CV and cover-letter checklist is shown and enforced (`ApplicationForm.tsx:392-395`; job toggles `CreateJob.tsx:1110-1153`). **"Any other relevant document" has no upload control.** The service supports `otherFiles` (`applicationService.ts:262-265`) but the form never passes them. |
| 4.4 | Alert if necessary documents are not attached | IMPLEMENTED, UNTESTED | Native `required` on the file inputs (`ApplicationForm.tsx:436, 470`), plus the service throws a readable error (`applicationService.ts:234-241`), shown at `ApplicationForm.tsx:252-257`. |
| 4.5 | Cannot apply to closed jobs; closed link shows "job is no longer available" | IMPLEMENTED, UNTESTED | Detail page shows the message (`JobDetail.tsx:33-47`); a candidate's read of a Closed job is denied by rule (`firestore.rules:59`) and becomes "not found" (`jobService.ts:282-289`); the apply service re-checks (`applicationService.ts:218-221`). **Caveat:** opening the `/jobs/:id/apply` link directly redirects silently to `/jobs` instead of showing the message (`App.tsx:137-139`). |
| 4.6 | Determine whether the applicant has applied before (various or same positions) | IMPLEMENTED, UNTESTED | "Other Applications by This Candidate" panel (`CandidateDetail.tsx:330-350`) from `getApplicationsByCandidate` (`applicationService.ts:174-179`). Matches by account only, so the same person with a second account is not detected. |
| 4.7 | No duplicate application for the same job | IMPLEMENTED, UNTESTED | The form blocks with "You've already applied" (`ApplicationForm.tsx:76-82, 122-140`); the service throws (`applicationService.ts:229-231`). Enforced in the browser only; the rules do not prevent a second create (X3.5). |
| 4.8 | Determine whether the applicant has worked for the organisation before | IMPLEMENTED, UNTESTED | Self-declared checkbox (`ApplicationForm.tsx:340-351`) → `workedHereBefore` → "Ex-employee" badge (`CandidateDetail.tsx:214`). Not verified against any HR record. |
| 4.9 | Determine whether applicants are internal candidates | IMPLEMENTED, UNTESTED | Self-declared checkbox (`ApplicationForm.tsx:352-363`) → `isInternal` → badge (`CandidateDetail.tsx:213`) and the internal hire ratio report (`ReportsPage.tsx:199-201`). |
| 4.10 | Candidates subscribe to Autumhire jobs | **BROKEN** | `JobAlerts` has **no rule block** (X2), so every operation is denied. The subscribe button (`JobBoard.tsx:93-111`) calls `subscribeToJobAlerts` (`jobAlertService.ts:23-30`), Firestore rejects it, and the candidate sees a "Missing or insufficient permissions" toast. The status check fails silently (`JobBoard.tsx:90`), and the publish-time fan-out (`CreateJob.tsx:452-455`) fails silently. Delivery would also need email (X1). |
| 4.11 | Capture age, gender, nationality, city/country of residence | IMPLEMENTED, UNTESTED | All required fields on the application form (`ApplicationForm.tsx:274-339`), prefilled from the profile (`:51-73`), stored on the application (`applicationService.ts:278-282`) → create rule `firestore.rules:73-77`. Date of birth on the profile is VERIFIED (walkthrough 1.2–1.6). Nationality is free text, so reports split variants such as "Kenyan" and "kenyan". |
| 4.12 | Automatic alert to candidates when they submit applications | **BROKEN** | No email (X1). An in-app row is written (`applicationService.ts:303-310`); the success toast even promises "You will receive a confirmation notification" (`App.tsx:145-147`). |
| 4.13 | Declaration that information is correct and false information disqualifies | IMPLEMENTED, UNTESTED | Mandatory checkbox with that wording (`ApplicationForm.tsx:505-523`); the service rejects without it (`applicationService.ts:224-226`); **the rule also requires `consentGiven == true`** (`firestore.rules:76`). Enforced in all three layers. |

## Long Listing

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 5.1 | Preliminary long list by matching applicant details to job specifications | **CLOSED, 2026-10-15** | Client decision: closes on the pre-screening question score (Option 1, docs/wave-g-brief.md §4). Candidates are ranked by their auto-scored screening answers (`applicationService.ts:134-163`; Screening page sorts by score `ScreeningPage.tsx:75-88`), authored per job from the job's own requirements — a genuine comparison against the specification, just not a structured-field one. The structured skills/capability matching that was built (candidate-matching-spec.md) is parked behind `MATCHING_ENABLED = false` pending AI funding, not deleted. |
| 5.2 | Define scores for the pre-screening questions | IMPLEMENTED, UNTESTED | Points per question or choice in the question bank (`questionBankService.ts:71-128`, admin rule `firestore.rules:153, 158`) and per job (`CreateJob.tsx:367-385, 1282-1286`). |
| 5.3 | Access to position and candidate specifications for easy reference | PARTIAL | Candidate spec: full detail page (`CandidateDetail.tsx`). Job spec: the "View Job Specification" button opens the **job editor** (`CandidateDetail.tsx:169-176`), not a read-only view. For hiring managers, who share this page (`hiring-manager/CandidateDetail.tsx:5`), it routes to `/recruiter/...` and they are bounced to their dashboard (`ProtectedRoute.tsx`). HMs do see shortlisting criteria (`ShortlistingPage.tsx:218-222`). |
| 5.4 | Online tracking of applicants through each stage | IMPLEMENTED, UNTESTED | Every status change appends to `statusHistory` (`applicationService.ts:391-402`) → Applications update, staff (`firestore.rules:78`). Shown to staff (`CandidateDetail.tsx:352-364`) and to the candidate as a timeline (`CandidateDashboard.tsx:204-215, 375`). |
| 5.5 | Query facility to search applicants and drill into detailed resume information | VERIFIED | Search on Applications/Candidates (`ApplicationsPage.tsx:103-110`, `CandidatesPage.tsx:126-128`) → detail page with documents, answers and ratings (`CandidateDetail.tsx`). **Walkthrough 4.11** (search with job filter, request 9) and **4.36** (detail page, request 13). Search covers name, email, job and role, not CV text. |
| 5.6 | Data bank of CVs with personal details, competencies, experience, academics; identify application source | **DEFERRED, 2026-10-15** | CV kept as a PDF (`applicationService.ts:286`); personal details and **source** captured (`ApplicationForm.tsx:364-378` → `:285`; shown `CandidateDetail.tsx:271-272`; Source report). Structured competency/experience/education fields were built (`profileService.ts`'s capability profile) but are deferred to the AI phase by client decision — gated behind `MATCHING_ENABLED = false`, not deleted. |
| 5.7 | Bulk changes to applicant status in one activity/screen | VERIFIED | Select-all plus a bulk action (`ApplicationsPage.tsx:34-39, 126-139`) → `bulkUpdateStatus`, one batched write (`applicationService.ts:423-458`) → Applications update, staff (`firestore.rules:78`). **Walkthrough 4.11** (bulk action with filter on, request 9). |
| 5.8 | Reports identifying best-match profiles by comparing required vs existing competencies | **DEFERRED, 2026-10-15** | Built (`BestMatchReport.tsx`, under Reports) but deferred to the AI phase by client decision — gated behind `MATCHING_ENABLED = false`, not deleted. Screening score is the only ranking while gated. Overlaps client request 15 (AI ratings, separate phase). |
| 5.9 | Share candidate profiles, questionnaire, CV and cover letter by email | PARTIAL | "Share Profile" opens a `mailto:` draft with a short summary (`shareCandidateProfile.ts:116-129`); the questionnaire is included only as a count. "Copy Full Summary" copies the full questionnaire to the clipboard (`:135-146`). **The CV and cover letter are not attached or linked.** |
| 5.10 | Download applicants' CVs, cover letters etc. with automatic renaming | PARTIAL | **Bulk CV zip VERIFIED** on localhost (**walkthrough 4.12–4.22**, request 10): renamed `{REF}_{Name}_CV.pdf` (`downloadJobCvs.ts:70`). **Gaps:** (a) cover letters and other documents are not in the zip; (b) single-document "Download" uses the `download=` attribute (`CandidateDetail.tsx:318`), which browsers ignore for cross-origin Storage URLs, so those files are not renamed; (c) **the zip will fail on the deployed site**, because `cors.json:3` allows only localhost (X5). |

## Short Listing

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 6.1 | Share the long list with the hiring manager and panel | VERIFIED | The Shortlisting page lists longlisted, shortlisted and rejected applications (`ShortlistingPage.tsx:198-231`). **Walkthrough 2.1–2.2** (`hm@` sees the five seeded candidates; Daniel, status `applied`, absent). |
| 6.2 | Update status after shortlisting | IMPLEMENTED, UNTESTED | Shortlist/Reject with rationale (`ShortlistingPage.tsx:287-301`) → `updateApplicationStatus` (`applicationService.ts:384-420`) → Applications update, staff. Walkthrough 8.3 covers this but no result is recorded. |
| 6.3 | Collaboration between panel members without affecting results | VERIFIED | 1–3 panel ratings with isolation: no average, names or scores until you have rated (`ShortlistingPage.tsx:92-168`); ratings rule binds document id = panelist uid and score 1–3 (`firestore.rules:89-98`). **Walkthrough 2.3–2.17, 3.1–3.3, Rules Playground 6.1–6.8** (request 13). Open design question 2.27 (sorting by rating before rating) still awaits the client's answer. |
| 6.4 | Rationale and comments to support shortlisting decisions | VERIFIED | Rating comments (`ShortlistingPage.tsx:267-285` → `setPanelRating` `applicationService.ts:526-570`) — **walkthrough 2.15–2.16**. The comment showing in the hover breakdown was fixed in F3 and awaits retest. Notes (`ShortlistingPage.tsx:303-316` → comments subcollection `firestore.rules:82-85`) were seen on the detail page by the tester (`qa-fixes` F3). |
| 6.5 | Create criteria to be used for shortlisting | IMPLEMENTED, UNTESTED | Per-job "Shortlisting Criteria" (`CreateJob.tsx:1155-1171` → `Job.shortlistingCriteria`) shown to HMs next to each role (`ShortlistingPage.tsx:218-222`). Free-text guidance, not a scored rubric. |
| 6.6 | Shortlisted candidates fill bio-data online | PARTIAL | **Submit path works:** "Complete Bio-Data" on the candidate dashboard (`CandidateDashboard.tsx:378-435`) → `submitBioData` (`bioDataService.ts:25-37`) → `BioData` create by owner (`firestore.rules:106-108`). **Status read fails for a record not yet submitted:** for a candidate, the read rule references `resource.data.candidateId` (`firestore.rules:104-105`), and on a document that doesn't exist yet `resource` is null, so the read is denied. One pending record fails the whole `Promise.all`, the error is swallowed (`CandidateDashboard.tsx:62`), and already-submitted records show as "not submitted". Only national ID and postal address are collected. |
| 6.7 | Specified duties of the hiring manager on every page | IMPLEMENTED, UNTESTED | `DutyBanner` on every HM page: dashboard (`HiringManagerDashboard.tsx:108-111`), requisitions (`RequisitionApprovals.tsx:93-98`), shortlisting (`ShortlistingPage.tsx:334-337`), candidate detail (`CandidateDetail.tsx:157-162`), interviews (`InterviewsPage.tsx:154-157`), offer approvals (`OfferApprovalPage.tsx:43-46`). Static text. |

## Interviews

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 7.1 | Load and share interview schedules using interview templates | **BROKEN** | Scheduling itself works (`InterviewsPage.tsx:85-114` → `scheduleInterview` `interviewService.ts:56-101` → `Interviews` create, staff `firestore.rules:115`). **Sharing fails:** the invitation is never delivered (X1, `interviewService.ts:91-98`), and the candidate dashboard shows no interview date, time or location (only a count, `CandidateDashboard.tsx:295-301`). **Templates are never used:** "Interview" templates can be authored but nothing applies them (see 3.1). |
| 7.2 | Load interview questions | IMPLEMENTED, UNTESTED | Free-text questions, one per line, per interview (`InterviewsPage.tsx:102`) stored on the interview (`interviewService.ts:81`). Not drawn from the question bank. |
| 7.3 | Record interview scores and results with detailed comments | IMPLEMENTED, UNTESTED | Per-panelist score 0–100 plus comments (`InterviewsPage.tsx:116-126` → `recordPanelScore` `interviewService.ts:119-128`); result and notes on completion (`:130-143`) → Interviews update, staff. **Caveats:** `recordPanelScore` rewrites the whole `scores` array from the copy the browser loaded (`:123-126`), so two panelists saving at nearly the same time can wipe each other's score. Score entry is not audited. |
| 7.4 | Generation of interview reports | IMPLEMENTED, UNTESTED | "Print report" (`InterviewsPage.tsx:523`) → `printInterviewReport` builds a printable HTML report with per-panelist scores, average and consensus (`src/lib/printInterviewReport.ts`). Read-only, using interview data already loaded. |

## Reference checks

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 8.1 | Resourcing team performs reference checks on the selected candidate | IMPLEMENTED, UNTESTED | "Add Referee" (`CandidateDetail.tsx:483-529`) → `createReferenceCheck` (`offerService.ts:269-287`) → `ReferenceChecks` (`firestore.rules:134-137`, staff); "Record response" (`CandidateDetail.tsx:121-127` → `:296-298`). Referees are not collected on the application form, so staff type them in. Responses are not audited. |
| 8.2 | Auto-generated reference email, picking details from the advert, to the referees | **BROKEN** | The email **text** is generated (`offerService.ts:257-267`), but from the application (job title, department), not the advert. **Nothing is sent** (X1): the record is saved with `status: 'sent'` immediately (`:281`), so the UI shows "Awaiting response" for an email that never left. Manual workaround: "Open email draft" `mailto:` (`CandidateDetail.tsx:566-571`). |

## Offers & regrets

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 9.1 | Status for "offer accepted" / "offer rejected" | IMPLEMENTED, UNTESTED | Candidate accepts or declines on the dashboard (`CandidateDashboard.tsx:69-85, 254-275`) → `respondToOffer` (`offerService.ts:134-151`) → the Offers rule allows the candidate to flip only `status` from `sent` to `accepted`/`rejected` (`firestore.rules:125-130`). Staff can also record it (`OffersPage.tsx:119-130` → `:223-252`). |
| 9.2 | Notify the hiring manager of the status of the process | **BROKEN** | No email (X1), **and the in-app notice goes to the wrong person.** Offer decisions notify `offer.createdById`, the recruiter who drafted the offer (`offerService.ts:143-149, 244-250`). `OffersPage` never passes the `notifyUserId` override (`OffersPage.tsx:125`). The HM is notified only when asked to approve an offer (`:104-112`). |
| 9.3 | Status updated to "Hired" on the candidate's acceptance | IMPLEMENTED, UNTESTED | After the candidate accepts, the recruiter clicks "Finalize hire" (`OffersPage.tsx:102-117` → `finalizeHire` `offerService.ts:157-170`), or records the acceptance (`:223-237`), which sets the application to `hired`. This is a deliberate recruiter step, not automatic. |
| 9.4 | Send regret notification to shortlisted candidates who are not hired | **BROKEN** | No email (X1). The in-app regret is written (`applicationService.ts:405-418`). **Also:** `sendRegretsForJob` regrets every non-hired application for the job, including ones still at `applied` that were never screened (`applicationService.ts:639-641`), not just shortlisted candidates. |
| 9.5 | Simple mechanism to move people through the cycle and the successful candidate into onboarding | IMPLEMENTED, UNTESTED | Pipeline actions (`CandidateDetail.tsx:231-248`, bulk `ApplicationsPage.tsx`) plus an "onboarding handoff" CSV of accepted offers (`OffersPage.tsx:133-150`, fixed F12). No integration with an onboarding system; the CSV excludes the bio-data fields. |

## Flexibility

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 10.1 | Import data from Excel, documents such as photos, referees and email attachments | NOT IMPLEMENTED | No import anywhere: no spreadsheet parser (the only spreadsheet code is the export, `exportApplicationsXlsx.ts`). Uploads are limited to PDF CV and cover letter (`storage.rules:47-48`). No photo, referee or email-attachment import. |
| 10.2 | Calculation functions, e.g. number of days | IMPLEMENTED, UNTESTED | Age from date of birth (`ReportsPage.tsx:36-41`), days to hire (`:176-191`), averages (`interviewService.ts:151-155`, `applicationService.ts:552`). Built-in only; no user-defined calculations. Accuracy issues are under 11.6 and 22.1. |
| 10.3 | Sort function, search function | VERIFIED | **Walkthrough 2.18–2.26** (shortlisting sort, including the accented name and unrated-last checks), **4.38–4.39** (candidates sort), **4.11** (search) — requests 9 and 14. |

## Metrics / Reports

Reports page: `src/pages/admin/ReportsPage.tsx`, reachable by admin and recruiter (**walkthrough 4.1–4.4 VERIFIED**, request 11); not by hiring managers. Data comes from Applications, Interviews and Jobs, all staff reads.

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 11.1 | Multiple report views: spreadsheets, graphical (pie charts, timeline…) | PARTIAL | Spreadsheets VERIFIED: CSV (`:216-228`, **walkthrough 4.43**) and per-job Excel (`:77-100`, **4.24–4.35**). Pie and bar charts present. **No timeline view.** The "Custom Range" date option (`:283`) has no handler and behaves as all-time. |
| 11.2 | Recruits per department, directorate, etc. | PARTIAL | Hires per department in the funnel chart (`:163-173, 398-412`). **No directorate (or other org-level) field exists.** |
| 11.3 | Graphs: Gantt chart, pie charts, bar graphs | PARTIAL | Pie (`:328-348`) and bar (`:350-412`). **No Gantt chart.** |
| 11.4 | Age ratio | IMPLEMENTED, UNTESTED | Age-band chart from the applicant's date of birth (`:132-148, 350-361`). Counts **applicants**, not hires. |
| 11.5 | Cost per hire | IMPLEMENTED, UNTESTED | Sum of manually entered `recruitmentCost` (`CreateJob.tsx:1860-1873`) for jobs with hires, divided by hires (`ReportsPage.tsx:205-211`). Only as good as the cost entries; the hire count is date-filtered but the cost is not. |
| 11.6 | Time taken to fill a position | PARTIAL | Calculated from application date to the hired application's `updatedAt` (`:176-191`). `updatedAt` changes on any later edit (archiving, ratings), so the figure drifts upward. The clock starts at application, not at requisition or advert. Grouped by month, not per position. The correct hire date already exists in `statusHistory` but is unused. |
| 11.7 | Vacancy costs | IMPLEMENTED, UNTESTED | Sum of `recruitmentCost` on open adverts (`:212-214`). Includes past-deadline adverts not yet auto-closed (3.7). |
| 11.8 | Turnover rate | NOT IMPLEMENTED | No employee or exit data exists; arguably outside an applicant tracking system. Worth agreeing with the client. |
| 11.9 | Source of job adverts | PARTIAL | Chart of applications by source (`:150-161, 366-381`). **Mislabelled:** it is titled "Source of Hire" and the series is named `hires`, but it counts all applications. |
| 11.10 | Age-band hire ratio (30–40, 40–50, 50–60) | PARTIAL | The bands exist (`:133-140`) but count **applicants, not hires**. Boundaries are inconsistent: 40-year-olds fall in "30-40" and "40-50" starts at 41. Under-18s are silently dropped. |
| 11.11 | Nationality | IMPLEMENTED, UNTESTED | Top-8 applicant nationalities (`:414-445`). Free-text input splits spelling variants (4.11). |
| 11.12 | Ad-hoc reports | PARTIAL | Date and department filters, plus raw CSV/Excel exports for analysis in Excel. No in-app ad-hoc query or report builder. |
| 11.13 | Internal candidates hired ratio | IMPLEMENTED, UNTESTED | `isInternal` hires ÷ hires (`:199-201`). Relies on the candidate's self-declaration (4.9). |
| 11.14 | Gender hire ratio | PARTIAL | The gender pie counts **applicants**, not hires (`:119-130`). No hire-by-gender figure. |
| 11.15 | Ability to create our own reports | NOT IMPLEMENTED | Fixed dashboard; no report designer or saved reports. |

## Security

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 12.1 | No amendments/deletions of applications by the applicant | IMPLEMENTED, UNTESTED | Enforced by rule: Applications update is staff only, delete is denied for everyone (`firestore.rules:78-79`). The candidate UI has no edit control. Bio-data lives separately and is editable by the candidate by design (`bioDataService.ts:4-9`). Worth one Rules Playground check. |
| 12.2 | No access to unauthorised personnel | **BROKEN** | See X3: (1) self-registration as **admin** is possible through the API (`firestore.rules:26`); (2) **every candidate can read every user's personal data and CV link** (`:25`); (3) **deactivating a user does not revoke access** (`UserManagement.tsx:136-149`; nothing checks `status`); (4) candidates can read panel scores and comments on their own interview and application records. Route guards (`ProtectedRoute.tsx`) only hide screens. |
| 12.3 | Different roles and access levels (administrators, candidates, hiring managers…) | PARTIAL | Four roles, route guards (`App.tsx:294-486`) and per-role menus (`AppSidebar.tsx:15-45`); recruiter access to Reports VERIFIED (walkthrough 4.1–4.4); rating-rule isolation VERIFIED (6.1–6.8). **But** the data rules only distinguish admin / any staff / owner: recruiters and hiring managers have identical write rights to requisitions, jobs, applications and offers (`firestore.rules:42-46, 63, 78, 125`). Undermined by 12.2 item (1). |
| 12.4 | Audit trail for all user actions with time and date | PARTIAL | **Now works where called:** the rule block exists (`firestore.rules:177-182`); `logAudit` timestamps entries with server time (`auditService.ts:36-59`) and no longer swallows silently (F8b); admin viewer with date/time on the dashboard Audit tab (`AdminDashboard.tsx:366-397`). Post-fix retest pending (walkthrough 4.21, 4.35). **Not "all actions":** no entry for login (the `'login'` action type is never used, `auditService.ts:13`), user creation and deactivation (`UserManagement.tsx:89-149`), positions (`requisitionService.ts:121-139`), interview score entry (`interviewService.ts:119-128`), panel notes (`applicationService.ts:475-488`), referee responses (`offerService.ts:296-298`), bio-data and profile saves. |

## Backup and recovery

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 13.1 | Built-in backup and recovery protection | NOT IMPLEMENTED | Nothing in the repository configures Firestore point-in-time recovery, scheduled exports or Storage versioning (`firebase.json`, `functions/index.js`). Firebase does not keep restorable backups unless these are switched on. It is a console/config task, but it is not done. |

## Integration with other systems

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 14.1 | Integration with other systems such as OCS | NOT IMPLEMENTED | No outbound integration and no inbound API. The only Cloud Function is the role-claim sync (`functions/index.js:15-33`). |
| 14.2 | Web services out of the box (WSDL, SOAP, RDF, RSS…) | PARTIAL | RSS only (3.8). No REST, SOAP/WSDL or RDF endpoints. |

## Training

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 15.1 | Cost of training | N/A | Commercial question. |
| 15.2 | Time required for training | N/A | Commercial question. |

## Data ownership

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 16.1 | Autumhire should own the data | N/A | Contractual. In practice, ownership follows whoever owns the Firebase/GCP project and the Vercel account. Confirm those sit in the client's own organisation. |

## Support & Maintenance

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 17.1 | Maintenance and upkeep costs | N/A | Commercial. Running costs are Firebase Blaze usage plus Vercel. |
| 17.2 | Managed and maintained on Autumhire premises and by Autumhire? | N/A | Commercial. The system is cloud-hosted (Firebase plus Vercel), not on premises. |

## Archiving

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 18.1 | Archive multiple jobs, candidates, etc. | IMPLEMENTED, UNTESTED | Bulk archive and restore of adverts (`JobAdvertsPage.tsx:204-220` → `setJobsArchived` `jobService.ts:230-251`) and of candidate files (`ApplicationsPage.tsx:141-156` → `applicationService.ts:335-356`), batched and audited; staff update rules allow it. A flag, never a delete. "Candidates" are archived per application, not per person. |

## Location independent

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 19.1 | Work from multiple locations (Addis, Nairobi…) | IMPLEMENTED, UNTESTED | Browser app hosted on Vercel (`vercel.json`) with a cloud backend, usable from any location. **Caveat:** the bulk CV download fails from the deployed domain until `cors.json` includes the production origin (X5). |

## Government compliance

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 20.1 | Compliance with regulations (copyright, etc.) | N/A | Legal and process. Relevant software facts: the application consent clause exists (`ApplicationForm.tsx:505-523`) and there is a Terms page. Data-protection exposure is in 12.2. |

## System architecture

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 21.1 | Describe the system architecture | N/A | Descriptive. React 18 single-page app (Vite, TypeScript) on Vercel; Firebase Auth, Firestore, Storage and Cloud Functions; access control in `firestore.rules`/`storage.rules`. |
| 21.2 | Databases supported | N/A | Descriptive. Google Cloud Firestore (NoSQL document database) only. |
| 21.3 | Is the system modular? | N/A | Descriptive. Yes: one service module per domain in `src/services/`, pages grouped by role. |
| 21.4 | Browsers and versions | N/A | Descriptive. Current evergreen browsers (Chrome, Edge, Firefox, Safari). No browser matrix has been tested. |
| 21.5 | Development languages to extend the system | N/A | Descriptive. TypeScript/React (front end) and JavaScript/Node (Cloud Functions). |

## Reliability

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 22.1 | System checks and reports mathematically correct, including candidate ranking | PARTIAL | **Ranking and averages VERIFIED:** walkthrough 2.7–2.14 (averages, including the null-not-NaN case) and 2.18–2.25 (sort orders). **Report defects found:** offer accept rate leaves declined offers out of the denominator, because a declined offer moves the application to `rejected` (`offerService.ts:239` vs `ReportsPage.tsx:197-198`), so the rate is overstated; "Source of Hire" counts applications (11.9); time-to-hire uses `updatedAt` (11.6); age band boundaries are inconsistent (11.10); gender and age "ratios" are applicant counts (11.10, 11.14). |

## Data & templates management

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 23.1 | Various rule sets for managing differing recruitment cycles | PARTIAL | Admins define workflows of stages, roles and auto-email flags (`WorkflowConfiguration.tsx:232-236` → `workflowService.ts:49-80` → `Workflows`, `firestore.rules:169-172`); a job stores the chosen workflow **name** (`CreateJob.tsx:1818-1831`). **Nothing reads it afterwards:** every job follows the same fixed pipeline, and the `autoEmail` flags do nothing. |
| 23.2 | Various templates managed by administrators | PARTIAL | Template create/edit/delete for Email, Interview and Job Ad works end to end (`TemplateManagement.tsx:84-110` → `templateService.ts:33-74` → `firestore.rules:163-166`, admin write; audited). **No screen applies a template**, and email templates cannot be sent (X1). |
| 23.3 | Maintain data on recruitment and advertising agents | NOT IMPLEMENTED | No agents entity. "Recruitment agency" exists only as an application-source option (`ApplicationForm.tsx:375`). |
| 23.4 | Information on employment activity phases (applicant, exam/test, interview…) | PARTIAL | Applicant → longlist → shortlist → interview → offer → hired, with history (`applicationService.ts:23-44, 391-402`) and interview records. **No exam/test phase** or test results. |
| 23.5 | Maintain new hiring data in the applicant database for reporting and analysis | IMPLEMENTED, UNTESTED | Hired applications are kept (never deleted, `firestore.rules:79`), feed the Reports page and the onboarding CSV (`OffersPage.tsx:133-150`). |

## What constitutes customer service

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 24.1 | Upgrades, training, etc. | N/A | Commercial. |

---

## 1. Scorecard

### Overall (110 rows)

| Status | Rows | Share of the 98 software rows |
|---|---|---|
| VERIFIED | 6 | 6% |
| IMPLEMENTED, UNTESTED | 45 | 46% |
| PARTIAL | 31 | 32% |
| BROKEN | 7 | 7% |
| NOT IMPLEMENTED | 9 | 9% |
| N/A | 12 | — |

### By stage

| Stage | Rows | VERIFIED | IMPL., UNTESTED | PARTIAL | BROKEN | NOT IMPL. | N/A |
|---|---|---|---|---|---|---|---|
| Position requisition | 6 | 0 | 5 | 1 | 0 | 0 | 0 |
| Job evaluation | 3 | 0 | 1 | 2 | 0 | 0 | 0 |
| Job advertisement | 15 | 0 | 7 | 6 | 0 | 2 | 0 |
| Job applications | 13 | 0 | 10 | 1 | 2 | 0 | 0 |
| Long listing | 10 | 2 | 2 | 5 | 0 | 1 | 0 |
| Short listing | 7 | 3 | 3 | 1 | 0 | 0 | 0 |
| Interviews | 4 | 0 | 3 | 0 | 1 | 0 | 0 |
| Reference checks | 2 | 0 | 1 | 0 | 1 | 0 | 0 |
| Offers & regrets | 5 | 0 | 3 | 0 | 2 | 0 | 0 |
| Flexibility | 3 | 1 | 1 | 0 | 0 | 1 | 0 |
| Metrics / Reports | 15 | 0 | 5 | 8 | 0 | 2 | 0 |
| Security | 4 | 0 | 1 | 2 | 1 | 0 | 0 |
| Backup and recovery | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| Integration | 2 | 0 | 0 | 1 | 0 | 1 | 0 |
| Training | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Data ownership | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Support & maintenance | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Archiving | 1 | 0 | 1 | 0 | 0 | 0 | 0 |
| Location independent | 1 | 0 | 1 | 0 | 0 | 0 | 0 |
| Government compliance | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| System architecture | 5 | 0 | 0 | 0 | 0 | 0 | 5 |
| Reliability | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| Data & templates mgmt | 5 | 0 | 1 | 3 | 0 | 1 | 0 |
| Customer service | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| **Total** | **110** | **6** | **45** | **31** | **7** | **9** | **12** |

## 2. The serious list — ranked by how visible each would be in client UAT

| Rank | Row | Status | Why the client will notice |
|---|---|---|---|
| 1 | 4.12 Application confirmation | BROKEN | The very first thing any tester does is apply, then look for the email. It never arrives, and the on-screen toast promises a confirmation (X1). |
| 2 | 7.1 Interview invitation | BROKEN | A candidate scheduled for interview is never told, and their dashboard doesn't show the date either. |
| 3 | 4.10 Job alert subscription | BROKEN | Clicking "Subscribe" on the public job board immediately shows a permission error (missing rule block, X2). |
| 4 | 12.2 No access to unauthorised personnel | BROKEN | **The most severe item on the list.** An admin who deactivates a user and then signs in as that user will find full access intact. A candidate account can list every other candidate's personal data and CV. A fresh account can make itself admin. |
| 5 | 9.4 Regret letters | BROKEN | Unsuccessful candidates are never told. Also regrets go to un-screened `applied` candidates, not only shortlisted ones. |
| 6 | 9.2 Hiring-manager status updates | BROKEN | The hiring manager is never told an offer was accepted or declined, even in-app; the notice goes to the recruiter. |
| 7 | 3.3 Advert approval | NOT IMPLEMENTED | A tester picks "Pending" expecting an approval step; the advert goes live immediately. |
| 8 | 8.2 Referee email | BROKEN | Shows "Awaiting response" for an email that was never sent. A `mailto` workaround exists. |
| 9 | 10.1 Import from Excel, photos, referees | NOT IMPLEMENTED | Any data-migration test fails at step one. |
| 10 | 13.1 Backup and recovery | NOT IMPLEMENTED | Unseen in UAT, but a contractual line item with real risk if asked. It is a configuration task. |
| 11 | 3.13 Custom advert link | NOT IMPLEMENTED | Visible if tried. Low impact. |
| 12 | 5.8, 11.8, 11.15, 14.1, 23.3 | NOT IMPLEMENTED | Best-match report, turnover, user-built reports, OCS integration, agents register. Visible only if specifically tested. |

**PARTIAL rows that will look BROKEN in UAT.** These are not on the list above because part of each works, but a tester will experience them as failures:
- **3.15** Internal adverts cannot be applied to by anyone.
- **5.10** The CV zip fails on the deployed site (CORS).
- **1.3** Recruiter-raised requisitions vanish.
- **22.1 / 11.x** Offer accept rate overstated; "Source of Hire" counts applications.
- **6.6** Bio-data shows "not submitted" after submission when a candidate has two shortlisted applications.
- **Contact Us** form shows success and sends nothing (see §3).

## 3. Built but never asked for

None of these appear in the signed requirements document. This cuts both ways: some are value delivered for free, some are cost that was never scoped.

**Delivered under later change requests (outside the signed document, in scope by agreement):**
- Panel 1–3 ratings with isolation (request 13)
- Name and rating sort (14)
- Job-filtered applications (9)
- CV zip (10)
- Per-job Excel export (12)
- Recruiter access to Reports (11)
- Candidate profile save fixes (8)
- Requisition-free job posting (1)
- Wizard step-in-URL (17)

`docs/change-requests-2026-09.md` §7 puts requests 1–14 at roughly 12–15 working days of unscoped work, and notes the milestone breakdown totals KES 495,000 against a stated KES 260,000.

**Built without any request:**

| Item | Where | Note |
|---|---|---|
| Offer approval workflow (HM/admin approves an offer before it is sent) | `OfferApprovalPage.tsx`, `offerService.ts:172-202` | Working value-add |
| Requisition priority colour-coding; "skip admin approval" fast-track | `requisitionService.ts:48-53, 293-309` | Commit `ac8cd9d` says "as requested", but it is not in the signed document |
| Hiring team and coordinator on every job (mandatory to publish) | `CreateJob.tsx` step 4, `:416-424` | Stored only; nothing downstream uses it |
| "Featured job" toggle | `CreateJob.tsx:1896` | **Dead:** saved (`jobService.ts:69`), never read |
| Contact Us form | `ContactUs.tsx:43-67` | **Dead and misleading:** "Simulate API call" shows success and sends nothing |
| WhatsApp share link | `feedService.ts:71-74` | Beyond the LinkedIn/Twitter ask |
| In-app notification bell | `NotificationBell.tsx` | Useful; currently the only place notices are seen |
| "Copy full candidate summary" to clipboard | `shareCandidateProfile.ts:135-146` | Value-add |
| About Us and Terms pages | `src/pages/candidate/` | Public-site content |
| Salary range, currency, tags, category, remote type on adverts | `jobService.ts:55-63` | Standard fields; the currency defaults to USD while reports show KES |
| Removed | — | LinkedIn Apply checkbox (F13) and employee referral sub-form (F14): built, persisted nothing, removed |
| Specified, not built | `docs/video-interviews/` | Video interviews (request 16) |

## 4. What UAT must cover (the 45 IMPLEMENTED, UNTESTED rows, prioritised)

Run these on the **deployed** build, not localhost, so environment problems (CORS, the role claim) show up.

1. **Candidate journey end to end** (4.2 CV half, 4.4, 4.5, 4.7, 4.11, 4.13). Register, save a profile with a CV, apply with the saved CV, try again to confirm the duplicate is blocked, apply without a required cover letter, open a closed job's link. Include the `/apply` link of a closed job.
2. **Offer to hire** (9.1, 9.3, 9.5). Create an offer with an approver, approve it as HM, send it, accept as the candidate, finalize the hire, download the onboarding CSV. Then decline one and check the Reports accept rate by hand (22.1).
3. **Interviews** (7.2, 7.3, 7.4). Schedule, have **two panelists save scores at about the same time**, complete, print the report.
4. **HM-raised requisition to published job** (1.1, 1.2, 1.4, 1.5, 1.6, 2.1). Raise as HM **with a job-description upload** (this proves `syncUserRoleClaim` is deployed), refine and send as recruiter, confirm as HM, approve as admin, publish, and check the REQ/JOB reference numbers. Retests request 1 (walkthrough 5.1–5.2).
5. **Advert lifecycle** (3.6, 3.7, 3.8, 3.10, 3.12, 3.14). Publish a confidential advert and confirm it is absent from `/jobs` signed out; set yesterday's closing date and confirm candidates cannot apply; close and re-open; regenerate the RSS feed and open its URL in a reader.
6. **Rules Playground spot checks** (12.1 plus X3). As a candidate: update and delete your own application (expect DENY); create `Users/{newUid}` with `role: 'admin'`; list the `Users` collection. The last two are expected to **ALLOW**, which confirms X3.
7. **Reports by hand** (11.4, 11.5, 11.7, 11.11, 11.13). Pick a small date range and recompute each figure from the CSV.
8. **The rest, quickly.**
   - Long-list scores 5.2
   - Stage tracking 5.4
   - Shortlist status change 6.2
   - Criteria 6.5
   - Duty banners 6.7
   - Referee record 8.1
   - Archiving 18.1
   - Applied-before panel 4.6
   - Self-declared flags 4.8 and 4.9
   - Volume test for 4.1
   - Calculations 10.2
   - Hiring data 23.5
   - Deployed-site access from a second location 19.1

**Retests owed from earlier passes** (not new rows):
- Request 1: walkthrough 5.1–5.2
- Request 17: wizard Back
- F2b, F3, F4, F6
- Audit entries: walkthrough 4.21 and 4.35, now that the AuditLog rule exists
