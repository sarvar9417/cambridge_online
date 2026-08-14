import { pgEnum } from 'drizzle-orm/pg-core';
import {
  ANSWER_KINDS,
  AO_TYPES,
  COMMAND_WORDS,
  EXAM_SERIES,
  FINDING_SEVERITIES,
  JOB_STATUSES,
  LEVEL_TYPES,
  PAPER_KINDS,
  REVIEW_STATUSES,
  SCHEME_TYPES,
  USER_ROLES,
} from '@campath/shared';

/**
 * Drizzle mirrors of the PostgreSQL enums created in 0001_enums.sql. The value
 * lists come from `@campath/shared` so schema, SQL and runtime validation cannot
 * drift apart.
 */
export const userRole = pgEnum('user_role', USER_ROLES);
export const levelType = pgEnum('level_type', LEVEL_TYPES);
export const examSeries = pgEnum('exam_series', EXAM_SERIES);
export const paperKind = pgEnum('paper_kind', PAPER_KINDS);
export const aoType = pgEnum('ao_type', AO_TYPES);
export const reviewStatus = pgEnum('review_status', REVIEW_STATUSES);
export const schemeType = pgEnum('scheme_type', SCHEME_TYPES);
export const commandWord = pgEnum('command_word', COMMAND_WORDS);
export const answerKind = pgEnum('answer_kind', ANSWER_KINDS);
export const jobStatus = pgEnum('job_status', JOB_STATUSES);
export const findingSeverity = pgEnum('finding_severity', FINDING_SEVERITIES);
