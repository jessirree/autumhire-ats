import { EDUCATION_LABELS, educationRank, type EducationLevel } from './education';
import type { RequirementMapping } from '../services/questionBankService';

/**
 * Candidate matching (candidate-matching-spec.md §2.4). A pure function:
 * takes job requirements, a candidate's capability profile, and the
 * question/answer pair needed to resolve the one requirement that isn't
 * profile-backed (work authorisation), and returns a score plus a
 * per-criterion breakdown. No Firestore access — every input here is a
 * plain value the caller already has in memory, so this can be reasoned
 * about and tested without mocking anything.
 *
 * DO NOT import this from a candidate-facing file. §3.3 of the spec: the
 * system never tells an individual how they personally score. There is no
 * stored document to protect — the inputs (the job's public requirements,
 * the candidate's own profile) are each independently readable by the
 * candidate for other legitimate reasons, so a rule can't firewall this.
 * The only real control is architectural: nobody imports this module from
 * src/pages/candidate/**. That is enforced by a test, not a comment — see
 * tests/firestore-rules.test.ts's "Match scoring import discipline" sweep.
 */

// ── Inputs ────────────────────────────────────────────────────────────

/** The subset of Job fields this needs — see jobService.ts's Job interface. */
export interface JobRequirements {
  minYearsExperience?: number;
  minEducation?: EducationLevel;
  /** Match on ids, never requiredSkillNames — names are a denormalised snapshot for the public advert and go stale on rename. */
  requiredSkillIds?: string[];
  workAuthorizationRequired?: boolean;
}

/** The subset of CandidateProfile fields this needs — see profileService.ts. */
export interface CapabilityProfile {
  skillIds?: string[];
  yearsOfExperience?: number;
  highestEducation?: EducationLevel;
}

/** The subset of ScreeningQuestion/ScreeningAnswer this needs to resolve the work-authorization hard criterion. */
export interface LinkedQuestion {
  id: string;
  requirementField?: RequirementMapping;
}
export interface QuestionAnswer {
  questionId: string;
  answer: string;
}

// ── Output ────────────────────────────────────────────────────────────

export type HardCriterionStatus = 'met' | 'unmet' | 'not-required' | 'not-assessed';

export interface HardCriterion {
  key: 'workAuthorization';
  label: string;
  status: HardCriterionStatus;
}

export interface GradientCriterion {
  key: 'experience' | 'education' | 'skills';
  label: string;
  /** false = not assessed (job didn't require it, OR candidate's profile has nothing for it) — never render subScore as 0 when this is false. */
  assessed: boolean;
  /** 0-100, meaningful only when assessed is true. */
  subScore: number | null;
  /** This criterion's share of WEIGHTS below — informational for display; the actual contribution renormalizes against only the other assessed criteria (see computeScore). */
  weight: number;
  /** Human-readable requirement, e.g. "3+ years" or "Not required". */
  required: string;
  /** Human-readable candidate value, e.g. "5 years" or "Not provided". */
  existing: string;
}

export interface MatchResult {
  /**
   * null = not assessed — EITHER the job set none of minYearsExperience/
   * minEducation/requiredSkillIds (spec's first null case: "a job with no
   * requirements has no score"), OR the candidate's profile had nothing
   * relevant to what was asked (spec's second null case: "a candidate with
   * an empty capability profile has no score"). Never render as 0 — both
   * are "not assessed", not "assessed and scored nothing".
   */
  score: number | null;
  /** True only when work authorisation is required AND the linked question's answer resolved falsy. Never true for "not assessed" or "not required" — the flag marks the candidate, it never filters them (spec §3.1/§3.2). */
  flagged: boolean;
  hardCriterion: HardCriterion;
  gradientCriteria: GradientCriterion[];
}

// ── Weighting — the ONLY place weights are defined ──────────────────
//
// Explicit and commented per the spec: a recruiter has to be able to see
// why someone scored what they did, so nothing else in this module or its
// callers should hardcode a weight.
//   - Skills weighted highest (40): required skills are the most
//     job-specific signal a job can declare.
//   - Experience next (35): a broadly comparable gradient across roles.
//   - Education lowest (25): the coarsest and most gameable of the three.
// Sums to 100, but a job rarely requires all three — computeScore
// renormalizes against only the criteria that are actually assessed for a
// given job+candidate pair, not against this fixed total.
const WEIGHTS = {
  skills: 40,
  experience: 35,
  education: 25,
} as const;

// ── Gradient criteria ─────────────────────────────────────────────────

