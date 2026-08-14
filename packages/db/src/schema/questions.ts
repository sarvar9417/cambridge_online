import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  answerKind,
  aoType,
  commandWord,
  contentFormat,
  examSeries,
  paperKind,
  reviewStatus,
} from './enums.js';
import { components, learningObjectives, subtopics, syllabi } from './syllabus.js';
import { users } from './org.js';

export const sourcePapers = pgTable(
  'source_papers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    syllabusId: uuid('syllabus_id')
      .notNull()
      .references(() => syllabi.id),
    componentId: uuid('component_id')
      .notNull()
      .references(() => components.id),
    year: integer('year').notNull(),
    series: examSeries('series').notNull(),
    variant: integer('variant').notNull(),
    kind: paperKind('kind').notNull(),
    storagePath: text('storage_path').notNull(),
    /** Idempotency key for ingestion: the same PDF twice produces one paper. */
    sha256: text('sha256').notNull().unique(),
    pageCount: integer('page_count'),
    uploadedBy: uuid('uploaded_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    identity: unique().on(
      table.syllabusId,
      table.componentId,
      table.year,
      table.series,
      table.variant,
      table.kind,
    ),
  }),
);

/**
 * Self-referencing tree: Q3 -> Q3(b) -> Q3(b)(ii).
 *
 * A parent holds the shared scenario in `context_md` and has `marks` NULL; only
 * leaves carry marks, a command word and subtopics. `path` ('3.b.ii') is what
 * the context chain is walked with when a leaf is extracted on its own.
 */
export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourcePaperId: uuid('source_paper_id')
      .notNull()
      .references(() => sourcePapers.id, { onDelete: 'cascade' }),
    componentId: uuid('component_id')
      .notNull()
      .references(() => components.id),
    parentId: uuid('parent_id').references((): AnyPgColumn => questions.id, {
      onDelete: 'cascade',
    }),
    label: text('label').notNull(),
    path: text('path').notNull(),
    displayRef: text('display_ref').notNull(),
    depth: integer('depth').notNull().default(0),
    sortOrder: integer('sort_order').notNull(),

    stemMd: text('stem_md'),
    contextMd: text('context_md'),
    /** Authored under the KaTeX contract; carries the text for most of the bank. */
    stemLatex: text('stem_latex'),
    contextLatex: text('context_latex'),
    bodyFormat: contentFormat('body_format').notNull().default('markdown'),
    commandWord: commandWord('command_word'),
    marks: integer('marks'),
    ao: aoType('ao'),
    answerKind: answerKind('answer_kind').notNull().default('text'),
    answerLines: integer('answer_lines'),

    status: reviewStatus('status').notNull().default('needs_review'),
    extractConfidence: numeric('extract_confidence', { precision: 3, scale: 2 }),
    promptVersion: text('prompt_version'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    paperPath: unique().on(table.sourcePaperId, table.path),
    sourcePaperIdx: index('questions_source_paper_idx').on(table.sourcePaperId),
    parentIdx: index('questions_parent_idx').on(table.parentId),
    statusIdx: index('questions_status_idx').on(table.status),
    commandWordIdx: index('questions_command_word_idx').on(table.commandWord),
    leafIdx: index('questions_leaf_idx')
      .on(table.componentId)
      .where(sql`marks is not null`),
  }),
);

export const questionAssets = pgTable(
  'question_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    kind: answerKind('kind').notNull(),
    storagePath: text('storage_path'),
    contentMd: text('content_md'),
    altText: text('alt_text').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    sourcePage: integer('source_page'),
    /** Editable TikZ master; `svgMarkup` is what renders. */
    latexSource: text('latex_source'),
    svgMarkup: text('svg_markup'),
    /** V11 checks the size; V22 keys on the hash to spot a duplicated figure. */
    sizeBytes: integer('size_bytes'),
    contentHash: text('content_hash'),
  },
  (table) => ({ questionIdx: index('question_assets_question_idx').on(table.questionId) }),
);

/**
 * A leaf may test several subtopics. `weight` keeps mastery honest: giving five
 * subtopics full credit for one 3-mark answer would inflate mastery five-fold.
 */
export const questionSubtopics = pgTable(
  'question_subtopics',
  {
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    subtopicId: uuid('subtopic_id')
      .notNull()
      .references(() => subtopics.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').notNull().default(false),
    weight: numeric('weight', { precision: 3, scale: 2 }).notNull().default('1.0'),
    confidence: numeric('confidence', { precision: 3, scale: 2 }),
    setBy: text('set_by').notNull().default('ai'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.questionId, table.subtopicId] }),
    subtopicIdx: index('question_subtopics_subtopic_idx').on(table.subtopicId),
  }),
);

export const questionLearningObjectives = pgTable(
  'question_learning_objectives',
  {
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    loId: uuid('lo_id')
      .notNull()
      .references(() => learningObjectives.id, { onDelete: 'cascade' }),
    confidence: numeric('confidence', { precision: 3, scale: 2 }),
  },
  (table) => ({ pk: primaryKey({ columns: [table.questionId, table.loId] }) }),
);

/**
 * "Using your answer to part (b)". Extracting the dependent without its
 * dependency yields a question nobody can answer, so selection warns on `hard`.
 */
export const questionDependencies = pgTable(
  'question_dependencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    dependsOnId: uuid('depends_on_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    strength: text('strength').notNull().default('hard'),
    evidence: text('evidence'),
    detectedBy: text('detected_by').notNull().default('ai'),
    confidence: numeric('confidence', { precision: 3, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pair: unique().on(table.questionId, table.dependsOnId),
    dependsOnIdx: index('question_dependencies_depends_on_idx').on(table.dependsOnId),
  }),
);
