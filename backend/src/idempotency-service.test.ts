import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { IdempotencyService, requestFingerprint } from './services/idempotency-service.js';

describe('request idempotency', () => {
  it('fingerprints the method, route and payload deterministically', () => {
    const first = requestFingerprint('POST', '/exports', { refId: 'a' });
    expect(requestFingerprint('POST', '/exports', { refId: 'a' })).toBe(first);
    expect(requestFingerprint('POST', '/exports', { refId: 'b' })).not.toBe(first);
    expect(requestFingerprint('POST', '/assignments', { refId: 'a' })).not.toBe(first);
  });

  it('claims a new key atomically', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1, rows: [{ status: 'processing' }] });
    await expect(
      new IdempotencyService({ query } as unknown as Pool).claim('u', 'request-1', 'hash'),
    ).resolves.toEqual({ kind: 'claimed' });
    expect(query.mock.calls[0]![0]).toContain('on conflict(actor_id,key) do nothing');
  });

  it('replays the saved status and body without claiming again', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            request_hash: 'hash',
            status: 'completed',
            response_status: 202,
            response_body: { id: 'export' },
          },
        ],
      });
    await expect(
      new IdempotencyService({ query } as unknown as Pool).claim('u', 'request-1', 'hash'),
    ).resolves.toEqual({ kind: 'replay', status: 202, body: { id: 'export' } });
  });

  it('rejects reuse with a different request', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ request_hash: 'other', status: 'completed' }],
      });
    await expect(
      new IdempotencyService({ query } as unknown as Pool).claim('u', 'request-1', 'hash'),
    ).rejects.toMatchObject({ code: 'idempotency_conflict', status: 409 });
  });

  it('rejects a concurrent duplicate while the first request is processing', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ request_hash: 'hash', status: 'processing' }],
      });
    await expect(
      new IdempotencyService({ query } as unknown as Pool).claim('u', 'request-1', 'hash'),
    ).rejects.toMatchObject({ code: 'idempotency_in_progress', status: 409 });
  });

  it('stores successful responses and releases failed claims', async () => {
    const query = vi.fn().mockResolvedValue({});
    const service = new IdempotencyService({ query } as unknown as Pool);
    await service.complete('u', 'request-1', 201, { id: 'assignment' });
    await service.release('u', 'request-2');
    expect(query.mock.calls[0]![0]).toContain("status='completed'");
    expect(query.mock.calls[0]![1]).toEqual(['u', 'request-1', 201, { id: 'assignment' }]);
    expect(query.mock.calls[1]![0]).toContain("status='processing'");
  });
});
