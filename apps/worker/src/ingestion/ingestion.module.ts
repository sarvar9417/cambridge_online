import { Inject, Module, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { ClaudeClient } from '@campath/ai';
import type { DbHandle } from '@campath/db';
import { DATABASE, REDIS } from '../worker.module.js';
import { WorkerConfig } from '../config.js';
import { ClaudeExtractor } from './extractor.js';
import { createIngestionProcessor } from './processor.js';
import { INGEST_QUEUE } from './types.js';
import { fetchPdfFromStorage } from './storage.js';

/**
 * Consumes the ingestion queue.
 *
 * Concurrency is 1 on purpose: a paper holds page renders in memory (~200 MB)
 * and the model calls are the bottleneck, so running two papers at once buys
 * nothing and risks the container's memory limit.
 */
@Module({ providers: [] })
export class IngestionModule implements OnModuleInit, OnApplicationShutdown {
  private worker?: Worker;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(DATABASE) private readonly db: DbHandle,
    private readonly config: WorkerConfig,
  ) {}

  onModuleInit() {
    const client = this.config.anthropicApiKey
      ? new ClaudeClient({ apiKey: this.config.anthropicApiKey })
      : null;

    if (!client) {
      // R9 keeps the key here alone, so an unset key means ingestion cannot run
      // at all. Say so once at boot rather than failing every job silently.
      console.warn('ANTHROPIC_API_KEY is not set; ingestion jobs will fail at EXTRACT_QP');
    }

    const processor = createIngestionProcessor({
      db: this.db.db,
      extractor: new ClaudeExtractor(client),
      fetchPdf: fetchPdfFromStorage,
    });

    this.worker = new Worker(INGEST_QUEUE, processor, {
      connection: this.redis,
      concurrency: 1,
      // A paper takes 5-10 minutes; the default lock would expire mid-stage and
      // hand the job to a second worker while the first is still running it.
      lockDuration: 15 * 60_000,
    });

    this.worker.on('failed', (job, error) => {
      console.error(`ingest ${job?.name} failed for ${job?.data?.sha256}: ${error.message}`);
    });
  }

  async onApplicationShutdown() {
    // Waits for the running stage rather than killing it: a half-written
    // PERSIST would be far more expensive than a slow shutdown.
    await this.worker?.close();
  }
}
