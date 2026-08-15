import { describe, expect, it } from 'vitest';
import { isDatabaseUnavailable } from './database-unavailable.js';

describe('recognising an unreachable database', () => {
  it('catches the pool timeout, which carries no error code at all', () => {
    // Exactly what pg-pool throws when the pooler accepts the socket and never
    // answers -- the shape that produced "Ichki xato yuz berdi" on every screen.
    const error = Object.assign(new Error('Connection terminated due to connection timeout'), {
      cause: new Error('Connection terminated unexpectedly'),
    });
    expect(isDatabaseUnavailable(error)).toBe(true);
  });

  it('reads the cause when the outer message says nothing useful', () => {
    const error = Object.assign(new Error('Query failed'), {
      cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' }),
    });
    expect(isDatabaseUnavailable(error)).toBe(true);
  });

  it('catches a server that went away mid-query', () => {
    expect(isDatabaseUnavailable(Object.assign(new Error('terminating connection due to administrator command'), { code: '57P01' }))).toBe(true);
    expect(isDatabaseUnavailable(Object.assign(new Error('sorry, too many clients already'), { code: '53300' }))).toBe(true);
  });

  it('catches DNS and network failures', () => {
    for (const code of ['ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH', 'ECONNRESET']) {
      expect(isDatabaseUnavailable(Object.assign(new Error('network'), { code }))).toBe(true);
    }
  });

  it('does not mistake a bad query for a dead database', () => {
    // 42703 is undefined_column. Reporting that as "try again shortly" would
    // hide a real bug behind a retry message forever.
    expect(isDatabaseUnavailable(Object.assign(new Error('column "x" does not exist'), { code: '42703' }))).toBe(false);
    expect(isDatabaseUnavailable(Object.assign(new Error('duplicate key'), { code: '23505' }))).toBe(false);
    expect(isDatabaseUnavailable(new Error('invalid input syntax for type uuid'))).toBe(false);
  });

  it('handles values that are not errors', () => {
    expect(isDatabaseUnavailable(null)).toBe(false);
    expect(isDatabaseUnavailable(undefined)).toBe(false);
    expect(isDatabaseUnavailable('Connection terminated')).toBe(false);
    expect(isDatabaseUnavailable({})).toBe(false);
  });

  it('does not loop forever on a self-referencing cause', () => {
    const error: { message: string; cause?: unknown } = { message: 'boom' };
    error.cause = error;
    expect(() => isDatabaseUnavailable(error)).not.toThrow();
  });
});
