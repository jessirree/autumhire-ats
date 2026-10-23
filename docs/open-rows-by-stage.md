# The 40 OPEN rows, grouped by stage

Source: `docs/traceability-v2.md` (2026-10-20 scorecard). Report only — no
code changed to produce this. Each row gets one line on what's actually
missing, tagged as one of:

- **NO CODE** — nothing exists for this at all.
- **PARTIAL** — part of it works; the gap is specific and named.
- **BLOCKED ON DATA** — the system has nowhere to hold the data this needs, independent of any UI.

`⚑ CLIENT` flags a row that's really a scope/decision question, not a build
task as stated. `⚑ SMALL` flags a row whose fix looks achievable in under
half a day, standalone. Neither flag implies the other.

Two corrections surfaced while compiling this — both are called out where
they occur, not buried: **APP-5** and part of **LL-10** describe states the
current code no longer matches.

---

## Position requisition

| ID | What's missing |
|---|---|
| PR-3 | **PARTIAL.** The HM-raised approval path works end to end. The recruiter-raised path has no way to designate *which* hiring manager it's for, so the confirmation notice goes to the requisition's creator (the recruiter) and the HM queue only ever shows requisitions the viewing HM themselves created — no HM can confirm a recruiter-raised one. Fixing the misrouting is mechanical; fixing the underlying gap needs a field/UI for "which HM is this requisition for," which is a small design question before it's a code one. |

## Job Evaluation

| ID | What's missing |
|---|---|
| JE-2 | **NO CODE.** `Job` has no `grade` field at all, so publishing directly (no requisition) skips grading entirely. ⚑ SMALL — add the field, block publish without it, same shape as the existing title/location/description checks. |
| JE-3 | **PARTIAL**, same root cause as PR-3: the grade-approval notice goes to the requisition's creator, not a resolved HM. No independent fix — closes when PR-3 does. |

## Job advertisement

| ID | What's missing |
|---|---|
| JA-1 | **PARTIAL.** Admins can author "Job Ad" templates (`TemplateManagement.tsx`); the job builder never loads one — no caller of `getTemplates`/`renderTemplate` outside Template Management itself. "Duplicate Job" is the working substitute today. ⚑ SMALL, tentatively — a "load from template" picker in `CreateJob.tsx` is contained, though it depends on how closely template fields line up with the job form's fields. |
| JA-2 | **PARTIAL**, same root cause as JE-2: grade can't be enforced because the field doesn't exist. No independent fix — closes when JE-2 does. |
| JA-3 | **NO CODE.** No advert-level approval exists; any non-draft job goes `Active` immediately regardless of the "Pending" option shown in the wizard, which is decorative. ⚑ CLIENT — requisition-level approval already exists end to end; worth confirming with the client whether that already satisfies this row before building a second, advert-specific approval layer on top of it. |
| JA-4 | **NO CODE** for the one missing piece: `Cancelled` exists only in the `JobStatus` type and a cosmetic filter dropdown — no button or action anywhere writes it. Pending/Active/Closed/Re-advertised/Internal-visibility all work. ⚑ SMALL — one action + confirm dialog + a one-line `updateJob` call. |
| JA-7 | **NO CODE** for the real ask: there's no scheduled job. The stored status only flips to `Closed` when a staff member happens to load a job list next, and that write's own error is swallowed. The swallowed-error part alone is ⚑ SMALL (log it properly); the actual scheduled-closure job needs a Cloud Scheduler function, which is a real infra addition, not small. |
| JA-11 | **PARTIAL.** Per-answer score editing already exists (on `CandidateDetail.tsx`, confirmed working — row 3.11/G9); it's just not surfaced on the long-listing screen itself, where a recruiter can currently only override the total. ⚑ SMALL, tentatively — reusing an existing control on a second screen, not building one. |
| JA-15 | **NO CODE.** Hiding internal adverts from the public site works. Nothing lets anyone apply to one — no internal job board, and a candidate opening an internal link directly gets "job no longer available." ⚑ CLIENT — `isInternal` (self-declared) already exists on candidates, but there's no decision on record for who should be able to see or apply to an internal advert, which has to be answered before this is buildable. |

