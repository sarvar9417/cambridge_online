/**
 * The domain enums, mirrored exactly by the PostgreSQL enum types in
 * `packages/db/migrations/0001_enums.sql`. Adding a value means a migration —
 * never widen one of these alone.
 */

export const USER_ROLES = ['owner', 'teacher', 'student'] as const;
export const LEVEL_TYPES = ['AS', 'A2'] as const;
export const EXAM_SERIES = ['MJ', 'ON', 'FM'] as const;
export const PAPER_KINDS = ['QP', 'MS', 'IN', 'ER', 'GT'] as const;
export const AO_TYPES = ['AO1', 'AO2', 'AO3'] as const;
export const REVIEW_STATUSES = [
  'draft',
  'needs_review',
  'approved',
  'rejected',
  'archived',
] as const;
export const SCHEME_TYPES = [
  'all_required',
  'any_n_from_m',
  'levels_of_response',
  'exact_match',
  'code_output',
  'manual_only',
] as const;
export const COMMAND_WORDS = [
  'State',
  'Give',
  'Name',
  'Identify',
  'Define',
  'Describe',
  'Explain',
  'Compare',
  'Calculate',
  'Complete',
  'Draw',
  'Write',
  'Evaluate',
  'Justify',
  'Suggest',
  'Show',
  'Other',
] as const;
export const ANSWER_KINDS = ['text', 'pseudocode', 'code', 'image', 'table', 'diagram'] as const;
export const JOB_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'cancelled'] as const;
export const FINDING_SEVERITIES = ['info', 'warning', 'error'] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type LevelType = (typeof LEVEL_TYPES)[number];
export type ExamSeries = (typeof EXAM_SERIES)[number];
export type PaperKind = (typeof PAPER_KINDS)[number];
export type AoType = (typeof AO_TYPES)[number];
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type SchemeType = (typeof SCHEME_TYPES)[number];
export type CommandWord = (typeof COMMAND_WORDS)[number];
export type AnswerKind = (typeof ANSWER_KINDS)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];
