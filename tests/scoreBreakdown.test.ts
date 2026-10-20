import { describe, it, expect } from 'vitest';
import { computeScoreSummary, isQuestionScorable, questionMax } from '../src/lib/scoreBreakdown';
import type { ScreeningQuestion } from '../src/services/jobService';
import type { ScreeningAnswer } from '../src/services/applicationService';

const dropdownQ = (id: string, choices: { label: string; points: number }[]): ScreeningQuestion => ({
  id,
  text: `Question ${id}`,
  type: 'dropdown',
  mandatory: true,
  instructions: '',
  choices,
});

const numberQ = (id: string, score: number): ScreeningQuestion => ({
  id,
  text: `Question ${id}`,
  type: 'number',
  mandatory: false,
  instructions: '',
  score,
});

const unscorableFreeTextQ = (id: string): ScreeningQuestion => ({
  id,
  text: `Question ${id}`,
  type: 'text',
  mandatory: false,
  instructions: '',
  // no choices, no score — a purely informational question.
});

const answer = (questionId: string, answerText: string, score?: number): ScreeningAnswer => ({
  questionId,
  question: `Question ${questionId}`,
  answer: answerText,
  score,
});

describe('isQuestionScorable / questionMax', () => {
  it('a question with choices is scorable; its max is the highest-points choice', () => {
    const q = dropdownQ('q1', [{ label: 'A', points: 10 }, { label: 'B', points: 30 }, { label: 'C', points: 5 }]);
    expect(isQuestionScorable(q)).toBe(true);
    expect(questionMax(q)).toBe(30);
  });

  it('a question with a flat score is scorable; its max is that score', () => {
    const q = numberQ('q1', 20);
    expect(isQuestionScorable(q)).toBe(true);
    expect(questionMax(q)).toBe(20);
  });

  it('a question with neither choices nor a score is not scorable; its max is 0', () => {
    const q = unscorableFreeTextQ('q1');
    expect(isQuestionScorable(q)).toBe(false);
    expect(questionMax(q)).toBe(0);
  });

  it('a question where every choice is worth zero is still scorable, with max 0', () => {
    const q = dropdownQ('q1', [{ label: 'A', points: 0 }, { label: 'B', points: 0 }]);
    expect(isQuestionScorable(q)).toBe(true);
    expect(questionMax(q)).toBe(0);
  });
});

describe('computeScoreSummary — no questions scored', () => {
  it('a candidate who answered nothing scores 0/0, with 0 of N scored', () => {
    const questions = [
      dropdownQ('q1', [{ label: 'A', points: 10 }]),
      numberQ('q2', 20),
    ];
    const answers: ScreeningAnswer[] = [answer('q1', ''), answer('q2', '')];
    const summary = computeScoreSummary(questions, answers);
    expect(summary.totalScore).toBe(0);
    expect(summary.totalMax).toBe(0);
    expect(summary.scoredCount).toBe(0);
    expect(summary.scorableCount).toBe(2);
    expect(summary.perQuestion).toEqual([
      { questionId: 'q1', score: null, max: null },
      { questionId: 'q2', score: null, max: null },
    ]);
  });

  it('a candidate with no answers array at all also scores 0/0 of N, not a thrown error', () => {
    const questions = [dropdownQ('q1', [{ label: 'A', points: 10 }])];
    const summary = computeScoreSummary(questions, []);
    expect(summary.totalScore).toBe(0);
    expect(summary.totalMax).toBe(0);
    expect(summary.scoredCount).toBe(0);
    expect(summary.scorableCount).toBe(1);
  });
});

describe('computeScoreSummary — some scored', () => {
  it('mixes scored, unscored-rubric, and unscorable questions correctly', () => {
    const questions = [
      dropdownQ('q1', [{ label: 'A', points: 10 }, { label: 'B', points: 20 }]), // answered
      numberQ('q2', 15), // skipped (optional)
      unscorableFreeTextQ('q3'), // answered, but no rubric — never counted
    ];
    const answers: ScreeningAnswer[] = [
      answer('q1', 'B', 20),
      answer('q2', ''),
      answer('q3', 'Some free-text answer', 15), // scoreAnswers would have set a stray score here; must still be excluded
    ];
    const summary = computeScoreSummary(questions, answers);
    expect(summary.totalScore).toBe(20);
    expect(summary.totalMax).toBe(20);
    expect(summary.scoredCount).toBe(1);
    expect(summary.scorableCount).toBe(2); // q3 is not scorable at all, so it is not in the denominator either
    expect(summary.perQuestion).toEqual([
      { questionId: 'q1', score: 20, max: 20 },
      { questionId: 'q2', score: null, max: null },
      { questionId: 'q3', score: null, max: null },
    ]);
  });
});

describe('computeScoreSummary — all scored', () => {
  it('sums every question when every scorable question was answered', () => {
    const questions = [
      dropdownQ('q1', [{ label: 'A', points: 10 }, { label: 'B', points: 20 }]),
      numberQ('q2', 15),
    ];
    const answers: ScreeningAnswer[] = [answer('q1', 'B', 20), answer('q2', '5', 15)];
    const summary = computeScoreSummary(questions, answers);
    expect(summary.totalScore).toBe(35);
    expect(summary.totalMax).toBe(35);
    expect(summary.scoredCount).toBe(2);
    expect(summary.scorableCount).toBe(2);
  });
});

describe('computeScoreSummary — a question with every option worth zero', () => {
  it('counts as scored (answered, has a rubric) but contributes 0 to both total and max — not excluded', () => {
    const questions = [
      dropdownQ('q1', [{ label: 'A', points: 0 }, { label: 'B', points: 0 }]),
      numberQ('q2', 15),
    ];
    const answers: ScreeningAnswer[] = [answer('q1', 'A', 0), answer('q2', '5', 15)];
    const summary = computeScoreSummary(questions, answers);
    expect(summary.totalScore).toBe(15);
    expect(summary.totalMax).toBe(15);
    // Both questions counted as scored — the zero-value one is not excluded, it just contributes 0.
    expect(summary.scoredCount).toBe(2);
    expect(summary.perQuestion[0]).toEqual({ questionId: 'q1', score: 0, max: 0 });
  });
});

describe('computeScoreSummary — a candidate who skipped an optional question', () => {
  it('excludes the skipped question from both total and maximum, and reports it as unscored', () => {
    const questions = [
      dropdownQ('q1', [{ label: 'A', points: 10 }, { label: 'B', points: 20 }]), // answered
      numberQ('q2', 15), // optional, mandatory: false, skipped
    ];
    const answers: ScreeningAnswer[] = [
      answer('q1', 'B', 20),
      answer('q2', ''), // skipped — scoreAnswers would still have written score: 0 here
    ];
    const summary = computeScoreSummary(questions, answers);
    // Must be 20/20 (q1 only), NOT 20/35 and NOT 20/20-with-q2-counted-as-zero.
    expect(summary.totalScore).toBe(20);
    expect(summary.totalMax).toBe(20);
    expect(summary.scoredCount).toBe(1);
    expect(summary.scorableCount).toBe(2);
    expect(summary.perQuestion[1]).toEqual({ questionId: 'q2', score: null, max: null });
  });
});
