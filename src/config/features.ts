// Compile-time feature flags. A plain constant, never a Firestore
// settings document and never an env var — this project's recurring
// failure has been config that was declared somewhere and never actually
// deployed with the code that reads it. A constant baked into the build
// cannot be out of sync with the build.

/**
 * CLIENT DECISION, 2026-10-15: job matching reverts to the pre-screening
 * question score for phase one (docs/wave-g-brief.md §4, Option 1). The
 * structured skills/capability matching (rows 5.1/5.6/5.8) is parked
 * until AI funding, not deleted.
 *
 * GATED BY THIS FLAG — not dead code, do not remove on a dead-caller
 * sweep:
 *   - src/lib/matching.ts (the scoring function itself) — lazy-imported
 *     by the three components below, never statically imported
 *   - src/components/candidate/CapabilityProfileSection.tsx — lazy,
 *     conditionally rendered from CandidateDashboard.tsx
 *   - src/components/admin/JobRequirementsEditor.tsx — lazy,
 *     conditionally rendered from CreateJob.tsx
 *   - src/pages/admin/BestMatchReport.tsx — lazy, conditionally rendered
 *     from ReportsPage.tsx
 *   - src/pages/admin/SkillsPage.tsx — lazy route element in App.tsx,
 *     plus its AppSidebar nav entry
 *   - the Match Score / Work Auth columns and their computeMatch call in
 *     ApplicationsPage.tsx, and the Match Score/Match Breakdown blocks
 *     and their computeMatch call in CandidateDetail.tsx — gated with a
 *     plain `if (!MATCHING_ENABLED)` / `{MATCHING_ENABLED && ...}`
 *     check, not lazy-imported: these are small inline pieces inside an
 *     existing table row and page, where a lazy boundary would be more
 *     complexity than the (small) bundle weight of matching.ts justifies.
 *     Disclosed, not hidden — see the chunk-size proof this gating round
 *     recorded for whether that call was right.
 *
 * Every one of the above still has live imports in source — they are not
 * orphaned the way exportApplicationsXlsx was (a real caller, deleted
 * entirely, invisible for weeks). They are reachable, correct, and
 * switched off on purpose. Flipping this back to `true` brings all of it
 * back with no other code change. See docs/matching-clickthrough.md for
 * the parked walkthrough and docs/traceability-requirements.md for the
 * row-level status.
 */
export const MATCHING_ENABLED = false;
