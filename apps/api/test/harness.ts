import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pg from 'pg';
import { runMigrations } from '@campath/db';
import { seed, type SeedResult } from '@campath/db/seed';
import { AppModule } from '../src/app.module.js';
import { REDIS_CLIENT } from '../src/redis.module.js';
import { S3_CLIENT } from '../src/storage.module.js';
import { LOGIN_LIMITER } from '../src/common/rate-limit.guard.js';

export const SEED_CREDENTIALS = {
  ownerEmail: 'owner@test.local',
  ownerPassword: 'owner-password-1',
  teacherEmail: 'teacher@test.local',
  teacherPassword: 'teacher-password-1',
  studentPassword: 'student-password-1',
};

export interface Harness {
  app: INestApplication;
  pool: pg.Pool;
  seeded: SeedResult;
  stop: () => Promise<void>;
}

/**
 * Boots a real PostgreSQL 16 in Docker, applies every migration and seeds it,
 * then starts the API against it. No database mocking: an authorization rule
 * that lives in SQL is only proved by SQL.
 *
 * Redis and S3 are stubbed — the authorization surface does not touch them, and
 * two more containers would double the suite's start-up for nothing.
 */
export async function startHarness(): Promise<Harness> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('campath')
    .withUsername('campath')
    .withPassword('campath')
    .start();

  const databaseUrl = container.getConnectionUri();
  const pool = new pg.Pool({ connectionString: databaseUrl });
  await runMigrations(pool);
  const seeded = await seed(pool, SEED_CREDENTIALS);

  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET ??= 'test-only-access-secret-at-least-32-chars';
  process.env.NODE_ENV = 'test';

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(REDIS_CLIENT)
    .useValue({ ping: async () => 'PONG', quit: async () => undefined })
    .overrideProvider(S3_CLIENT)
    .useValue({ headBucket: async () => ({}) })
    .compile();

  const app = moduleRef.createNestApplication();
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  await app.init();

  return {
    app,
    pool,
    seeded,
    stop: async () => {
      await app.close();
      await pool.end();
      await container.stop();
    },
  };
}

/** Rate limiting is process-global; a shared bucket would fail unrelated tests. */
export const resetRateLimits = () => LOGIN_LIMITER.reset();

export async function login(
  app: INestApplication,
  identifier: string,
  password: string,
): Promise<{ accessToken: string; refreshCookie: string }> {
  const { default: request } = await import('supertest');
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ identifier, password })
    .expect(200);

  const setCookie = response.headers['set-cookie'] as unknown as string[] | undefined;
  return {
    accessToken: response.body.accessToken as string,
    refreshCookie: setCookie?.[0]?.split(';')[0] ?? '',
  };
}
