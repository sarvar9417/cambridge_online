import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import type pg from 'pg';
import { Public } from '../common/public.decorator.js';
import { DATABASE_POOL } from '../database.module.js';
import { REDIS_CLIENT, type RedisLike } from '../redis.module.js';
import { S3_CLIENT, type S3Like } from '../storage.module.js';

/** Liveness and readiness. Both public: a probe has no credentials. */
@Controller()
export class HealthController {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: pg.Pool,
    @Inject(REDIS_CLIENT) private readonly redis: RedisLike,
    @Inject(S3_CLIENT) private readonly s3: S3Like,
  ) {}

  /** Liveness: the process is up. Never touches a dependency. */
  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  /**
   * Readiness: every dependency answers. Returns 503 when one is down so an
   * orchestrator stops routing traffic here instead of serving broken requests.
   */
  @Public()
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const [db, redis, s3] = await Promise.all([
      probe(() => this.pool.query('select 1')),
      probe(() => this.redis.ping()),
      probe(() => this.s3.headBucket()),
    ]);

    const ok = db === 'ok' && redis === 'ok' && s3 === 'ok';
    if (!ok) res.status(503);
    return { status: ok ? 'ok' : 'degraded', db, redis, s3 };
  }
}

async function probe(run: () => Promise<unknown>): Promise<'ok' | 'down'> {
  try {
    await run();
    return 'ok';
  } catch {
    return 'down';
  }
}
