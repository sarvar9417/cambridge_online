import { Injectable } from '@nestjs/common';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3001),

  /**
   * Supabase pooler URI (port 6543, transaction mode) for request traffic.
   * Migrations use DIRECT_URL instead — see `packages/db`.
   */
  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),

  /**
   * Supabase Storage speaks the S3 protocol, so the same client works against it
   * and against MinIO in a fully local setup.
   * Endpoint form: https://<project-ref>.supabase.co/storage/v1/s3
   */
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

export type ApiEnv = z.infer<typeof schema>;

/**
 * Validated process configuration, resolved once at boot.
 *
 * Fails fast: a missing JWT secret must stop the process rather than fall back
 * to a default that would sign forgeable tokens.
 *
 * R9: `ANTHROPIC_API_KEY` is deliberately absent — the API never calls a model.
 *
 * The constructor takes no parameters on purpose. Nest resolves constructor
 * arguments by type metadata, and a parameter with a default value is still
 * injected as `undefined`, which silently produced a config object with no
 * secret in it.
 */
@Injectable()
export class ApiConfig {
  private readonly env: ApiEnv;

  constructor() {
    this.env = schema.parse(process.env);
  }

  /** Builds a config from an explicit environment; used by tests. */
  static fromEnv(env: NodeJS.ProcessEnv): ApiConfig {
    const config = Object.create(ApiConfig.prototype) as ApiConfig;
    Object.assign(config, { env: schema.parse(env) });
    return config;
  }

  get nodeEnv() {
    return this.env.NODE_ENV;
  }
  get port() {
    return this.env.PORT;
  }
  get databaseUrl() {
    return this.env.DATABASE_URL;
  }
  get redisUrl() {
    return this.env.REDIS_URL;
  }
  get jwtSecret() {
    return this.env.JWT_SECRET;
  }
  get webOrigin() {
    return this.env.WEB_ORIGIN;
  }
  get isProduction() {
    return this.env.NODE_ENV === 'production';
  }

  get s3() {
    return {
      endpoint: this.env.S3_ENDPOINT,
      region: this.env.S3_REGION,
      bucket: this.env.S3_BUCKET,
      accessKeyId: this.env.S3_ACCESS_KEY_ID,
      secretAccessKey: this.env.S3_SECRET_ACCESS_KEY,
    };
  }
}
