import { describe, expect, it } from 'vitest';
import {
  calculateInitialRemainingSeconds,
  heartbeatFailureMessage,
  shouldCloseAttempt,
} from './useAttemptTiming';

describe('attempt timing contract', () => {
  it('calculates the initial countdown from server time rather than client time', () => {
    expect(
      calculateInitialRemainingSeconds({
        deadline: '2026-09-07T10:05:30.000Z',
        serverNow: '2026-09-07T10:00:00.000Z',
      }),
    ).toBe(330);
    expect(
      calculateInitialRemainingSeconds({
        deadline: '2026-09-07T09:59:59.000Z',
        serverNow: '2026-09-07T10:00:00.000Z',
      }),
    ).toBe(0);
    expect(
      calculateInitialRemainingSeconds({ deadline: null, serverNow: '2026-09-07T10:00:00.000Z' }),
    ).toBeNull();
  });

  it('closes only expired or server-closed attempts', () => {
    expect(shouldCloseAttempt({ remainingSeconds: 30, status: 'in_progress' })).toBe(false);
    expect(shouldCloseAttempt({ remainingSeconds: null, status: 'not_started' })).toBe(false);
    expect(shouldCloseAttempt({ remainingSeconds: 0, status: 'in_progress' })).toBe(true);
    expect(shouldCloseAttempt({ remainingSeconds: 30, status: 'submitted' })).toBe(true);
  });

  it('preserves useful server failures and keeps the generic saved-answer fallback', () => {
    expect(heartbeatFailureMessage(new Error('Session replaced by another device.')))
      .toBe('Session replaced by another device.');
    expect(heartbeatFailureMessage(new Error('So‘rov bajarilmadi.')))
      .toBe('Urinish yopildi. Javoblaringiz saqlandi.');
    expect(heartbeatFailureMessage('network'))
      .toBe('Urinish yopildi. Javoblaringiz saqlandi.');
  });
});
