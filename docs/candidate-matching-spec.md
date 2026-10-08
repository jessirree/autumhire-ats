# Candidate matching — decisions and spec

Written 2026-10-08. Covers requirements rows **5.1**, **5.6** and **5.8**, the
last substantive gap in Phase 4.

---

## 0. The decision

Deterministic, rules-based matching. **No AI**, now or later, for the matching
itself.

The requirement is a comparison of two structured lists, not a judgement. Row 5.8
says it outright: "comparing required vs existing competencies". A model would add
per-candidate cost, a calibration gate, and automated-decision exposure under the
Kenya Data Protection Act, in exchange for nothing the arithmetic cannot do.

AI has a place later, and only one: reading a CV to **pre-fill** the structured
fields so candidates type less. A human confirms the result. That is a data-entry
assist, not a ranking engine, and it carries almost none of the regulatory weight.
When "AI post-production" comes back up, this is the shape to agree to.

## 1. Scope position

**In scope.** All three rows are in the signed requirements document, and the
phased breakdown puts "compare applicant data vs job requirements" under Phase 4.
Building this completes the contract rather than extending it, and it is the
reason Phase 4 cannot be signed off today.

| Row | Requirement | Today |
|---|---|---|
| 5.1 | Preliminary long list by matching applicant details to job specifications | PARTIAL |
| 5.6 | Data bank of CVs with personal details, competencies, experience, academics | PARTIAL |
| 5.8 | Reports identifying best-match profiles, required vs existing competencies | NOT IMPLEMENTED |

Explicitly **out** of scope and separately quoted: AI generated ratings
(client request 15), and CV parsing to pre-fill.

Estimated four to five days.

## 2. What gets built

### 2.1 Skills taxonomy

Admin-managed, same shape and same screen family as the existing question bank.

- Seed it from the client's own existing job descriptions, not from a generic
  occupational standard. A recruiter who opens a list of three thousand ESCO
  skills will not use it.
- The control is a **searchable typeahead, not a dropdown**, and scoped by
  department where that helps.
- Free text is not permitted. "JS", "JavaScript" and "Javascript" do not match
  each other, and a matching feature that misses half its hits is worse than none.

**Governance is a real condition, not a footnote.** Someone at the client has to
own this list, perhaps an hour a month. Without an owner it fills with
near-duplicates and matching degrades quietly. Agree the owner before building.

### 2.2 Candidate capability profile

Skills, years of experience and highest education, held **on the profile**, filled
once, reused across applications. This is what makes row 5.6 real and what finally
gives the Candidates page a reason to exist separate from Applications.

### 2.3 Job requirements

The job declares what it needs: minimum years, minimum education, required skills,
work authorisation. Published on the advert.

Work authorisation is **not** collected on the capability profile. It's
location-specific — authorised for one country is not authorised for another —
so unlike years of experience and highest education it isn't a stable,
reusable biographical fact. It's answered where it already was: a screening
question on the application. The job (or bank) question that answers it is
**explicitly linked** to the requirement, authored by whoever builds the
question, never inferred from its text. A job that sets the requirement with
no question linked to it is a configuration gap, not a "no" — flagged in the
job builder, because otherwise every candidate silently comes back unassessed
on the one criterion the client cares most about.

### 2.4 The match

A comparison between 2.2 and 2.3, producing a 0 to 100 fit score **alongside** the
existing `prescreenScore`, never replacing it, with the comparison shown line by
line so a recruiter can see why rather than defer to a number.

Hard criteria (work authorisation) and soft criteria (years of experience, read as
a gradient) are distinguished, but see §3. The hard criterion does not read the
capability profile — there's nothing there to read for it (§2.3). It reads the
answer to whichever screening question is linked to the requirement: truthy
meets it, falsy raises the flag, no linked question (or no answer) is "not
assessed", the same null case as an unscored gradient criterion.

### 2.4.1 Structural limit: the pool version can't assess work authorisation

Found while building the row 5.8 report (step 5). The work-authorisation hard
criterion reads the answer to a screening question **linked on an application
for that specific job** (§2.4) — it is not, and cannot be, read from the
capability profile, because that fact isn't collected there (§2.3).

That's fine for the report as built: ranking a job's own applicants, every one
of them has an application for that job, so the linked question's answer
exists whenever one was set. It stops being fine the moment someone builds the
**pool version** — ranking every candidate on file against a job, not just its
applicants, which §2.4.2 below calls the more valuable version of this
report. A candidate who never
applied to that job has no application to that job, so no answer to the linked
question, so no basis to resolve the criterion. They would come back
"not assessed" on work authorisation always, not sometimes — not a bug to fix,
a property of where the data lives. Whoever builds the pool version needs to
know this before they start, not after: either accept that the hard criterion
is permanently unassessable for non-applicants, or decide work authorisation
needs a second, profile-level source for that report specifically — don't
infer or guess an answer to close the gap.

### 2.4.2 The pool version — deliberately not built in step 5

