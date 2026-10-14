# Candidate matching — clickthrough

**PARKED, 2026-10-15.** Client decision: job matching reverts to the
pre-screening question score for phase one; structured skills/capability
matching is parked until AI funding (docs/wave-g-brief.md §4, Option 1).
Gated behind `MATCHING_ENABLED = false` in `src/config/features.ts` — not
deleted, not retested against. This walkthrough describes the feature as
it exists in source, switched off. Everything below is kept for when the
flag flips back, not revised to match the current (gated) UI.

Written 2026-10-09. Covers the whole chain built in Steps 1 to 6: skills
taxonomy, capability profile, job requirements, match score, hard-requirement
flag, best-match report.

Requirement rows 5.1, 5.6 and 5.8. Roughly forty minutes.

Run it on localhost. The deployed site needs a merge and a green Vercel build
first, and the point of this pass is to find problems before that.

---

## What this pass is actually looking for

Not "does a number appear". Three specific failures, each of which would
discredit the feature rather than merely annoy someone.

1. **"Not assessed" must never render as zero.** A job with no requirements and
   a candidate with an empty profile are both unknowns. If either shows 0 out of
   100, every candidate in the client's existing database looks unqualified on
   the day this ships.
2. **The flag must never filter.** An unmet hard requirement marks a candidate
   and leaves them exactly where they are. Nothing hidden, nothing removed.
3. **Nothing on a profile may block an application.** The only blocks are the
   ones that existed before: job closed, duplicate, missing document, no consent.

Everything else on this list is confirmation.

---

## 0. Setup, as admin

| # | Do this | Expected |
|---|---|---|
| 0.1 | Open **Skills** in the admin nav | The ~25 seeded skills are listed |
| 0.2 | Add a skill, rename one, deactivate one | All three save |
| 0.3 | Filter by department, sort by name and by status | Both work; deactivated rows are visibly muted, not just badged |
| 0.4 | Create job **MATCH-TEST**, open, closing date next month | |
| 0.5 | On that job set: minimum 5 years, minimum Bachelor's, three required skills, work authorisation required | All four save |
| 0.6 | Save the job **without** linking a question to work authorisation | **A warning tells you the requirement is set but nothing collects it.** Without this, every candidate silently comes back unassessed on the criterion the client cares most about |
| 0.7 | Add a screening question linked to work authorisation, and one linked to years of experience | Both mappings save |

## 1. The clearing trap, which has bitten twice

| # | Do this | Expected |
|---|---|---|
| 1.1 | On MATCH-TEST, clear the minimum years. Save. **Reload** | The field is still empty. If 5 comes back, `deleteField` is not wired and the same bug is still live |
| 1.2 | Same for minimum education | Stays cleared |
| 1.3 | Set both back to 5 years and Bachelor's for the rest of this pass | |

## 2. As a candidate with an empty profile

Use a fresh account. This is the most important section on the list.

| # | Do this | Expected |
|---|---|---|
| 2.1 | Open the dashboard without filling the capability profile | An empty-state invitation to complete it. Not an error, not a silent blank |
| 2.2 | Apply to MATCH-TEST | **The application goes through.** Nothing about an empty profile blocks it |
| 2.3 | Answer "no" to the work-authorisation question | Accepted. It does not stop the submission |
| 2.4 | Look anywhere on the candidate's own screens for a score, a rank or a flag | **Absent everywhere.** Dashboard, application view, job page |

## 3. As a candidate with a filled profile

| # | Do this | Expected |
|---|---|---|
| 3.1 | Fill the capability profile: four skills, 8 years, Master's | Saves |
| 3.2 | Hard reload | All three persist |
| 3.3 | Clear years and education, save, reload | **Both stay cleared.** Same trap as 1.1, profile side |
| 3.4 | Clear all skills, save, reload | Stays empty |
| 3.5 | Refill, then apply to MATCH-TEST from a second account | The years question is **prefilled from the profile** |
| 3.6 | Override the prefilled answer with a different number and submit | The override is what is stored on the application; the profile is unchanged |
| 3.7 | As admin, rename one of that candidate's skills, then view the profile | **The skill still shows, under its new name.** It does not vanish |
| 3.8 | Deactivate a skill, then open the picker as a candidate | The retired skill cannot be newly selected, but anyone who already has it keeps it |

## 4. As recruiter, the list

| # | Do this | Expected |
|---|---|---|
| 4.1 | Open Applications filtered to MATCH-TEST | A **Match Score** column and a flag indicator, both in the row |
| 4.2 | The empty-profile candidate from §2 | **"Not assessed"**, in grey. Not 0, not a dash that reads as zero |
| 4.3 | The filled-profile candidate | A real score with the criteria that were assessed |
| 4.4 | Sort by match score, both directions | Unassessed candidates stay at the bottom in **both** directions |
| 4.5 | Sort by the flag | Everyone failing work authorisation surfaces in one click |
| 4.6 | Count the rows before and after sorting or flagging | **Identical.** The flag marks, it never filters |
| 4.7 | Open the candidate detail page | The per-criterion breakdown: required versus existing, line by line |
| 4.8 | Check a criterion the job did not specify | Shown as not assessed, not as a failure |

## 5. The report

| # | Do this | Expected |
|---|---|---|
| 5.1 | Reports → Best-Match Report → MATCH-TEST | Applicants ranked by fit, with required versus existing inline |
| 5.2 | The empty-profile candidate | In a separate **Unranked** section, not last place in the ranking |
| 5.3 | Export it | Downloads, opens, and the columns match what is on screen |
| 5.4 | Select a job with **no requirements set** | **A notice saying it cannot be ranked.** Not an empty table, and not a column of zeroes |
| 5.5 | As a recruiter rather than admin | Reachable. It is on a page recruiters already had |

## 6. The public advert

| # | Do this | Expected |
|---|---|---|
| 6.1 | Sign out entirely, open MATCH-TEST's public page | The requirements are visible: years, education, skills, work authorisation |
| 6.2 | Check the skill names render | They do, even signed out. Anonymous visitors cannot read the Skills collection, which is why the names are denormalised onto the job |
| 6.3 | Rename a skill in admin, reload the advert | The advert keeps the old wording until the job is re-saved. **This is intended**, not a bug |

---

## Most likely to find something

**2.2, 4.2, 4.6 and 5.4.** Those are the three non-negotiables plus the null
case in the place it is easiest to get wrong. If you are short on time, do §2 and
§4 and skip the rest.

## Known and deliberate, do not report as bugs

- A candidate who never applied to a job can never be assessed on work
  authorisation for it, because that fact comes from a screening answer on an
  application. Spec §2.4.1.
- Ranking the whole candidate pool against a job is not built. Spec §2.4.2.
- The three pre-existing typecheck errors in `rich-text-editor.tsx`,
  `PrescreeningBuilder.tsx` and `questionBankService.ts` predate this work.

## What to send back

Item number, what you expected, what happened, console error if any. For
anything showing a score, say whether it read as a number, as "Not assessed", or
as zero, because those three are the whole point.
