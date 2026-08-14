import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { levelType, userRole, userStatus } from './enums.js';
import { syllabi } from './syllabus.js';

export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  city: text('city'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'set null' }),
  role: userRole('role').notNull().default('student'),
  fullName: text('full_name').notNull(),
  email: text('email').unique(),
  username: text('username').unique(),
  /** argon2id. Never logged, never returned by any serializer. */
  passwordHash: text('password_hash').notNull(),
  /** Carried in the access token as `tv`; bumping it invalidates every token. */
  tokenVersion: integer('token_version').notNull().default(1),
  locale: text('locale').notNull().default('uz'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').notNull().default(true),
  /** Self-registered students start 'pending' until a teacher assigns a class. */
  status: userStatus('status').notNull().default('active'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Only the sha256 is stored; the raw token lives solely in the client cookie. */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    deviceLabel: text('device_label'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activeIdx: index('refresh_tokens_active_idx')
      .on(table.userId)
      .where(sql`revoked_at is null`),
  }),
);

export const classes = pgTable(
  'classes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    grade: integer('grade'),
    level: levelType('level').notNull(),
    syllabusId: uuid('syllabus_id')
      .notNull()
      .references(() => syllabi.id),
    academicYear: text('academic_year').notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({ nameYear: unique().on(table.schoolId, table.name, table.academicYear) }),
);

export const classTeachers = pgTable(
  'class_teachers',
  {
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => ({ pk: primaryKey({ columns: [table.classId, table.teacherId] }) }),
);

export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp('left_at', { withTimezone: true }),
    /** Study group inside the class. */
    groupId: uuid('group_id'),
  },
  (table) => ({
    classStudent: unique().on(table.classId, table.studentId),
    studentIdx: index('enrollments_student_idx')
      .on(table.studentId)
      .where(sql`left_at is null`),
  }),
);

/** There is no open registration; an account starts with one of these. */
export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  classId: uuid('class_id')
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(),
  role: userRole('role').notNull().default('student'),
  maxUses: integer('max_uses').notNull().default(30),
  usedCount: integer('used_count').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
