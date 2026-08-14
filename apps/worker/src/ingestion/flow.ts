import { FlowProducer, type FlowJob } from 'bullmq';
import type { Redis } from 'ioredis';
import { INGEST_QUEUE, STAGES, type Stage, type StagePayload } from './types.js';

/**
 * BullMQ job id for one stage of one paper.
 *
 * Idempotency lives here: BullMQ refuses a second job with an id it already
 * holds, so re-uploading the same PDF produces the same twelve ids and no
 * duplicate work. The sha256 is the paper's identity, not the row id, because
 * the same file re-uploaded under a new `source_papers` row must still collapse.
 */
export const stageJobId = (sha256: string, stage: Stage) => `ingest:${sha256}:${stage}`;

/**
 * Builds the chain as nested BullMQ children.
 *
 * A FlowProducer parent only runs once its children have completed, so nesting
 * the stages in reverse gives strict ordering with no polling. PERSIST is the
 * outermost parent; UPLOAD is the innermost child and runs first.
 */
export function buildIngestFlow(input: { sourcePaperId: string; sha256: string }): FlowJob {
  const payload = (stage: Stage): StagePayload => ({
    sourcePaperId: input.sourcePaperId,
    sha256: input.sha256,
    stage,
  });

  const node = (stage: Stage, child?: FlowJob): FlowJob => ({
    name: stage,
    queueName: INGEST_QUEUE,
    data: payload(stage),
    opts: {
      jobId: stageJobId(input.sha256, stage),
      // A paper takes 5-10 minutes; keep the record long enough to debug it.
      removeOnComplete: { age: 7 * 24 * 3600 },
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
    },
    ...(child ? { children: [child] } : {}),
  });

  // STAGES is written in execution order, so fold from the front to nest it.
  return STAGES.reduce<FlowJob | undefined>(
    (child, stage) => node(stage, child),
    undefined,
  ) as FlowJob;
}

export class IngestFlow {
  private readonly producer: FlowProducer;

  constructor(connection: Redis) {
    this.producer = new FlowProducer({ connection });
  }

  /**
   * Enqueues a paper. Safe to call repeatedly: the deterministic job ids make a
   * second call a no-op rather than a second extraction.
   */
  async enqueue(input: { sourcePaperId: string; sha256: string }) {
    return this.producer.add(buildIngestFlow(input));
  }

  async close() {
    await this.producer.close();
  }
}
