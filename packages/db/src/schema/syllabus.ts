import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { levelType } from './enums.js';

export const syllabi = pgTable(
  'syllabi',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    subject: text('subject').notNull(),
    versionLabel: text('version_label').notNull(),
    validFrom: integer('valid_from').notNull(),
    validTo: integer('valid_to').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({ codeVersion: unique().on(table.code, table.versionLabel) }),
);

export const components = pgTable(
  'components',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    syllabusId: uuid('syllabus_id')
      .notNull()
      .references(() => syllabi.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    name: text('name').notNull(),
    level: levelType('level').notNull(),
    durationMin: integer('duration_min').notNull(),
    totalMarks: integer('total_marks').notNull(),
    weightPct: numeric('weight_pct', { precision: 5, scale: 2 }),
  },
  (table) => ({ syllabusNumber: unique().on(table.syllabusId, table.number) }),
);

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    syllabusId: uuid('syllabus_id')
      .notNull()
      .references(() => syllabi.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    title: text('title').notNull(),
    level: levelType('level').notNull(),
    componentId: uuid('component_id').references(() => components.id),
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => ({ syllabusNumber: unique().on(table.syllabusId, table.number) }),
);

export const subtopics = pgTable(
  'subtopics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    title: text('title').notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => ({ topicCode: unique().on(table.topicId, table.code) }),
);

export const learningObjectives = pgTable(
  'learning_objectives',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subtopicId: uuid('subtopic_id')
      .notNull()
      .references(() => subtopics.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    text: text('text').notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => ({ subtopicCode: unique().on(table.subtopicId, table.code) }),
);
