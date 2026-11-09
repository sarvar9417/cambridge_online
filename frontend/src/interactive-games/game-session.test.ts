import { describe, expect, it } from 'vitest';
import { formatClock, GAME_TIMER_OPTIONS } from './game-session';

describe('original Interactive Games session utilities', () => {
  it('formats an elapsed or remaining clock without negative time', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(9)).toBe('00:09');
    expect(formatClock(60)).toBe('01:00');
    expect(formatClock(305)).toBe('05:05');
    expect(formatClock(-15)).toBe('00:00');
  });
  it('provides unlimited study and timed classroom rounds', () => {
    expect(GAME_TIMER_OPTIONS.map((option) => option.seconds)).toEqual([0, 30, 60, 120, 300, 600]);
  });
});