Row 5.8's report (step 5) ranks only the applicants to one job. Ranking the
whole candidate pool against a job — including people who applied to
something else, or nothing at all — is the more valuable version of this
report and the one that would make the Candidates page earn its place over
Applications. It was left out on purpose, on read-volume grounds: it changes
the read from "applicants to this job" (bounded by one job's applicant count)
to "every candidate on file", and the traceability pass already flags unpaged
full-collection reads as a scale risk at row 4.1. Building it needs that
risk addressed first, or a deliberately bounded/paged read, not a straight
port of the applicant version's `getApplicationsForJob` → `getAllUsers` swap.

## 3. Non-negotiables

Decided 2026-10-08. These are not implementation details; changing any of them
changes what the product is.

1. **A hard requirement is a flag, never a knockout.** An unmet requirement marks
   the candidate. It does not filter them out of the longlist. A human decides.
2. **Nothing on the profile ever blocks an application.** The only blocks remain
   what they are today: job closed, duplicate application, missing required
   document, declaration unticked. No new ones.
3. **Requirements are public, the match is private.** Requirements belong on the
   advert, where a candidate can judge for themselves. The system never tells an
   individual how they personally score. No "you may not be eligible" banner.
4. **The score and its per-criterion breakdown are staff-only, by an architectural
   control, not a decoration in the UI.** Decided 2026-10-08: the match is
   computed on read, nothing is stored. There is no document for
   `firestore.rules` to protect — the rule-layer trap this project has already
   been caught by once (candidates can read their own Interview documents
   including panel scores, which is why G5 has to filter them deliberately in
   the component) doesn't apply here, because the inputs the match is computed
   from (the job's requirements, public per §3.3; the candidate's own capability
   profile, already theirs to read) are each legitimately readable by the
   candidate on their own, for other reasons. A rule can only ever gate a
   *stored* value, so one here would protect nothing that isn't already
   accessible.

   What's actually being protected is narrower than "the inputs": the
   **composite score and the ranking it produces** — not the fact that a
   candidate can, in principle, work out for themselves whether they meet a
   requirement the advert already told them about (§3.3 intends that). The
   control is that nobody computes and shows them the number: `src/lib/matching.ts`
   is never imported from a candidate-facing file (`src/pages/candidate/**`).
   That's enforced by a test — "Match scoring import discipline" in
   `tests/firestore-rules.test.ts`, which scans `src/` the same way the
   collection-coverage sweep does — not left as a convention that the next
   candidate page silently breaks.
5. **The flag is visible on the list, not only on the detail page.** A recruiter
   working two hundred applications never opens each one, and a flag nobody sees
   is the same as no flag. A badge in the row, sortable, so "everyone failing work
   authorisation" is one click.

Rationale for 1 and 2, worth keeping because it will be challenged: a system that
rejects on a stored attribute is automated decision-making under the Kenya DPA;
profile data goes stale and work authorisation is exactly the field that changes;
a blocked application with no explanation is the worst possible candidate
experience; and an application that never happens is absent from the reports and
the talent pool, so the data is lost permanently.

## 4. The duplication problem, and the fix

Jobs already ask "how many years of relevant experience" and "Education Highest"
as screening questions. If the profile also holds those, the candidate answers
twice and the two can disagree, which is worse than either alone once one of them
drives a score.

Fix: when a screening question maps to a profile field, **prefill the answer from
the profile and let the candidate override it for that application**. The pattern
already exists in `ApplicationForm` via `loadProfilePrefill`, which does exactly
this for demographics, so it is a known shape in this codebase.

The application process is otherwise **unchanged**. Screening questions stay
per-job, authored by the recruiter, scored as now. Nothing is added to the form.

A first-time applicant with an empty profile matches nothing. The form should say
so plainly rather than silently scoring them zero. H4 already makes applications
backfill empty profile fields, so their second application is better than their
first.

## 5. The cheaper fallback

If the scope conversation goes badly, **Option A** at one to two days: let a
screening question be marked as a requirement with a comparison attached (at least
N years, at least this level, must be true). `scoreAnswers` already produces the
number; what you add is meaning.

Closes 5.1 defensibly. Does **not** close 5.6 or 5.8, because the answers live on
the application rather than the person, so there is still no data bank and no
cross-job best-match. If this route is taken, say that out loud at sign-off rather
than letting it pass quietly.

## 6. Open with the client

- Who owns the skills taxonomy (§2.1). A condition of the feature working.
- Whether the Candidates and Applications pages still feel redundant once the
  capability profile lands. That complaint and this spec are the same question;
  do not answer them separately.

## 7. Running cost

None. The taxonomy is a few hundred small documents, read once and cacheable. The
profile gains a handful of fields on documents that already exist. The match is
arithmetic in the browser over data the page already loads. Comfortably inside the
Firestore free tier at this volume.

The only cost is build time, and the only ongoing cost is the hour a month in
§2.1.
