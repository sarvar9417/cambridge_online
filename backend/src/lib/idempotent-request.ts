import type { Request, Response } from 'express';
import type { Pool } from 'pg';
import { IdempotencyService, requestFingerprint } from '../services/idempotency-service.js';
import { DomainError } from '../services/assignments-service.js';

interface OperationResult {
  status: number;
  body: unknown;
}

export async function runIdempotent(
  req: Request,
  res: Response,
  pool: Pool,
  operation: () => Promise<OperationResult>,
) {
  const rawKey = req.get('Idempotency-Key');
  if (!rawKey) {
    const result = await operation();
    return res.status(result.status).json(result.body);
  }
  const key = rawKey.trim();
  if (key.length < 8 || key.length > 200) throw new DomainError('invalid_idempotency_key', 400);
  const actorId = req.actor!.id;
  const service = new IdempotencyService(pool);
  const hash = requestFingerprint(req.method, req.originalUrl.split('?')[0]!, req.body);
  const claim = await service.claim(actorId, key, hash);
  if (claim.kind === 'replay') {
    res.setHeader('Idempotency-Replayed', 'true');
    return res.status(claim.status).json(claim.body);
  }
  try {
    const result = await operation();
    await service.complete(actorId, key, result.status, result.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    await service.release(actorId, key);
    throw error;
  }
}
