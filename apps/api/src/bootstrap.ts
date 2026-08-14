import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { ApiConfig } from './config.js';

/**
 * Shared by `main.ts` and the e2e tests, so the tests exercise the same
 * middleware stack the server runs — a CORS or cookie setting that only exists
 * in production is a setting nothing tests.
 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ApiConfig);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: config.webOrigin, credentials: true });
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  return app;
}
