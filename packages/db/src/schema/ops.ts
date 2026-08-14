import {
  boolean,
  index,
  inet,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { findingSeverity, jobStatus } from './enums.js';
import { users } from './org.js';

/**
 * Audit trail, not a queue. BullMQ on Redis runs the work; a row is written on
 * enqueue and updated as the job progresses, so a failure stays explainable
 * after Redis has dropped the job.
 */
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: text('kind').notNull(),
    queueJobId: text('queue_job_id'),
    refTable: text('ref_table'),
    refId: uuid('ref_id'),
    status: jobStatus('status').notNull().default('queued'),
    priority: integer('priority').notNull().default(100),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    payload: jsonb('payload').notNull().default({}),
    /** 'ingest:{sha256}' or 'grade:{answerId}:{promptVersion}' — retries never duplicate. */
    idempotencyKey: text('idempotency_key').notNull().unique(),
    result: jsonb('result'),
    error: text('error'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index('jobs_status_idx').on(table.status, table.scheduledAt),
    refIdx: index('jobs_ref_idx').on(table.refTable, table.refId),
  }),
);

/** R6: anything failing deterministic validation lands here, never silently accepted. */
export const validationFindings = pgTable('validation_findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleCode: text('rule_code').notNull(),
  severity: findingSeverity('severity').notNull(),
  refTable: text('ref_table').notNull(),
  refId: uuid('ref_id').notNull(),
  message: text('message').notNull(),
  details: jsonb('details'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolution: text('resolution'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** The checker reports and never corrects: a fixing checker hides its own errors. */
export const crossChecks = pgTable('cross_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  refTable: text('ref_table').notNull(),
  refId: uuid('ref_id').notNull(),
  checkerPromptVersion: text('checker_prompt_version').notNull(),
  agrees: boolean('agrees').notNull(),
  disagreement: jsonb('disagreement'),
  confidence: numeric('confidence', { precision: 3, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** R7: every model call logged, so the monthly budget is a fact not an estimate. */
export const aiCalls = pgTable(
  'ai_calls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    purpose: text('purpose').notNull(),
    model: text('model').notNull(),
    promptVersion: text('prompt_version'),
    refTable: text('ref_table'),
    refId: uuid('ref_id'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    cacheReadTokens: integer('cache_read_tokens'),
    cacheWriteTokens: integer('cache_write_tokens'),
    costUsd: numeric('cost_usd', { precision: 10, scale: 6 }),
    latencyMs: integer('latency_ms'),
    ok: boolean('ok').notNull().default(true),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdIdx: index('ai_calls_created_idx').on(table.createdAt),
    purposeIdx: index('ai_calls_purpose_idx').on(table.purpose, table.createdAt),
  }),
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').references(() => users.id),
    action: text('action').notNull(),
    refTable: text('ref_table'),
    refId: uuid('ref_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    ip: inet('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    refIdx: index('audit_log_ref_idx').on(table.refTable, table.refId, table.createdAt),
  }),
);

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
