import { describe, expect, it } from 'vitest';
import { assertExpectedLiveExamVersion } from './live-exam-transition-guard.js';

describe('assertExpectedLiveExamVersion', () => {
  it('keeps old clients compatible while expectedVersion is omitted', () => {
    expect(() => assertExpectedLiveExamVersion({ version: 7 })).not.toThrow();
  });

  it('accepts the exact authoritative session version', () => {
    expect(() => assertExpectedLiveExamVersion({ version: 7 }, 7)).not.toThrow();
  });

  it('rejects a stale teacher transition', () => {
    try {
      assertExpectedLiveExamVersion({ version: 8 }, 7);
      throw new Error('expected conflict');
    } catch (error) {
      expect(error).toMatchObject({ code: 'live_state_conflict', status: 409 });
    }
  });

  it('fails closed when the locked session version is not trustworthy', () => {
    try {
      assertExpectedLiveExamVersion({ version: 'not-a-version' }, 7);
      throw new Error('expected conflict');
    } catch (error) {
      expect(error).toMatchObject({ code: 'live_state_conflict', status: 409 });
    }
  });
});