function scoreExperience(
  minYears: number | undefined,
  candidateYears: number | undefined
): GradientCriterion {
  const required = minYears != null ? `${minYears}+ year${minYears === 1 ? '' : 's'}` : 'Not required';
  const existing = candidateYears != null ? `${candidateYears} year${candidateYears === 1 ? '' : 's'}` : 'Not provided';

  if (minYears == null || candidateYears == null) {
    return { key: 'experience', label: 'Years of experience', assessed: false, subScore: null, weight: WEIGHTS.experience, required, existing };
  }
  // Gradient, not binary: full credit at or above the minimum, partial
  // credit proportional to how close the candidate is below it.
  const subScore = minYears <= 0 ? 100 : Math.round(Math.min(1, candidateYears / minYears) * 100);
  return { key: 'experience', label: 'Years of experience', assessed: true, subScore, weight: WEIGHTS.experience, required, existing };
}

function scoreEducation(
  minEducation: EducationLevel | undefined,
  candidateEducation: EducationLevel | undefined
): GradientCriterion {
  const required = minEducation ? `${EDUCATION_LABELS[minEducation]} or higher` : 'Not required';
  const existing = candidateEducation ? EDUCATION_LABELS[candidateEducation] : 'Not provided';

  if (!minEducation || !candidateEducation) {
    return { key: 'education', label: 'Highest education', assessed: false, subScore: null, weight: WEIGHTS.education, required, existing };
  }
  const requiredRank = educationRank(minEducation);
  const candidateRank = educationRank(candidateEducation);
  // Same gradient shape as experience: full credit at or above the
  // required level on the ranked scale, partial credit for progress toward it.
  const subScore = requiredRank <= 0 ? 100 : Math.round(Math.min(1, candidateRank / requiredRank) * 100);
  return { key: 'education', label: 'Highest education', assessed: true, subScore, weight: WEIGHTS.education, required, existing };
}

function scoreSkills(
  requiredSkillIds: string[] | undefined,
  candidateSkillIds: string[] | undefined
): GradientCriterion {
  const requiredCount = requiredSkillIds?.length ?? 0;
  const candidateCount = candidateSkillIds?.length ?? 0;
  const existing = candidateCount > 0 ? `${candidateCount} skill${candidateCount === 1 ? '' : 's'} listed` : 'Not provided';

  if (requiredCount === 0 || candidateCount === 0) {
    const required = requiredCount > 0 ? `${requiredCount} skill${requiredCount === 1 ? '' : 's'}` : 'Not required';
    return { key: 'skills', label: 'Required skills', assessed: false, subScore: null, weight: WEIGHTS.skills, required, existing };
  }
  const candidateSet = new Set(candidateSkillIds);
  const matched = (requiredSkillIds ?? []).filter((id) => candidateSet.has(id)).length;
  const subScore = Math.round((matched / requiredCount) * 100);
  return {
    key: 'skills',
    label: 'Required skills',
    assessed: true,
    subScore,
    weight: WEIGHTS.skills,
    required: `${requiredCount} skill${requiredCount === 1 ? '' : 's'} (${matched} matched)`,
    existing,
  };
}

function computeScore(criteria: GradientCriterion[]): number | null {
  const active = criteria.filter((c) => c.assessed);
  if (active.length === 0) return null;
  const totalWeight = active.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = active.reduce((sum, c) => sum + (c.subScore ?? 0) * c.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

// ── Hard criterion: work authorisation ────────────────────────────────

/**
 * Truthy meets the requirement, falsy raises the flag, no linked question
 * (or a linked question with no/unrecognized answer) means not assessed —
 * never inferred from question text, only from the explicit
 * requirementField link (spec §4).
 */
function resolveWorkAuthorization(
  questions: LinkedQuestion[],
  answers: QuestionAnswer[]
): 'met' | 'unmet' | 'not-assessed' {
  const linked = questions.find((q) => q.requirementField === 'workAuthorization');
  if (!linked) return 'not-assessed';
  const raw = answers.find((a) => a.questionId === linked.id)?.answer?.trim().toLowerCase();
  if (!raw) return 'not-assessed';
  if (['yes', 'true', '1'].includes(raw)) return 'met';
  if (['no', 'false', '0'].includes(raw)) return 'unmet';
  return 'not-assessed'; // an unrecognized answer format — don't guess
}

// ── Entry point ─────────────────────────────────────────────────────

export function computeMatch(
  job: JobRequirements,
  profile: CapabilityProfile,
  questions: LinkedQuestion[],
  answers: QuestionAnswer[]
): MatchResult {
  const gradientCriteria = [
    scoreExperience(job.minYearsExperience, profile.yearsOfExperience),
    scoreEducation(job.minEducation, profile.highestEducation),
    scoreSkills(job.requiredSkillIds, profile.skillIds),
  ];
  const score = computeScore(gradientCriteria);

  const hardStatus: HardCriterionStatus = !job.workAuthorizationRequired
    ? 'not-required'
    : resolveWorkAuthorization(questions, answers);

  return {
    score,
    flagged: hardStatus === 'unmet',
    hardCriterion: { key: 'workAuthorization', label: 'Work authorisation', status: hardStatus },
    gradientCriteria,
  };
}
