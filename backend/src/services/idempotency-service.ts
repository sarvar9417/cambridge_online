import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { DomainError } from './assignments-service.js';

export type IdempotencyClaim =
  { kind: 'claimed' } | { kind: 'replay'; status: number; body: unknown };

export function requestFingerprint(method: string, path: string, body: unknown) {
  return createHash('sha256')
    .update(JSON.stringify({ method, path, body: body ?? null }))
    .digest('hex');
}

export class IdempotencyService {
  constructor(private readonly pool: Pool) {}

  async claim(actorId: string, key: string, requestHash: string): Promise<IdempotencyClaim> {
    const result = await this.pool.query(
      `insert into idempotency_records(actor_id,key,request_hash)
       values($1,$2,$3) on conflict(actor_id,key) do nothing
       returning status`,
      [actorId, key, requestHash],
    );
    if (result.rowCount) return { kind: 'claimed' };
    const existing = await this.pool.query(
      `select request_hash,status,response_status,response_body
       from idempotency_records where actor_id=$1 and key=$2 and expires_at>now()`,
      [actorId, key],
    );
    if (!existing.rowCount) {
      await this.pool.query(
        `delete from idempotency_records where actor_id=$1 and key=$2 and expires_at<=now()`,
        [actorId, key],
      );
      return this.claim(actorId, key, requestHash);
    }
    const row = existing.rows[0];
    if (row.request_hash !== requestHash) throw new DomainError('idempotency_conflict', 409);
    if (row.status === 'processing') throw new DomainError('idempotency_in_progress', 409);
    return { kind: 'replay', status: Number(row.response_status), body: row.response_body };
  }

  async complete(actorId: string, key: string, responseStatus: number, responseBody: unknown) {
    await this.pool.query(
      `update idempotency_records set status='completed',response_status=$3,response_body=$4
       where actor_id=$1 and key=$2 and status='processing'`,
      [actorId, key, responseStatus, responseBody],
    );
  }

  async release(actorId: string, key: string) {
    await this.pool.query(
      `delete from idempotency_records where actor_id=$1 and key=$2 and status='processing'`,
      [actorId, key],
    );
  }
}
