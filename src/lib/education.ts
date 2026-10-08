/**
 * Ordered highest-education scale (candidate-matching spec §2.2/§2.3),
 * defined once and imported by both the candidate capability profile and
 * the job requirements picker — an unordered set of strings can't answer
 * "at least a Bachelors", which step 3/4 need. Order matters: a level's
 * index in this array IS its rank.
 */
export const EDUCATION_LEVELS = [
  'none',
  'high-school',
  'certificate',
  'diploma',
  'bachelors',
  'masters',
  'doctorate',
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  none: 'No formal education',
  'high-school': 'High School',
  certificate: 'Certificate',
  diploma: 'Diploma',
  bachelors: "Bachelor's Degree",
  masters: "Master's Degree",
  doctorate: 'Doctorate',
};

/** A level's index in EDUCATION_LEVELS — higher means more advanced. */
export function educationRank(level: EducationLevel): number {
  return EDUCATION_LEVELS.indexOf(level);
}
