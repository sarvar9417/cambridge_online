import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module.js';

/**
 * Standalone Nest context: no HTTP server, no routes. The worker exists only to
 * drain BullMQ queues.
 *
 * R9: `ANTHROPIC_API_KEY` is present in this process and nowhere else, so every
 * model call necessarily goes through the queue.
 */
const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
app.enableShutdownHooks();

console.log('Worker started; consuming queues');
