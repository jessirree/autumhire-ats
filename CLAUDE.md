# Autumhire ATS — Project Guide

Applicant tracking system. Single-page React app on Firebase, deployed to Vercel.

## Stack (do not change without being asked)

| Layer | Choice | Notes |
|---|---|---|
| Build | Vite 6.3.5 (pinned via pnpm overrides) | `pnpm dev`, `pnpm build` |
| UI | React 18.3.1 + TypeScript 5.7 | function components, named exports |
| Routing | react-router-dom 7 | all routes declared in `src/App.tsx` |
| Styling | Tailwind v4 (`@tailwindcss/vite`) + CSS variables | tokens in `src/index.css` |
| Components | shadcn/Radix in `src/components/ui` | reuse, do not re-implement |
| Icons | `lucide-react` | MUI is present but legacy, prefer lucide |
| Toasts | `sonner` via `toast()` | `Toaster` already mounted in App.tsx |
| Data | Firebase Firestore (modular v12 SDK) | one service module per domain |
| Files | Firebase Storage (PDFs) + Cloudflare R2 (video) | see video docs |
| Server | Firebase Cloud Functions, `functions/index.js` (CommonJS, Node) | |
| Auth | Firebase Auth + `role` custom claim | synced by `syncUserRoleClaim` |

## Non-negotiable conventions

1. **Services own all Firestore access.** Components never import `firebase/firestore` directly. Every collection gets a module in `src/services/<domain>Service.ts` exporting typed functions plus its interfaces.
2. **Roles are `admin` | `recruiter` | `hiring-manager` | `candidate`.** Staff = the first three. Route guards use `<ProtectedRoute allowedRoles={[...]}>`. The URL segment for hiring-manager is `hiring`.
3. **Every staff mutation calls `logAudit(by, action, entity, entityId, detail)`** from `src/services/auditService.ts`. The requirements doc mandates a full audit trail.
4. **Candidate-facing state changes call `notify({...})`** from `src/services/notificationService.ts`.
5. **Applications are immutable to candidates after submission.** Enforced in `firestore.rules`. Never relax this.
6. **Security rules are the real access control**, not the UI. Any new collection needs a matching block in `firestore.rules` in the same change.
7. **No `any` in new code.** Existing `any` is legacy, do not add more.
8. **Never commit secrets.** `.env` is gitignored. Server secrets live in Functions config / environment, never in `VITE_*`.

## Theme — use these, never raw hex

Defined in `src/index.css` `:root`, exposed to Tailwind via `@theme` and `tailwind.config.ts`.

