import { describe, expect, it } from 'vitest';
import { bandOf } from './StudentLearning';

describe('how a subtopic score is banded', () => {
  it('separates the three states a student can act on', () => {
    // Weak is "practise this", fair is "revise it", strong is "leave it alone".
    expect(bandOf(0.2)).toBe('weak');
    expect(bandOf(0.59)).toBe('weak');
    expect(bandOf(0.6)).toBe('fair');
    expect(bandOf(0.79)).toBe('fair');
    expect(bandOf(0.8)).toBe('strong');
    expect(bandOf(1)).toBe('strong');
  });

  it('treats a never-attempted subtopic as weak rather than strong', () => {
    // Mastery starts at zero. Banding zero as strong would tell a student they
    // had finished a topic they have never seen.
    expect(bandOf(0)).toBe('weak');
  });
});
