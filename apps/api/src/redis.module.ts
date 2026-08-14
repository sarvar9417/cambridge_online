import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ApiConfig } from './config.js';

export const REDIS_CLIENT = Symbol('CAMPATH_REDIS');

/** The slice of Redis the API uses; keeps the readiness probe easy to fake. */
export interface RedisLike {
  ping(): Promise<string>;
  quit(): Promise<unknown>;
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ApiConfig],
      useFactory: (config: ApiConfig): RedisLike =>
        new Redis(config.redisUrl, {
          // The API only enqueues; it must fail fast rather than buffer commands
          // forever when Redis is down, so /ready reports the truth.
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          lazyConnect: false,
        }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisLike) {}

  async onApplicationShutdown() {
    await this.redis.quit().catch(() => undefined);
  }
}
