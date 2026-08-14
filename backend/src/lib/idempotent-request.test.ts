import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import type { Pool } from 'pg';
import { runIdempotent } from './idempotent-request.js';
import { requestFingerprint } from '../services/idempotency-service.js';

function request() {
  return {
    get: vi.fn().mockReturnValue('request-key-123'),
    actor: { id: 'user-id' },
    method: 'POST',
    originalUrl: '/api/v1/exports',
    body: { refId: 'ref-id' },
  } as unknown as Request;
}

function response() {
  const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
}

describe('idempotent Express operation', () => {
  it('stores a newly completed response before returning it', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: 'processing' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });
    const operation = vi.fn().mockResolvedValue({ status: 202, body: { id: 'export-id' } });
    const res = response();
    await runIdempotent(request(), res, { query } as unknown as Pool, operation);
    expect(operation).toHaveBeenCalledOnce();
    expect(query.mock.calls[1]![0]).toContain("status='completed'");
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ id: 'export-id' });
  });

  it('replays a completed response without invoking the operation', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            request_hash: requestFingerprint('POST', '/api/v1/exports', { refId: 'ref-id' }),
            status: 'completed',
            response_status: 201,
            response_body: { id: 'existing' },
          },
        ],
      });
    const operation = vi.fn();
    const req = request();
    const res = response();
    await runIdempotent(req, res, { query } as unknown as Pool, operation);
    expect(operation).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Idempotency-Replayed', 'true');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('releases a claim when the operation fails', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: 'processing' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });
    const failure = new Error('operation failed');
    await expect(
      runIdempotent(request(), response(), { query } as unknown as Pool, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(query.mock.calls[1]![0]).toContain('delete from idempotency_records');
  });
});
