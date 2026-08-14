import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { schools, users } from './org.js';
import { questions } from './questions.js';

export const selectionItemRole = pgEnum('selection_item_role', ['graded', 'context_only']);

export const selections = pgTable(
  'selections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({ ownerIdx: index('selections_owner_idx').on(table.ownerId, table.updatedAt) }),
);

export const selectionItems = pgTable(
  'selection_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    selectionId: uuid('selection_id')
      .notNull()
      .references(() => selections.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    role: selectionItemRole('role').notNull().default('graded'),
    sortOrder: integer('sort_order').notNull(),
    sourceRef: text('source_ref').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    selectionQuestion: unique().on(table.selectionId, table.questionId),
    selectionIdx: index('selection_items_selection_idx').on(
      table.selectionId,
      table.sortOrder,
      table.createdAt,
    ),
  }),
);
