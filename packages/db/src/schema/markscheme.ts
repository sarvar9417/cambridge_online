import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { reviewStatus, schemeType } from './enums.js';
import { questions, sourcePapers } from './questions.js';
import { users } from './org.js';

/**
 * Cambridge mark schemes are not uniform, so the structure carries the marking
 * rule itself. `packages/shared/marking.ts` turns a scheme plus matched points
 * into a score — the model only decides which points are matched (R4).
 */
export const markSchemes = pgTable('mark_schemes', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionId: uuid('question_id')
    .notNull()
    .unique()
    .references(() => questions.id, { onDelete: 'cascade' }),
  sourcePaperId: uuid('source_paper_id').references(() => sourcePapers.id),
  schemeType: schemeType('scheme_type').notNull(),
  maxMarks: integer('max_marks').notNull(),
  guidanceMd: text('guidance_md'),
  status: reviewStatus('status').notNull().default('needs_review'),
  extractConfidence: numeric('extract_confidence', { precision: 3, scale: 2 }),
  promptVersion: text('prompt_version'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** 'Any three from:' — award up to `nRequired` points from this group. */
export const markSchemeGroups = pgTable('mark_scheme_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  markSchemeId: uuid('mark_scheme_id')
    .notNull()
    .references(() => markSchemes.id, { onDelete: 'cascade' }),
  label: text('label'),
  nRequired: integer('n_required').notNull(),
  marksPerPoint: integer('marks_per_point').notNull().default(1),
  maxMarks: integer('max_marks').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const markSchemePoints = pgTable(
  'mark_scheme_points',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    markSchemeId: uuid('mark_scheme_id')
      .notNull()
      .references(() => markSchemes.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id').references(() => markSchemeGroups.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    /** Cambridge wording, verbatim. Examiners award on specific terminology. */
    text: text('text').notNull(),
    marks: integer('marks').notNull().default(1),
    accept: jsonb('accept').notNull().default([]),
    reject: jsonb('reject').notNull().default([]),
    /** ['MP1'] — this point is only awarded when MP1 is also matched. */
    requires: jsonb('requires').notNull().default([]),
    isBod: boolean('is_bod').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => ({
    schemeCode: unique().on(table.markSchemeId, table.code),
    schemeIdx: index('mark_scheme_points_scheme_idx').on(table.markSchemeId),
  }),
);

export const markSchemeLevels = pgTable(
  'mark_scheme_levels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    markSchemeId: uuid('mark_scheme_id')
      .notNull()
      .references(() => markSchemes.id, { onDelete: 'cascade' }),
    levelNumber: integer('level_number').notNull(),
    minMarks: integer('min_marks').notNull(),
    maxMarks: integer('max_marks').notNull(),
    descriptorMd: text('descriptor_md').notNull(),
    indicativeContentMd: text('indicative_content_md'),
  },
  (table) => ({ schemeLevel: unique().on(table.markSchemeId, table.levelNumber) }),
);
