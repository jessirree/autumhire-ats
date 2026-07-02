# Autumhire ATS

Applicant Tracking System — React + TypeScript + Vite frontend, Firebase (Auth, Firestore, Storage) backend.

## Run locally

```
npm install
npm run dev
```

Requires `.env.local` with the `VITE_FIREBASE_*` keys.

## Accounts & roles — read this first

Every user has a `role` on their document in the Firestore `Users` collection. **The role decides which dashboard you land on after signing in:**

| role in Firestore | Lands on            | Interface                                        |
| ----------------- | ------------------- | ------------------------------------------------ |
| `admin`           | /admin/dashboard    | System administration (users, jobs, reports)     |
| `recruiter`       | /recruiter/dashboard| Requisitions, adverts, screening, offers         |
| `hiring-manager`  | /hiring/dashboard   | Approvals, shortlisting, interviews              |
| `candidate`       | /candidate/dashboard| Application tracker + open vacancies             |

- Signing up through the app **always creates a candidate account.**
- Staff accounts are created/promoted by an admin in **Admin → User Management**.
- **First admin (one-time):** open Firebase Console → Firestore → `Users` → your user document → set `role` to `admin`, then sign out and back in.
- If you sign in and see the candidate page when you expected the admin dashboard, your account's role is `candidate` — fix it as above.

## Deploy Firebase config

```
firebase deploy --only firestore:rules,firestore:indexes
```

(Add `,storage` once Firebase Storage is enabled — see Feature flags below.)

## Feature flags

`src/lib/featureFlags.ts` → `STORAGE_ENABLED = false` while Firebase Storage
is not yet provisioned (requires the Blaze plan). While off, document uploads
are skipped gracefully: candidates can apply without attachments, and the
profile-CV / RSS features show a friendly notice. **Flip to `true` when
Storage is set up — that is the only change needed.**

---

## Status: what's done ✅

### End-to-end recruitment pipeline (all on Firestore, no mock data)

- **Positions & requisitions** — pre-loaded positions; requisitions with auto reference numbers (`REQ-YYYY-####`), single/multi-level approvals, internal/external flag, and **mandatory job grade** (Job Evaluation requirement) shown to approvers.
- **Job adverts** — full advert builder (details, application-form config, screening questions, hiring team, settings); auto reference numbers (`JOB-YYYY-####`); statuses Pending / Active / Closed / **Re-advertised** / Cancelled; auto-close at deadline; confidential & internal-only postings; duplicate-from-existing; optional recruitment-cost field; validation blocks incomplete adverts.
- **Public careers page** — only live, external, non-confidential adverts are visible (enforced by security rules); closed jobs show "no longer available"; candidates subscribe to **job alerts** (notified when a job goes live).
- **Applications** — candidate accounts with persisted profiles; bio-data capture (gender, nationality, DOB, location); prevention of duplicate applications; blocked on closed jobs; accuracy declaration + consent; per-job **pre-screening questions with auto-scoring** (points + expected answers); internal/ex-employee flags; source tracking.
- **Screening & long-listing** — score-ranked screening view with knockout analysis; bulk status updates; candidate CRM with search/filter and cross-job history; CSV export.
- **Shortlisting** — hiring-manager review with rationale prompts and panel comments (collaboration notes).
- **Interviews** — scheduling with panel, questions, mode/location; per-panelist scores and comments; completion with result + report notes; candidate notified.
- **Reference checks** — auto-generated referee emails (mailto draft) from application data; responses recorded.
- **Offers** — creation with optional HM approval step; send to candidate; **candidate accepts/declines from their own dashboard**; recruiter finalizes the hire; regret notifications to remaining candidates; onboarding handoff CSV export of hired candidates.
- **Notifications** — every event (application received, status changes, interview invites, offers, regrets, job alerts) is written to a `Notifications` collection, shown in an in-app bell (staff + candidates). The same collection is the outbox for the future email sender.
- **Reports** — computed from live data: gender/age/nationality distributions, source of application, funnel per department, time-to-fill, offer accept rate, internal-hire ratio, cost-per-hire & vacancy costs; date/department filters; CSV export.
- **Admin** — user management with roles; **template management** (email/interview/job-ad templates with placeholders); **workflow configuration** (named stage pipelines used by the job builder); **pre-screening question library** (shared bank, one-click add into any job); **audit trail viewer** (every action logged with who/when/what).
- **Sharing** — LinkedIn / X / WhatsApp / copy-link share for live adverts; RSS feed generator (behind the storage flag).
- **Security** — role-based Firestore rules for every collection; candidates can never edit applications after submission; audit log is append-only; candidate offer-response rule is tightly scoped.

### Verified

- `tsc --noEmit`: **0 errors** · `vite build`: passing.

## Status: what's left ⏳

### Blocked on decisions/infrastructure (paused deliberately)

- **Firebase Storage** (needs Blaze plan / card, or the cPanel alternative): CV & cover-letter uploads, profile CV, job-description attachments, RSS feed file. Code is done — flip `STORAGE_ENABLED` when ready.
- **Email sending**: notifications are queued in Firestore; connect the Trigger Email extension (Blaze + SendGrid/Resend) **or** a cPanel PHP mailer on autumhire.com. Small `notify()` change once decided.
- **Automated Firestore backups** (console task, needs Blaze).

### Remaining work (not blocked)

- Deploy a demo (Firebase Hosting free tier, or cPanel subdomain).
- Replace browser `alert/confirm/prompt` dialogs with proper toasts/dialogs (sonner is already installed).
- Interview report download (printable per-interview report).
- Share candidate profile by email (mailto draft with summary + answers).
- Bulk archiving of old jobs/candidates.
- CSV import of positions/candidates ("import from Excel" requirement).
- Remove leftover Plan Selection / Payment template pages; real content for Terms/About/Contact.
- Full end-to-end test pass of the pipeline with real accounts.

## Structure

- `src/services/` — all Firestore/Storage access (jobs, applications, interviews, offers, requisitions, notifications, templates, workflows, question bank, job alerts, feed, audit, profiles)
- `src/pages/{admin,recruiter,hiring-manager,candidate}/` — role-specific pages
- `src/lib/featureFlags.ts` — temporary infrastructure switches
- `firestore.rules`, `storage.rules`, `firestore.indexes.json` — security rules & indexes (roles enforced server-side)
