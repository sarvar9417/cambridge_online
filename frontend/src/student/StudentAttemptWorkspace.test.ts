import { describe, expect, it } from 'vitest';
import { answerWordCount, formatRemainingTime, isAnswered } from './StudentAttemptWorkspace';

describe('student attempt workspace helpers', () => {
  it('formats server-authoritative remaining time', () => {
    expect(formatRemainingTime(null)).toBeNull();
    expect(formatRemainingTime(0)).toBe('0:00');
    expect(formatRemainingTime(65)).toBe('1:05');
    expect(formatRemainingTime(3661)).toBe('1:01:01');
  });

  it('treats whitespace-only answers as unanswered', () => {
    expect(isAnswered(undefined)).toBe(false);
    expect(isAnswered('   ')).toBe(false);
    expect(isAnswered('answer')).toBe(true);
  });

  it('counts words without inflating repeated whitespace', () => {
    expect(answerWordCount('')).toBe(0);
    expect(answerWordCount('one')).toBe(1);
    expect(answerWordCount('one   two\nthree')).toBe(3);
  });
});
