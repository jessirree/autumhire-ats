import type { ScreeningQuestion } from '../services/jobService';
import type { ScreeningAnswer } from '../services/applicationService';

/**
 * Per-job score breakdown for the "required vs existing competencies"
 * reports row (5.1/5.8). RECRUITMENT SYSTEM REQUIREMENTS.docx.md's
 * Reliability section: "system checks and reports must be mathematically
 * correct, including ranking of candidates" — the two rules below exist
 * specifically to honor that, not as defensive extras.
 *
 * Rule 1: a question is "scorable" only if it actually carries a rubric —
 * choices with points, or a flat `score` for checkbox/number/free-text.
 * A question with neither (a purely informational free-text question, for
 * instance) can never contribute to anyone's total or maximum, by design,
 * not by omission.
 *
 * Rule 2: a scorable question a given candidate left blank — skipped
 * because it was optional, or simply never answered — must NOT be
 * treated as a zero. It is excluded from that candidate's total AND from
 * that candidate's maximum, not counted as "answered and scored zero".
 * This is the one `scoreAnswers` (applicationService.ts) does not itself
 * guarantee: it sets `score: 0` on an unanswered-but-scorable question
 * the same way it would for a genuinely-zero answer, so this module
 * re-derives "was this actually scored" from the answer text, not from
 * trusting a stored zero.
 *
 * A question whose every choice is worth zero points is a different
 * case from both of the above: it IS scorable (it has a rubric) and, if
 * answered, IS counted — contributing 0 to both the total and the
 * maximum. Zero-contribution is not the same as excluded.
 */

export interface PerQuestionScore {
  questionId: string;
  /** null when this candidate's answer to this question was not scored (rule 2) — never 0 standing in for "unscored". */
  score: number | null;
  /** null for the same reason as `score` — a question's max is only meaningful alongside a score that was actually counted. */
  max: number | null;
}

export interface ScoreSummary {
  perQuestion: PerQuestionScore[];
  totalScore: number;
  totalMax: number;
  /** How many of the job's scorable questions this candidate actually had scored. */
  scoredCount: number;
  /** How many of the job's questions carry a scoring rubric at all — the denominator for "X of N scored". */
  scorableCount: number;
}

/** Rule 1 — does this question carry any scoring rubric at all. */
export function isQuestionScorable(q: ScreeningQuestion): boolean {
  return (!!q.choices && q.choices.length > 0) || !!q.score;
}

/**
 * The question's own maximum achievable score, from its own rubric —
 * never assumed. For a choice-based question (dropdown, or checkbox
 * represented as choices), the highest-points choice. For checkbox/
 * number/free-text questions scored via a flat `score`, that value is
 * the only achievable amount, so it is its own maximum.
 */
export function questionMax(q: ScreeningQuestion): number {
  if (q.choices && q.choices.length > 0) {
    return q.choices.reduce((max, c) => Math.max(max, c.points), 0);
  }
  return q.score ?? 0;
}

/** Rule 2 — was this specific candidate's answer to this question actually scored. */
function wasAnswerScored(q: ScreeningQuestion, a: ScreeningAnswer | undefined): boolean {
  if (!isQuestionScorable(q)) return false;
  if (!a || !a.answer || !a.answer.trim()) return false;
  return true;
}

/**
 * Per-candidate score summary for one job's questions. Pure function —
 * reads the already-stored ScreeningAnswer.score (the existing per-answer
 * scoring from row 3.11/G9, including any recruiter override), never
 * recomputes it. Only the maximum and the scored/unscored determination
 * are computed here.
 */
export function computeScoreSummary(
  questions: ScreeningQuestion[],
  answers: ScreeningAnswer[]
): ScoreSummary {
  let totalScore = 0;
  let totalMax = 0;
  let scoredCount = 0;
  const scorableCount = questions.filter(isQuestionScorable).length;

  const perQuestion: PerQuestionScore[] = questions.map((q) => {
    const a = answers.find((x) => x.questionId === q.id);
    if (!wasAnswerScored(q, a)) {
      return { questionId: q.id, score: null, max: null };
    }
    const score = a!.score ?? 0;
    const max = questionMax(q);
    totalScore += score;
    totalMax += max;
    scoredCount += 1;
    return { questionId: q.id, score, max };
  });

  return { perQuestion, totalScore, totalMax, scoredCount, scorableCount };
}
