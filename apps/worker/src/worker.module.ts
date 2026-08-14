import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker, type Processor } from 'bullmq';
import { Redis } from 'ioredis';
import { createDb, type Database, type DbHandle } from '@campath/db';
import { WorkerConfig } from './config.js';
import { IngestionModule } from './ingestion/ingestion.module.js';
import { DATABASE, REDIS } from './tokens.js';

export { DATABASE, REDIS } from './tokens.js';

/** Every queue the system uses. Named here so api and worker cannot disagree. */
export const QUEUES = {
  ingest: 'campath.ingest',
  grade: 'campath.grade',
  export: 'campath.export',
  content: 'campath.content',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/**
 * Creates a BullMQ worker bound to the shared connection.
 *
 * `maxRetriesPerRequest: null` is required by BullMQ for blocking commands; the
 * API's own Redis client keeps the opposite setting because it must fail fast.
 */
export function createQueueWorker(
  name: QueueName,
  connection: Redis,
  processor: Processor,
): Worker {
  return new Worker(name, processor, { connection, concurrency: 2 });
}

@Global()
@Module({
  imports: [IngestionModule],
  providers: [
    WorkerConfig,
    {
      provide: REDIS,
      inject: [WorkerConfig],
      useFactory: (config: WorkerConfig) =>
        new Redis(config.redisUrl, { maxRetriesPerRequest: null }),
    },
    {
      provide: DATABASE,
      inject: [WorkerConfig],
      useFactory: (config: WorkerConfig): DbHandle => createDb(config.databaseUrl, 5),
    },
    {
      provide: 'QUEUES',
      inject: [REDIS],
      useFactory: (connection: Redis) =>
        Object.fromEntries(
          Object.values(QUEUES).map((name) => [name, new Queue(name, { connection })]),
        ) as Record<QueueName, Queue>,
    },
  ],
  exports: [WorkerConfig, REDIS, DATABASE, 'QUEUES'],
})
export class WorkerModule implements OnApplicationShutdown {
  constructor(
    @Inject(DATABASE) private readonly db: DbHandle,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async onApplicationShutdown() {
    await this.db.close();
    await this.redis.quit().catch(() => undefined);
  }
}

export type { Database };
