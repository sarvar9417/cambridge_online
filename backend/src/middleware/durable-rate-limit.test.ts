import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { clearRateLimits } from './rate-limit.js';
import { durableRateLimit } from './durable-rate-limit.js';

function responseHarness() {
  const headers = new Map<string,string>();
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return {
    headers,
    json,
    status,
    response: {
      setHeader: (name:string,value:string) => { headers.set(name,value); },
      status,
    },
  };
}

describe('durableRateLimit rollout compatibility', () => {
  beforeEach(() => clearRateLimits());

  it('falls back to the bounded process-local limiter when migration 0193 is not applied', async () => {
    const missingTable = Object.assign(
      new Error('relation "api_rate_limit_buckets" does not exist'),
      { code:'42P01' },
    );
    const query = vi.fn().mockRejectedValue(missingTable);
    const handler = durableRateLimit(
      { query } as unknown as Pool,
      { windowMs:60_000,max:1,key:()=> 'live:test:user' },
    );
    const req = { ip:'127.0.0.1', actor:{ id:'teacher-1' } };
    const first = responseHarness();
    const firstNext = vi.fn();
    await handler(req as never, first.response as never, firstNext);
    expect(firstNext).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);
    expect(first.headers.get('RateLimit-Remaining')).toBe('0');

    const second = responseHarness();
    const secondNext = vi.fn();
    await handler(req as never, second.response as never, secondNext);
    expect(query).toHaveBeenCalledTimes(1);
    expect(secondNext).not.toHaveBeenCalled();
    expect(second.status).toHaveBeenCalledWith(429);
    expect(second.json).toHaveBeenCalledWith({
      error:{ code:'rate_limited',message:'Juda ko‘p so‘rov. Keyinroq urinib ko‘ring.' },
    });
  });

  it('does not hide unrelated database failures', async () => {
    const failure = Object.assign(new Error('permission denied'), { code:'42501' });
    const query = vi.fn().mockRejectedValue(failure);
    const handler = durableRateLimit(
      { query } as unknown as Pool,
      { windowMs:60_000,max:10,key:()=> 'live:test:other' },
    );
    const res = responseHarness();
    const next = vi.fn();
    await handler({ ip:'127.0.0.1' } as never, res.response as never, next);
    expect(next).toHaveBeenCalledWith(failure);
    expect(res.status).not.toHaveBeenCalled();
  });
});
