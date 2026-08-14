import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@campath/db';
import { schema } from '@campath/db';
import type { Stage, StagePayload } from './types.js';

/**
 * Stage output kept in `jobs.result`, keyed by the idempotency key.
 *
 * The whole point is resumption. BullMQ retries a failed stage, and the stages
 * before it must not run again: PREPARE alone is a minute of poppler and
 * EXTRACT_QP is real money. On restart each stage reads its predecessor's
 * committed output from Postgres rather than recomputing it.
 *
 * `jobs` is the audit table; this is the same row the run is recorded in.
 */
export class StageStore {
  constructor(private readonly db: Database) {}

  private key(payload: StagePayload, stage: Stage) {
    return `ingest:${payload.sha256}:${stage}`;
  }

  async begin(payload: StagePayload) {
    await this.db
      .insert(schema.jobs)
      .values({
        kind: `ingest.${payload.stage}`,
        refTable: 'source_papers',
        refId: payload.sourcePaperId,
        status: 'running',
        payload,
        idempotencyKey: this.key(payload, payload.stage),
        startedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.jobs.idempotencyKey,
        set: {
          status: 'running',
          attempts: sql`${schema.jobs.attempts} + 1`,
          startedAt: new Date(),
          error: null,
        },
      });
  }

  async complete(payload: StagePayload, result: unknown) {
    await this.db
      .update(schema.jobs)
      .set({ status: 'succeeded', result: result as never, finishedAt: new Date() })
      .where(eq(schema.jobs.idempotencyKey, this.key(payload, payload.stage)));
  }

  async fail(payload: StagePayload, error: unknown) {
    await this.db
      .update(schema.jobs)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        finishedAt: new Date(),
      })
      .where(eq(schema.jobs.idempotencyKey, this.key(payload, payload.stage)));
  }

  /** Output of an earlier stage, or null when it has not succeeded yet. */
  async read<T>(payload: StagePayload, stage: Stage): Promise<T | null> {
    const [row] = await this.db
      .select({ result: schema.jobs.result, status: schema.jobs.status })
      .from(schema.jobs)
      .where(
        and(
          eq(schema.jobs.idempotencyKey, this.key(payload, stage)),
          eq(schema.jobs.status, 'succeeded'),
        ),
      )
      .limit(1);
    return (row?.result as T | undefined) ?? null;
  }

  /** Skips work that already succeeded — the restart path. */
  async alreadyDone(payload: StagePayload): Promise<boolean> {
    return (await this.read(payload, payload.stage)) !== null;
  }
}