## Job applications

| ID | What's missing |
|---|---|
| APP-3 | **PARTIAL.** CV/cover-letter checklist is enforced. "Any other relevant document" has no upload control in the form even though `applyToJob`'s `otherFiles` parameter already supports it. ⚑ SMALL, tentatively — wiring an existing service parameter into the form. |
| APP-5 | **Correction, not open.** The listed gap ("opening `/jobs/:id/apply` directly on a closed job redirects silently to `/jobs`") is already fixed — `App.tsx:149-163` (`ApplicationFormWrapper`, tagged "G3") shows the same "Job is no longer available" message for both a closed and a missing job on that exact route. This row's evidence in `docs/traceability-v2.md` is stale; recommend re-verifying by hand and closing it on the next pass rather than treating it as outstanding work. |

## Long Listing

| ID | What's missing |
|---|---|
| LL-3 | **PARTIAL.** The candidate spec view (full detail page) works. The "job spec" button opens the job *editor*, not a read-only view, and a hiring manager hitting the same page is bounced to their dashboard by the route guard. Needs a genuine read-only job-spec view plus an access decision for HMs — not small. |
| LL-6 | **PARTIAL — ⚑ CLIENT, already decided.** CV, personal details and application source all work. The structured competency/experience/academic-attainment fields are the parked capability-profile matching feature (`MATCHING_ENABLED = false`, client decision 2026-10-15, pending AI funding, per `docs/wave-g-brief.md`). This is a standing decision already on record, not an open question — listed here only because the row itself stays OPEN against the literal requirement text until that feature is funded. |
| LL-9 | **PARTIAL, structural.** "Share Profile" genuinely emails a `mailto:` draft with the profile and a questionnaire summary. CV and cover letter can never be attached — `mailto:` links cannot carry attachments at all, so no amount of UI work on the current approach closes this. Would need a real server-side "send with attachments" path (a Cloud Function + SMTP attachment support) — a build item, not a tweak. |
| LL-10 | **Partially a correction.** The zip already includes cover letters and other documents structurally (`downloadJobCvs.ts` fetches `cvUrl`, `coverLetterUrl` and every `otherDocsUrls` entry for every candidate, confirmed by reading the current code) — the "cover letters and other documents are not in the zip" claim in `docs/traceability-v2.md` describes an earlier version of this feature, not the current one. The real remaining gap is narrower: single-document download (one CV, one cover letter, outside the bulk zip) isn't renamed, because the `download=` attribute is ignored by browsers for cross-origin Storage URLs. Fixing that needs a server-side proxy or a `Content-Disposition` header on the object — moderate effort, not small. |

## Short Listing

| ID | What's missing |
|---|---|
| SL-6 | **PARTIAL, bug-shaped.** Submitting bio-data works. Reading its status fails for a not-yet-submitted record (the read rule needs an existing document; a pending read is denied and the error is swallowed), so an already-submitted record can show as "not submitted" for a candidate with more than one shortlisted application. ⚑ SMALL, tentatively — a read/error-handling fix, not a missing feature. |

## Interviews

| ID | What's missing |
|---|---|
| INT-1 | **PARTIAL, two gaps.** The email-sender half is fixed (generic SMTP now fires). Not re-verified this pass: whether the candidate dashboard shows real date/time/location or just a count (status unclear, not confirmed broken either way). Confirmed still true: "Interview" templates can be authored but nothing in the scheduling flow applies one — same pattern as JA-1 and DTM-2 below. |
| INT-3 | **BLOCKED ON DATA, in a different sense — data-loss bug.** `recordPanelScore` rewrites the whole scores array from whatever the browser last loaded, so two panelists saving near-simultaneously can silently wipe one another's score, and it isn't audited. Needs the same per-panelist-subdocument pattern the shortlisting `ratings` subcollection already uses, instead of one shared array — a real, well-scoped fix, not small. |

## Flexibility

| ID | What's missing |
|---|---|
| FLEX-1 | **NO CODE.** A repo-wide search found no import mechanism of any kind — not Excel, not CSV, not a bulk-document importer. Building one (parsing, field mapping, validation, dedup against existing records) is a real feature, not a quick add. |

