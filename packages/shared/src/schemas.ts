import { z } from 'zod';
import {
  ANSWER_KINDS,
  AO_TYPES,
  COMMAND_WORDS,
  EXAM_SERIES,
  PAPER_KINDS,
  REVIEW_STATUSES,
  SCHEME_TYPES,
} from './enums.js';

/**
 * Request and job-payload contracts shared by api, worker and web. The API
 * validates with these; the web client reuses them so a form cannot build a
 * body the server would reject.
 */

export const uuid = z.string().uuid();

export const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(8).max(200),
  deviceLabel: z.string().trim().max(120).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const redeemInviteSchema = z.object({
  code: z.string().trim().min(6).max(64),
  fullName: z.string().trim().min(2).max(120),
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Only letters, digits, dot, underscore and dash'),
  password: z.string().min(10).max(200),
});
export type RedeemInviteInput = z.infer<typeof redeemInviteSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(200),
  newPassword: z.string().min(10).max(200),
});

/**
 * Update DTO for a user's own profile. R-critical: `role`, `schoolId`,
 * `tokenVersion` and `status` are absent by construction, so a student cannot
 * escalate by posting extra fields.
 */
export const updateMeSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    locale: z.enum(['uz', 'en']).optional(),
  })
  .strict();

export const questionFilterSchema = z.object({
  q: z.string().trim().max(200).optional(),
  componentNumber: z.coerce.number().int().min(1).max(4).optional(),
  topicNumbers: z.array(z.coerce.number().int().min(1).max(20)).max(20).optional(),
  subtopicIds: z.array(uuid).max(44).optional(),
  commandWord: z.enum(COMMAND_WORDS).optional(),
  marksMin: z.coerce.number().int().min(0).max(30).optional(),
  marksMax: z.coerce.number().int().min(0).max(30).optional(),
  ao: z.enum(AO_TYPES).optional(),
  yearFrom: z.coerce.number().int().min(2000).max(2100).optional(),
  yearTo: z.coerce.number().int().min(2000).max(2100).optional(),
  series: z.enum(EXAM_SERIES).optional(),
  status: z.enum(REVIEW_STATUSES).optional(),
  answerKind: z.enum(ANSWER_KINDS).optional(),
  hasDiagram: z.coerce.boolean().optional(),
  unusedInClassId: uuid.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().max(200).optional(),
});
export type QuestionFilter = z.infer<typeof questionFilterSchema>;

export const markSchemePointSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^MP\d{1,2}$/),
  text: z.string().trim().min(1).max(2000),
  marks: z.number().int().min(0).max(20).default(1),
  accept: z.array(z.string().trim().max(500)).max(20).default([]),
  reject: z.array(z.string().trim().max(500)).max(20).default([]),
  requires: z.array(z.string().trim().max(10)).max(10).default([]),
  isBod: z.boolean().default(false),
  groupLabel: z.string().trim().max(120).nullable().optional(),
});

export const markSchemeSchema = z.object({
  schemeType: z.enum(SCHEME_TYPES),
  maxMarks: z.number().int().min(1).max(50),
  guidanceMd: z.string().max(4000).nullable().optional(),
  groups: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        nRequired: z.number().int().min(1).max(20),
        marksPerPoint: z.number().int().min(1).max(10).default(1),
        maxMarks: z.number().int().min(1).max(50),
      }),
    )
    .max(10)
    .default([]),
  points: z.array(markSchemePointSchema).max(40).default([]),
});

export const sourcePaperSchema = z.object({
  syllabusId: uuid,
  componentId: uuid,
  year: z.number().int().min(2000).max(2100),
  series: z.enum(EXAM_SERIES),
  variant: z.number().int().min(1).max(9),
  kind: z.enum(PAPER_KINDS),
  storagePath: z.string().min(1).max(500),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

/** BullMQ job payloads. `idempotencyKey` shape is fixed by R11 in the spec. */
export const ingestJobSchema = z.object({
  sourcePaperId: uuid,
  idempotencyKey: z.string().regex(/^ingest:[a-f0-9]{64}$/),
});

export const gradeJobSchema = z.object({
  answerId: uuid,
  promptVersion: z.string().min(1).max(64),
  idempotencyKey: z.string().regex(/^grade:[0-9a-f-]{36}:[^:]+$/),
});
