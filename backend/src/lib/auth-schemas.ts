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

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  locale: z.enum(['uz', 'en', 'ru']).optional(),
}).strict().refine((input) => Object.keys(input).length > 0, 'At least one profile field is required');

export type RedeemInviteInput = z.infer<typeof redeemInviteSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
