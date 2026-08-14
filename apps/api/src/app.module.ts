import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database.module.js';
import { RedisModule } from './redis.module.js';
import { StorageModule } from './storage.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health/health.controller.js';
import { AdminController } from './admin/admin.controller.js';
import { JwtAuthGuard } from './common/jwt-auth.guard.js';
import { RolesGuard } from './common/roles.guard.js';
import { QuestionBankModule } from './questions/question-bank.module.js';

/**
 * R1: both guards are registered with `APP_GUARD`, so they apply to every route
 * in the application including ones added later. Opting out requires `@Public()`,
 * and `route-coverage.spec.ts` fails the build if an unexpected route carries it.
 *
 * Order matters: `JwtAuthGuard` populates `request.actor`, `RolesGuard` reads it.
 */
@Module({
  imports: [DatabaseModule, RedisModule, StorageModule, AuthModule, QuestionBankModule],
  controllers: [HealthController, AdminController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
