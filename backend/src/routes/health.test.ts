import { describe, expect, it } from 'vitest';
import { readinessTimeoutMs } from './health.js';

describe('readiness timeout budget',()=>{
  it('matches the default database connection budget',()=>{
    expect(readinessTimeoutMs({})).toBe(10_000);
  });

  it('prefers an explicit readiness budget and clamps unsafe values',()=>{
    expect(readinessTimeoutMs({DB_READY_TIMEOUT_MS:'12000',DB_CONNECT_TIMEOUT_MS:'5000'})).toBe(12_000);
    expect(readinessTimeoutMs({DB_READY_TIMEOUT_MS:'20'})).toBe(1_000);
    expect(readinessTimeoutMs({DB_READY_TIMEOUT_MS:'90000'})).toBe(30_000);
    expect(readinessTimeoutMs({DB_READY_TIMEOUT_MS:'invalid'})).toBe(10_000);
  });

  it('inherits a configured database connection timeout when no readiness override exists',()=>{
    expect(readinessTimeoutMs({DB_CONNECT_TIMEOUT_MS:'7500'})).toBe(7_500);
  });
});
