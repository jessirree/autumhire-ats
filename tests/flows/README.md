# Requirements flow suite

Playwright tests proving specific `docs/traceability-v2.md` rows actually
work, against the emulator and a real production preview build — not a
crawler, not a read of the code. One spec file per
`docs/requirements-source.md` stage; each test named by its requirement ID
(`APP-7: ...`, `JA-6: ...`) so the suite's output maps one-to-one onto the
traceability table.

Run everything: `pnpm test:flows` (seeds the emulator with the existing
seed script, builds the app, serves it via `vite preview`, runs Playwright).
Run one file alone: `npx playwright test tests/flows/<file>.spec.ts` against
an already-running emulator + preview — see `helpers.ts` for the ports.

## Standing rule: every negative assertion needs a positive control

Before asserting something is **absent** — `toHaveCount(0)`, a toast that
shouldn't appear, a row that shouldn't render — assert something **present**
first, to prove the page actually finished loading/fetching before the
absence is checked.

This is not a style preference. `job-advertisement.spec.ts`'s JA-12 test
originally asserted a confidential job's title had zero matches on the
public `/jobs` page immediately after `page.goto()`. That passed even with
the confidentiality filter deleted entirely from both the query and the
matching `firestore.rules` condition — because the assertion ran before the
page's async `getPublicJobs()` fetch had resolved. An empty page and a
correctly-filtered page look identical to `toHaveCount(0)` checked too
early. The fix: seed a same-shaped, non-confidential control job in the
same `beforeAll`, and wait for *that* job's title to render before asserting
the confidential one's absence. A query that genuinely returned nothing
wouldn't show the control either, so the control's presence is proof the
fetch actually completed and rendered something.

Apply this to every test in this suite that asserts absence. A test whose
pass doesn't depend on the feature working is not a test — it's decoration
that happens to run green.

Re-auditing the first 10 tests against this rule after adding it found two
more real instances, both fixed: `job-applications.spec.ts`'s APP-7 checked
"not already applied" before the real form had rendered (harmless in
practice, since the next line's `fillBioData()` auto-waits on form fields
and would have caught the same bug by accident — but fixed properly rather
than left to that accident), and `offers-regrets.spec.ts`'s OFF-1 checked
"no pending offer" immediately after a `page.reload()`, which resets
`myOffers` to `[]` until `getOffersForCandidate()` resolves again — the
exact same trivial-pass shape as JA-12, genuinely live until fixed.

## Mechanics

- **Emulator only.** Every spec signs in via `helpers.ts`'s seeded test
  users (`admin@test.autumhire.local` etc., password `TestPass123!`) and
  reads/writes through the real client SDK against `127.0.0.1:8080`/`9099`.
  Never points at a real Firebase project.
- **Setup via the client SDK, not the UI, where the UI has no fast path.**
  Seeding a dedicated `Job`/`Application`/`Offer` document directly
  (`emulatorApp()` in `helpers.ts`) is faster than driving a multi-step
  wizard and just as real — what matters is that the *assertion* exercises
  the real app code, not how the fixture got created.
- **Each spec file is independently runnable.** No test depends on another
  file having run first, and most tests seed their own dedicated
  Job/Application/Offer ids (`JOB-FLOW-*`, `APP-FLOW-*`) rather than
  mutating the shared seed fixtures, so re-running the suite (or one file
  alone) doesn't drift.
- **Results append to `results.jsonl` as each test finishes**, never
  buffered to the end (`jsonl-reporter.ts`) — a reaped run still leaves a
  partial, trustworthy record instead of nothing.
- **`pnpm evidence:regenerate`** (`scripts/regenerate-traceability-evidence.cjs`)
  reads that JSONL and updates `docs/traceability-v2.md`'s Evidence
  tier/Evidence/Notes columns, upgrading BUILT UNVERIFIED → VERIFIED on a
  pass, so the table stops being hand-maintained for any row this suite
  covers.

## What's covered, how, and what still isn't

- **Bucket A, category 1** (fails silently: status transitions,
  notification sends, rule enforcement) and **category 2** (the one
  bulk/concurrent row, `ARC-1`) are done. **Category 3** (the remaining
  ~29 bucket-A rows, lower risk) is not attempted yet.
- **Bucket B rows** (`REF-2`, `OFF-2`, `OFF-4`, `SEC-1`) needed a Firestore
  read, a function-trigger log, or a direct rules-layer assertion rather
  than a DOM check — a UI that shows the right toast while the backend
  does the wrong thing (the exact shape of all four's original bugs) is
  invisible to `expect(page....)`. `SEC-1` lives in
  `tests/firestore-rules.test.ts` as a direct `assertFails`/`assertSucceeds`
  rule test; `REF-2`/`OFF-2`/`OFF-4` live here as ordinary flow specs that
  drive the real UI action, then read the actual `Notifications`/
  `Applications` document it produced via the same `emulatorApp()` client
  used for setup, instead of trusting a toast or a status label.
- **Bucket C rows** (`JA-14`, `APP-1`, `LOC-1`) are permanently out of
  scope — "unlimited" is unfalsifiable by any finite test, and "works from
  multiple locations" has no location-dependent code path to exercise.
  See `docs/traceability-v2.md`'s VERIFIED BY ARCHITECTURE/DISCLOSED status.

## Proof discipline

Every test in this suite, when added, was deliberately broken in the real
source (not the test), shown failing, restored, and shown passing again.
A test that has never been seen to fail is not evidence it catches
anything — this project has shipped dead features that passed review on
exactly that kind of false confidence before.