---

## Metrics / Reports (separated out — 10 of the 40)

| ID | What's missing |
|---|---|
| REP-1 | **Two separate gaps.** No timeline/Gantt-style view exists (**NO CODE**) — CSV/Excel exports and pie/bar charts are already VERIFIED by walkthrough. Separately: the "Custom Range" date filter has no handler at all and silently behaves as all-time — looks functional, isn't. ⚑ SMALL for just the custom-range filter (wire an existing control to the query); the timeline view itself is a real charting feature. |
| REP-2 | **NO CODE.** No directorate (or any org-level) field exists anywhere — department-level hires-per-department already works in the funnel chart. Needs a new field on Job/Position plus the report grouping to use it. |
| REP-3 | **NO CODE.** Pie and bar exist; no Gantt chart. A real charting addition — needs a library/approach decision for a hiring-pipeline timeline view. |
| REP-6 | **PARTIAL, bug-shaped, uses the wrong data it already has.** Time-to-fill is calculated from the hired application's `updatedAt`, which drifts upward on any later edit (archiving, re-rating) — not the real hire date. The real date already exists in `statusHistory` and is simply unused. Also grouped by month, not per position. ⚑ SMALL — swap which field feeds the calculation; the data already exists, this is not a data gap. |
| REP-8 | **BLOCKED ON DATA, and ⚑ CLIENT.** No employee or exit data exists in the system at all — and per the existing note, turnover rate arguably sits outside what an applicant-tracking system should hold in the first place. Worth a scope conversation before treating this as a build gap rather than an out-of-scope row. |
| REP-9 | **PARTIAL, mislabeling bug.** The chart exists but is titled "Source of Hire" and its series is named `hires` while it actually counts every application, not hires. ⚑ SMALL — either relabel it honestly or filter it to hired status; both are small, the only question is which one the client actually wants. |
| REP-10 | **PARTIAL, bug-shaped.** The age bands exist but count applicants, not hires (same root issue as REP-9/14); the 30–40/40–50 boundaries overlap so a 40-year-old falls in both; under-18 applicants are silently dropped rather than bucketed. ⚑ SMALL — boundary math and a status filter, no missing data or missing feature. |
| REP-12 | **NO CODE.** No in-app ad-hoc query builder — raw CSV/Excel export plus date/department filters is the current (real, working) substitute. A genuine self-service reporting feature; likely the same underlying ask as REP-15 below. |
| REP-14 | **PARTIAL, same pattern as REP-9/10.** The gender chart counts applicants, not hires — no actual hire-by-gender figure exists. ⚑ SMALL — same status-filter fix as REP-9/10, worth doing as one batch. |
| REP-15 | **NO CODE.** No report designer, no saved/custom reports. This reads as the same client ask as REP-12 (self-service reporting) rather than two separate features — worth scoping together rather than as two independent builds. |

**Note:** REP-9, REP-10, REP-14 and the offer-accept-rate half of REL-1 (below) are the same shape of bug — a report counting the wrong denominator — and are small enough individually that fixing all four together as one pass is probably more efficient than four separate tickets.

---

## Security

| ID | What's missing |
|---|---|
| SEC-3 | **PARTIAL, rule-layer gap.** Recruiters and hiring managers have identical write rights in `firestore.rules` for requisitions/jobs/applications/offers — the UI separates their duties only cosmetically (`DutyBanner`). Differentiating this at the rule layer is real work, not small: it needs care to avoid breaking HM actions that currently rely on the shared permission. |
| SEC-4 | **PARTIAL.** The audit trail works for status changes. It doesn't cover login, user creation/deactivation, positions, interview scores, panel notes, referee responses, or bio-data/profile saves. One piece is genuinely ⚑ SMALL on its own: the `'login'` action type is already declared in `auditService.ts` and simply never called — wiring that one call in is a one-line, contained fix. The rest is the same small change repeated at several call sites, not individually hard, just not yet done anywhere. |

## Backup and recovery

