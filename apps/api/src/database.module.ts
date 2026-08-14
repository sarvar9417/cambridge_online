import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { createDb, type Database, type DbHandle } from '@campath/db';
import { ApiConfig } from './config.js';

export const DATABASE = Symbol('CAMPATH_DATABASE');
export const DATABASE_POOL = Symbol('CAMPATH_DATABASE_POOL');
export const DATABASE_HANDLE = Symbol('CAMPATH_DATABASE_HANDLE');

/**
 * One pool for the process. `DATABASE` is the Drizzle handle used by
 * repositories; `DATABASE_POOL` is the raw pool, needed by the readiness probe
 * and by migrations.
 */
@Global()
@Module({
  providers: [
    ApiConfig,
    {
      provide: DATABASE_HANDLE,
      inject: [ApiConfig],
      useFactory: (config: ApiConfig): DbHandle => createDb(config.databaseUrl),
    },
    {
      provide: DATABASE,
      inject: [DATABASE_HANDLE],
      useFactory: (handle: DbHandle): Database => handle.db,
    },
    {
      provide: DATABASE_POOL,
      inject: [DATABASE_HANDLE],
      useFactory: (handle: DbHandle) => handle.pool,
    },
  ],
  exports: [ApiConfig, DATABASE, DATABASE_POOL, DATABASE_HANDLE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_HANDLE) private readonly handle: DbHandle) {}

  async onApplicationShutdown() {
    await this.handle.close();
  }
}
