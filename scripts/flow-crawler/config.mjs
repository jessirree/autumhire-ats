// Shared config for the flow crawler (docs/flow-crawler-spec.md).
// Not part of any pnpm test command — invoked manually via
// `node scripts/flow-crawler/stage1-readonly.mjs`. Requires a running dev
// server and a seeded database (see the spec's §1 preconditions).

import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const BASE_URL = process.env.CRAWLER_BASE_URL || 'http://localhost:5173';

// Matches scripts/seed-test-users.cjs exactly — same password for every
// seeded staff/candidate account, same fixed job/application ids.
const PASSWORD = 'TestPass123!';
export const JOB_ID = 'JOB-TEST-9001';
export const APPLICATION_ID = 'APP-TEST-01';

// The four seeded roles, plus `null` standing for the signed-out pass
// (spec §2/§3: "Plus one pass signed out, for the public job board and the
// advert").
export const IDENTITIES = [
  { role: 'admin', email: 'admin@test.autumhire.local', password: PASSWORD },
  { role: 'recruiter', email: 'recruiter@test.autumhire.local', password: PASSWORD },
  { role: 'hiring-manager', email: 'hm@test.autumhire.local', password: PASSWORD },
  { role: 'candidate', email: 'candidate1@test.autumhire.local', password: PASSWORD },
  { role: 'signed-out', email: null, password: null },
];

// Every route declared in src/App.tsx, read directly from that file rather
// than inferred — includes routes no nav links to, per spec §3 step 2.
// Parameterized segments use the fixed seed ids above. One deliberately
// wrong path per protected section plus one global catch-all, to exercise
// the `*` -> UnderConstruction / Navigate-to-"/" routes.
export const ROUTES = [
  // Public
  { path: '/', label: 'root (role-based redirect)' },
  { path: '/jobs', label: 'public job board' },
  { path: '/about', label: 'about us' },
  { path: '/contact', label: 'contact us' },
  { path: '/terms', label: 'terms and conditions' },
  { path: `/jobs/${JOB_ID}`, label: 'public job detail' },
  { path: `/jobs/${JOB_ID}/apply`, label: 'public application form' },
  { path: '/login', label: 'login' },
  { path: '/signup', label: 'signup' },

  // Candidate
  { path: '/candidate/dashboard', label: 'candidate dashboard' },

  // Admin
  { path: '/admin', label: 'admin index redirect' },
  { path: '/admin/dashboard', label: 'admin dashboard' },
  { path: '/admin/users', label: 'admin: user management' },
  { path: '/admin/positions', label: 'admin: positions' },
  { path: '/admin/requisition-approvals', label: 'admin: requisition approvals' },
  { path: '/admin/templates', label: 'admin: templates' },
  { path: '/admin/screening', label: 'admin: pre-screening builder' },
  { path: '/admin/skills', label: 'admin: skills' },
  { path: '/admin/workflow', label: 'admin: workflow configuration' },
  { path: '/admin/reports', label: 'admin: reports' },
  { path: '/admin/settings', label: 'admin: system settings' },
  { path: '/admin/post-job', label: 'admin: post job wizard' },
  { path: `/admin/edit-job/${JOB_ID}`, label: 'admin: edit job wizard' },
  { path: '/admin/this-route-does-not-exist', label: 'admin: catch-all (UnderConstruction)' },

  // Recruiter
  { path: '/recruiter', label: 'recruiter index redirect' },
  { path: '/recruiter/dashboard', label: 'recruiter dashboard' },
  { path: '/recruiter/requisitions', label: 'recruiter: requisitions' },
  { path: '/recruiter/requisitions/new', label: 'recruiter: new requisition' },
  { path: '/recruiter/adverts', label: 'recruiter: job adverts' },
  { path: '/recruiter/applications', label: 'recruiter: applications' },
  { path: '/recruiter/screening', label: 'recruiter: screening' },
  { path: '/recruiter/candidates', label: 'recruiter: candidates' },
  { path: '/recruiter/interviews', label: 'recruiter: interviews' },
  { path: '/recruiter/offers', label: 'recruiter: offers' },
  { path: '/recruiter/reports', label: 'recruiter: reports' },
  { path: `/recruiter/candidate-detail/${APPLICATION_ID}`, label: 'recruiter: candidate detail' },
  { path: '/recruiter/post-job', label: 'recruiter: post job wizard' },
  { path: '/recruiter/this-route-does-not-exist', label: 'recruiter: catch-all (UnderConstruction)' },

  // Hiring manager
  { path: '/hiring', label: 'hiring manager index redirect' },
  { path: '/hiring/dashboard', label: 'hiring manager dashboard' },
  { path: '/hiring/requisitions', label: 'hiring manager: requisition approvals' },
  { path: '/hiring/requisitions/new', label: 'hiring manager: new requisition' },
  { path: '/hiring/shortlisting', label: 'hiring manager: shortlisting' },
  { path: `/hiring/candidate-detail/${APPLICATION_ID}`, label: 'hiring manager: candidate detail' },
  { path: '/hiring/approvals', label: 'hiring manager: offer approvals' },
  { path: '/hiring/interviews', label: 'hiring manager: interviews' },
  { path: '/hiring/this-route-does-not-exist', label: 'hiring manager: catch-all (UnderConstruction)' },

  // Global catch-all
  { path: '/this-path-does-not-exist-anywhere', label: 'global catch-all (Navigate to /)' },
];

export const OUTPUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'flow-crawler-output');

// Stage 2 (write-path crawl) scopes click-testing to the pages that actually
// render distinct UI for each role, per Stage 1's result that every
// off-role route just bounces to the role's own dashboard. Re-testing a
// bounced-to page once per role that bounces to it would be redundant.
export const STAGE2_ROLE_ROUTES = {
  admin: ROUTES.filter((r) => r.path.startsWith('/admin')),
  recruiter: ROUTES.filter((r) => r.path.startsWith('/recruiter')),
  'hiring-manager': ROUTES.filter((r) => r.path.startsWith('/hiring')),
  candidate: ROUTES.filter((r) => r.path === '/candidate/dashboard'),
};

// Public, candidate-facing pages — tested signed out, which is the realistic
// candidate scenario (spec §5: "rank candidate-facing findings above staff
// ones ... candidates cannot ask anyone what a control does"). The
// candidate application form is visited but never submitted (spec §1 deny
// list: "any <form> submit on the candidate application form").
export const PUBLIC_ROUTES = [
  { path: '/jobs', label: 'public job board' },
  { path: '/about', label: 'about us' },
  { path: '/contact', label: 'contact us' },
  { path: '/terms', label: 'terms and conditions' },
  { path: `/jobs/${JOB_ID}`, label: 'public job detail' },
];

// Accessible-name deny list for Stage 2, narrowed to destructive ACCOUNT
// actions only (2026-10-10 review correction): Stage 2 now runs entirely
// against the Firestore/Auth/Functions/Storage emulator suite (isolation
// proven — see scripts/flow-crawler/prove-isolation.mjs), so create/save/
// post/submit and business-record state transitions (reject/withdraw/
// approve/hire/offer/publish) are all safe to click — they only mutate
// disposable emulator data. The only thing still worth not clicking is
// whatever would end or destroy THIS crawl's own session/identity.
export const DENY_PATTERN = new RegExp(
  '\\b(' +
    ['sign\\s*out', 'log\\s*out', 'delete\\s+(my\\s+)?account', 'deactivate\\s+(my\\s+)?account'].join('|') +
    ')\\b',
  'i'
);