| ID | What's missing |
|---|---|
| BAK-1 | **NO CONFIG** (not code — infrastructure). Nothing enables Firestore point-in-time recovery, scheduled exports, or Storage object versioning. ⚑ CLIENT — these have a real ongoing cost; worth a retention-policy conversation before switching them on, even though flipping the settings themselves is quick. |

## Integration with other systems

| ID | What's missing |
|---|---|
| INTG-1 | **NO CODE**, and the row is unscoped as written. "Integration with other systems such as OCS" doesn't name a protocol, direction, or dataset. ⚑ CLIENT — needs a scoping conversation (integrate with *what*, carrying *what* data, *which* direction) before this is a buildable ticket at all. |
| INTG-2 | **Two halves.** The documentation half ("describe the different WS that are out of the box") is a one-line answer — "RSS only" — and could be closed today without touching code. The build half (REST/SOAP/WSDL/RDF) is unscoped the same way INTG-1 is. ⚑ CLIENT for the build half only. |

## Reliability

| ID | What's missing |
|---|---|
| REL-1 | **PARTIAL.** Ranking and averages are genuinely VERIFIED correct (including the null-not-NaN panel-average case), and LL-8's export has its own dedicated correctness guarantees, verified this session. The remaining gap is entirely the same bugs already listed under REP-9/10/14, plus one more of the same shape: the offer-accept rate excludes declined offers from its denominator, overstating the rate. ⚑ SMALL for that one figure specifically — this row closes automatically once that and REP-9/10/14 are fixed; no separate work is needed beyond those. |

## Data & templates management

| ID | What's missing |
|---|---|
| DTM-1 | **PARTIAL.** Workflows can be authored (stages, roles, auto-email flags) and a job can store which one it's using. Nothing reads it afterward — every job follows the same fixed pipeline regardless, and the `autoEmail` flags do nothing even though a real SMTP sender exists elsewhere in the app now. The `autoEmail` half specifically is a smaller, standalone piece (wire the flag check into the existing `notify()` call); actually enforcing workflow stages against the real pipeline is bigger. |
| DTM-2 | **PARTIAL, same pattern as DTM-1/JA-1/INT-1.** Template create/edit/delete (Email, Interview, Job Ad) works end to end and is audited. No screen applies a template anywhere. This is the fourth row describing the exact same architectural gap — the app has no "pick and apply a template" layer at all, in any of the three template types — worth treating as one underlying piece of work rather than four unrelated bugs. |
| DTM-3 | **NO CODE.** No "recruitment/advertising agents" entity exists — `source` has an "agency" option on the application form, but there's no maintained record behind it. Needs a new entity (collection, CRUD screen, rules) — moderate, well-scoped effort. |
| DTM-4 | **BLOCKED ON DATA**, and ⚑ CLIENT. No exam/test phase exists anywhere in the pipeline — not a missing field, a missing pipeline *stage* (applicant → longlist → shortlist → interview → offer → hired has no slot for it). Worth confirming with the client whether a formal exam/test phase is actually wanted, or whether the existing interview-scoring mechanism already covers what they meant, before building a new stage and a new scoring model for it. |

---

## Summary of flags

**⚑ CLIENT (scope/decision questions, not build tasks as stated):** JA-3, JA-15, LL-6 (already decided, parked), REP-8, BAK-1, INTG-1, INTG-2 (build half), DTM-4.

**⚑ SMALL (standalone, under half a day):** JE-2, JA-4, JA-11 (tentative), APP-3 (tentative), SL-6 (tentative), REP-1 (custom-range filter only), REP-6, REP-9, REP-10, REP-14, REL-1 (offer-accept denominator only), SEC-4 (the `'login'` call specifically).

**Corrections found while compiling this (not open, or not open as described):** APP-5 (already fixed, G3), LL-10 (cover letters/other docs are already in the zip; only the single-document rename issue remains).

**Recurring pattern worth noting once:** JA-1, INT-1 (templates half), DTM-1, DTM-2 all describe the same underlying gap — the app has no layer that *applies* an authored template/workflow anywhere, in any of the three template types. Four rows, one architectural hole.