Brand: `--autumn-primary #C75B39` · `--autumn-dark #A3432A` · `--autumn-light #E8937A`
Palette: `--fiery-red #C0392B` · `--golden-yellow #F39C12` · `--pumpkin-orange #E67E22` · `--forest-green #27AE60` · `--olive-green #8E9B40` · `--sky-blue #3498DB` · `--charcoal-gray #2C3E50`
Semantic: `--background #FAFAF8` · `--foreground #2C3E50` · `--card #FFFFFF` · `--muted #F5F0EB` · `--muted-foreground #7C7269` · `--border #E5DDD5` · `--ring #C75B39`
Floating/menu (added 2026-10-09 — were undefined, which is why the first real Popover/Command consumer rendered with no background and a solid-brand-color hover): `--popover #FFFFFF` · `--popover-foreground #2C3E50` · `--accent #FDF5F2` (subtle hover/selected tint, NOT the strong CTA color — that's `--primary`) · `--accent-foreground #C75B39`

Utility classes available: `bg-autumn-primary`, `text-autumn-primary`, `bg-autumn-dark`, `text-autumn-charcoal`, `border-border`, `bg-card`, `bg-muted`, `text-muted-foreground`, `bg-autumn-green`, `text-autumn-red`, and the shadcn semantic set.

Surface recipe used across the app: `bg-card rounded-lg border border-border p-6`. Primary button: `bg-autumn-primary text-white hover:bg-autumn-dark`. Font is Inter.

Status colour mapping lives in `src/components/ats/StatusBadge.tsx` — extend it rather than inventing new badge colours.

## Layout

```
src/
  App.tsx                  all routes + wrapper components
  components/ats/          app chrome (Sidebar, Header, StatusBadge, StatsCard, ...)
  components/ui/           shadcn primitives
  context/AuthContext.tsx  useAuth() -> { user, isAuthenticated, isLoading, logout }
  layouts/DashboardLayout  staff shell (sidebar + header + <Outlet/>)
  lib/                     firebase.ts, featureFlags.ts, utils.ts, print/share helpers
  pages/{admin,auth,candidate,hiring-manager,recruiter}/
  services/                one module per Firestore domain
functions/index.js         Cloud Functions
firestore.rules            Firestore access control
storage.rules              Firebase Storage access control
```

## Active work: Video Interviews

The async (one-way) video interview module is being built. **Read these before touching anything under `videoInterview`, `VideoKits`, `VideoInterviews`, `/vi/*`, or `functions/videoInterviews*`:**

- `docs/video-interviews/00-orchestration-plan.md` — build waves, agents, gates
- `docs/video-interviews/01-product-spec.md` — scope and competitive feature set
- `docs/video-interviews/02-data-model.md` — collections, R2 keys, security rules
- `docs/video-interviews/03-api-contract.md` — the Cloud Function endpoints (frozen contract)
- `docs/video-interviews/04-recorder-spec.md` — MediaRecorder codec matrix and upload protocol
- `docs/video-interviews/05-ui-spec.md` — screens, states, theme application
- `docs/video-interviews/06-acceptance-criteria.md` — definition of done

Hard rules for that module:

1. Video bytes never pass through Firestore or Cloud Functions. Browser uploads direct to R2 with a presigned URL; playback uses a short-lived signed GET.
2. The candidate recording route `/vi/:token` is **public** — no Firebase Auth. Authorisation is the opaque token alone.
3. Raw invite tokens are never stored. Firestore holds `tokenHash` (SHA-256 hex) only.
4. `VideoInterviews` documents are written **only** by Cloud Functions (Admin SDK). Client rules are read-only.
5. Timing, attempt counts and expiry are enforced server-side. Client-side timers are UX only.

## Build and check

```
pnpm install
pnpm build                            # must pass with zero TS errors before any work is called done
npx tsc --noEmit -p tsconfig.app.json # typecheck only
```

The root `tsconfig.json` is references-only (`"files": []`) — a bare `npx tsc --noEmit` with no `-p`
checks zero files and exits 0 whether or not the code actually compiles. Always pass
`-p tsconfig.app.json` (or `-b` to build all referenced projects). This is not optional; a bare
`tsc --noEmit` passing is not evidence of anything.

Verification is typecheck + build + the manual matrix in `06-acceptance-criteria.md`, plus the two automated suites below.

## Testing

| Suite | Command | Covers |
|---|---|---|
| Firestore rules | `pnpm test:rules` | `tests/firestore-rules.test.ts`, via `firebase emulators:exec` |
| Requirements flow suite | `pnpm test:flows` | `tests/flows/*.spec.ts`, Playwright against a production preview build + the emulator — see `tests/flows/README.md` |

**Standing rule for any test that asserts something is absent (`toHaveCount(0)`, "not visible", "no X appears"): add a positive control.** Assert something present first — proving the page actually finished rendering/fetching — before asserting the negative. A negative assertion checked too early passes trivially whether or not the thing it's "catching" would ever have appeared, because the page just hasn't gotten there yet. This is not hypothetical: `tests/flows/job-advertisement.spec.ts`'s JA-12 test originally asserted a confidential job's title had zero matches immediately after `page.goto()`, which passed even with the confidentiality filter itself deleted, because the assertion ran before the async job fetch resolved. Fixed by seeding a same-shaped, non-confidential control job and waiting for *that* to render first. Every negative assertion added after this incident follows the same shape.

## Deploy targets — declaring is not deploying

`pnpm build` only builds the frontend. Nothing else ships with it. This has cost the project real time more than once, so treat each of these as its own step, never assumed:

| Target | Command |
|---|---|
| Frontend | Vercel auto-deploys on push to the deployed branch |
| Firestore rules | `firebase deploy --only firestore:rules` |
| Firestore indexes | `firebase deploy --only firestore:indexes` |
| Cloud Functions | `firebase deploy --only functions` |
| **Storage bucket CORS** | `node scripts/set-storage-cors.cjs <serviceAccountKey.json>` |

That fourth target is easy to miss: bucket CORS is set out of band on the GCS bucket itself, and `firebase deploy` never touches it regardless of which `--only` flag you pass. It's set via the Admin SDK (`scripts/set-storage-cors.cjs`, reading `cors.json`) rather than `gsutil`/`gcloud`, since neither is installed in this project's dev environment. If the mass-CV-download zip (row 5.10) ever breaks specifically on the deployed site but works on localhost, check this first — it means `cors.json` changed (e.g. a new production domain) without the bucket being updated to match.

## Source of truth for requirements

`RECRUITMENT SYSTEM REQUIREMENTS.docx.md` at the repo root. When a feature decision is ambiguous, that document wins.

Traceability uses the stable IDs in `docs/requirements-source.md` (PR-1, LL-3, JA-8, ...), not the old 5.1/5.8/10.3-style numbering. `docs/traceability-requirements.md` is superseded by `docs/traceability-v2.md`.
