import { Injectable } from '@nestjs/common';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  /** R9: the model key belongs to this process only. Absent means AI jobs park. */
  ANTHROPIC_API_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

/**
 * Nest injects constructor parameters by type metadata, and a parameter with a
 * default value is still passed as `undefined`. The constructor therefore takes
 * nothing and reads `process.env` itself.
 */
@Injectable()
export class WorkerConfig {
  readonly databaseUrl: string;
  readonly redisUrl: string;
  readonly anthropicApiKey?: string;

  constructor() {
    const parsed = schema.parse(process.env);
    this.databaseUrl = parsed.DATABASE_URL;
    this.redisUrl = parsed.REDIS_URL;
    this.anthropicApiKey = parsed.ANTHROPIC_API_KEY;
  }

  /** Reported by the API's /ready as the `ai` capability flag. */
  get aiEnabled() {
    return Boolean(this.anthropicApiKey);
  }
}
