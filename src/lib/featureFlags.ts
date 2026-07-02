/**
 * Feature flags — temporary switches while parts of the infrastructure
 * are not yet provisioned.
 *
 * STORAGE_ENABLED: flip to `true` once Firebase Storage is set up on the
 * project (Blaze plan). While `false`:
 *  - application document uploads are skipped (candidates can still apply)
 *  - "require resume/cover letter" checks are not enforced
 *  - profile CV upload and the RSS feed button show a friendly notice
 * Nothing else changes, so re-enabling is a one-line edit.
 */
export const STORAGE_ENABLED = false;
