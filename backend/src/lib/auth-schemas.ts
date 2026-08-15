import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(8).max(128),
  deviceLabel: z.string().trim().max(120).optional(),
});

export const redeemInviteSchema = z.object({
  code: z.string().trim().min(6).max(64),
  fullName: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(8).max(200),
});

/**
 * Open registration. Everyone gives an email because that is what makes
 * self-service password recovery possible; the account is created `pending` and
 * cannot sign in until an owner approves it, so this form asks for nothing that
 * the approver would have to trust.
 */
export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/,
    'Username can contain only letters, digits, dot, underscore and hyphen'),
  password: z.string().min(8).max(200),
  // Free text the applicant writes for the approver: their class, group, or why
  // they want access. It is never trusted as a role claim.
  note: z.string().trim().max(300).optional(),
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
}).strict();

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(20).max(200),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: z.string().min(8).max(200),
}).strict();

/**
 * Approving decides the role and, for anyone who belongs in one, the class and
 * the group within it. A group without a class is meaningless, so it is refused
 * here rather than reaching a query that would silently ignore it.
 */
export const approveUserSchema = z.object({
  role: z.enum(['owner', 'teacher', 'student']),
  classId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
}).strict().refine(
  (input) => !input.groupId || Boolean(input.classId),
  { message: 'A group can only be chosen together with its class', path: ['groupId'] },
);

export const rejectUserSchema = z.object({
  reason: z.string().trim().min(1).max(300),
}).strict();

export const setUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
  reason: z.string().trim().max(300).optional(),
}).strict();

export const setUserRoleSchema = z.object({
  role: z.enum(['owner', 'teacher', 'student']),
}).strict();

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  locale: z.enum(['uz', 'en', 'ru']).optional(),
}).strict().refine((input) => Object.keys(input).length > 0, 'At least one profile field is required');

export type RedeemInviteInput = z.infer<typeof redeemInviteSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ApproveUserInput = z.infer<typeof approveUserSchema>;
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
