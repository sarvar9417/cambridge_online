import { Router, type Response } from 'express';
import { z } from 'zod';
import {
  approveUserSchema, rejectUserSchema, setUserRoleSchema, setUserStatusSchema,
} from '../lib/auth-schemas.js';
import { validateBody } from '../lib/validation.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import type { AuthRepository } from '../repositories/auth-repository.js';
import type { AuthService } from '../services/auth-service.js';
import { AdminUsersError, type AdminUsersService } from '../services/admin-users-service.js';

const roleSchema = z.enum(['owner', 'teacher', 'student']);
const statusSchema = z.enum(['pending', 'active', 'rejected', 'suspended']);
const nullableEmail = z.string().trim().toLowerCase().email().max(254).nullable();
const nullableUsername = z.string().trim().min(3).max(40)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Username can contain only letters, digits, dot, underscore and hyphen')
  .nullable();

const createManagedUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: nullableEmail.optional(),
  username: nullableUsername.optional(),
  password: z.string().min(8).max(200),
  role: roleSchema,
  classId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
}).strict()
  .refine((input) => Boolean(input.email || input.username), {
    message: 'Email yoki username dan kamida bittasi kerak.', path: ['email'],
  })
  .refine((input) => !input.groupId || Boolean(input.classId), {
    message: 'Guruh faqat sinf bilan birga tanlanadi.', path: ['groupId'],
  });

const updateManagedUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: nullableEmail.optional(),
  username: nullableUsername.optional(),
}).strict().refine((input) => Object.keys(input).length > 0, 'Kamida bitta maydonni o‘zgartiring.');

const setManagedPasswordSchema = z.object({ password: z.string().min(8).max(200) }).strict();
const classMembershipSchema = z.object({
  classId: z.string().uuid(),
  groupId: z.string().uuid().optional(),
}).strict();
const purgeSchema = z.object({ confirm: z.literal('DELETE') }).strict();

export function createAdminUsersRouter(
  auth: AuthService,
  repository: AuthRepository,
  management?: AdminUsersService,
) {
  const router = Router();
  router.use(requireAuth(auth));

  const idParam = z.string().uuid();
  const targetId = (params: Record<string, unknown>, key = 'id') => idParam.parse(params[key]);

  const notFound = (res: Response, error: unknown) => {
    const message = error instanceof Error ? error.message : '';
    if (message === 'user_not_pending') {
      res.status(409).json({ error: { code: 'user_not_pending', message: 'Bu foydalanuvchi allaqachon ko‘rib chiqilgan.' } });
      return true;
    }
    if (message === 'user_not_found' || message === 'class_not_found') {
      res.status(404).json({ error: { code: message, message: 'Topilmadi.' } });
      return true;
    }
    if (message === 'user_not_rejected') {
      res.status(409).json({ error: { code: message, message: 'Bu foydalanuvchi rad etilganlar orasida emas.' } });
      return true;
    }
    if (message === 'group_not_in_class') {
      res.status(409).json({ error: { code: message, message: 'Bu guruh tanlangan sinfga tegishli emas.' } });
      return true;
    }
    return false;
  };

  const managementError = (res: Response, error: unknown) => {
    if (!(error instanceof AdminUsersError)) return false;
    const messages: Record<string, string> = {
      forbidden: 'Bu amal faqat administrator uchun.',
      owner_school_required: 'Administrator maktabga biriktirilmagan.',
      user_not_found: 'Foydalanuvchi topilmadi.',
      class_not_found: 'Sinf topilmadi.',
      membership_not_found: 'Bu sinf biriktirilmagan.',
      group_not_in_class: 'Bu guruh tanlangan sinfga tegishli emas.',
      email_taken: 'Bu email boshqa hisobda ishlatilgan.',
      username_taken: 'Bu username boshqa hisobda ishlatilgan.',
      duplicate_user: 'Bu ma’lumot bilan foydalanuvchi allaqachon mavjud.',
      identifier_required: 'Email yoki username dan kamida bittasi qolishi kerak.',
      invalid_user_state: 'Bu hisob holatida amalni bajarib bo‘lmaydi.',
      cannot_change_self: 'O‘z hisobingizning rol yoki holatini o‘zgartira olmaysiz.',
      cannot_delete_self: 'O‘z hisobingizni o‘chira olmaysiz.',
      user_has_data: 'Bu hisobga bog‘liq ma’lumot bor. Oddiy o‘chirish o‘rniga to‘xtating yoki “Butunlay o‘chirish”dan foydalaning.',
      user_not_pending: 'Bu foydalanuvchi allaqachon ko‘rib chiqilgan.',
      user_not_rejected: 'Bu foydalanuvchi rad etilganlar orasida emas.',
      user_purge_blocked: 'Hisobni to‘liq o‘chirishga bog‘liq ma’lumot to‘sqinlik qildi.',
    };
    res.status(error.status).json({
      error: {
        code: error.code,
        message: messages[error.code] ?? 'Amal bajarilmadi.',
        ...(error.detail ? { detail: error.detail } : {}),
      },
    });
    return true;
  };

  const managementRequired = (res: Response) => {
    if (management) return false;
    res.status(503).json({
      error: { code: 'management_unavailable', message: 'User management xizmati hozir mavjud emas.' },
    });
    return true;
  };

  router.get('/', requireRoles('owner'), async (req, res) => {
    const query = z.object({
      status: statusSchema.optional(),
      role: roleSchema.optional(),
      q: z.string().trim().max(120).optional(),
      limit: z.coerce.number().int().min(1).max(500).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    }).parse(req.query);
    if (management) {
      try {
        res.json(await management.listUsers(req.actor!, query));
      } catch (error) { if (!managementError(res, error)) throw error; }
      return;
    }
    res.json({ users: await repository.listUsers({ status: query.status }) });
  });

  router.post('/', requireRoles('owner'), validateBody(createManagedUserSchema), async (req, res) => {
    if (managementRequired(res)) return;
    try {
      res.status(201).json({ user: await management!.createUser(req.actor!, req.body) });
    } catch (error) { if (!managementError(res, error)) throw error; }
  });

  router.get('/groups/:id', requireRoles('owner'), async (req, res) => {
    const classId = targetId(req.params);
    if (management) {
      try {
        res.json({ groups: await management.listGroups(req.actor!, classId) });
      } catch (error) { if (!managementError(res, error)) throw error; }
      return;
    }
    res.json({ groups: await repository.listGroups(classId) });
  });

  router.patch('/:id', requireRoles('owner'), validateBody(updateManagedUserSchema), async (req, res) => {
    if (managementRequired(res)) return;
    try {
      res.json({ user: await management!.updateUser(req.actor!, targetId(req.params), req.body) });
    } catch (error) { if (!managementError(res, error)) throw error; }
  });

  router.post('/:id/password', requireRoles('owner'), validateBody(setManagedPasswordSchema), async (req, res) => {
    if (managementRequired(res)) return;
    try {
      await management!.setPassword(req.actor!, targetId(req.params), req.body.password);
      res.status(204).end();
    } catch (error) { if (!managementError(res, error)) throw error; }
  });

  router.post('/:id/revoke-sessions', requireRoles('owner'), async (req, res) => {
    if (managementRequired(res)) return;
    try {
      await management!.revokeSessions(req.actor!, targetId(req.params));
      res.status(204).end();
    } catch (error) { if (!managementError(res, error)) throw error; }
  });

  router.get('/:id/audit', requireRoles('owner'), async (req, res) => {
    if (managementRequired(res)) return;
    try {
      res.json({ events: await management!.listAudit(req.actor!, targetId(req.params)) });
    } catch (error) { if (!managementError(res, error)) throw error; }
  });

  router.post('/:id/classes', requireRoles('owner'), validateBody(classMembershipSchema), async (req, res) => {
    if (managementRequired(res)) return;
    try {
      res.json({ user: await management!.assignClass(
        req.actor!, targetId(req.params), req.body.classId, req.body.groupId,
      ) });
    } catch (error) { if (!managementError(res, error)) throw error; }
  });

  router.delete('/:id/classes/:classId', requireRoles('owner'), async (req, res) => {
    if (managementRequired(res)) return;
    try {
      res.json({ user: await management!.removeClass(
        req.actor!, targetId(req.params), targetId(req.params, 'classId'),
      ) });
    } catch (error) { if (!managementError(res, error)) throw error; }
  });

  router.post('/:id/approve', requireRoles('owner'), validateBody(approveUserSchema), async (req, res) => {
    try {
      if (management) {
        res.json({ user: await management.approveUser(req.actor!, targetId(req.params), req.body) });
        return;
      }
      const user = await repository.approveUser({
        userId: targetId(req.params),
        role: req.body.role,
        classId: req.body.classId,
        groupId: req.body.groupId,
        approvedBy: req.actor!.id,
      });
      res.json({ user });
    } catch (error) {
      if (!notFound(res, error) && !managementError(res, error)) throw error;
    }
  });

  router.post('/:id/reject', requireRoles('owner'), validateBody(rejectUserSchema), async (req, res) => {
    try {
      if (management) {
        res.json({ user: await management.rejectUser(req.actor!, targetId(req.params), req.body.reason) });
        return;
      }
      const user = await repository.rejectUser({
        userId: targetId(req.params), reason: req.body.reason, approvedBy: req.actor!.id,
      });
      res.json({ user });
    } catch (error) {
      if (!notFound(res, error) && !managementError(res, error)) throw error;
    }
  });

  router.post('/:id/status', requireRoles('owner'), validateBody(setUserStatusSchema), async (req, res) => {
    try {
      const id = targetId(req.params);
      if (id === req.actor!.id) {
        res.status(409).json({ error: { code: 'cannot_change_self', message: 'O‘z hisobingiz holatini o‘zgartira olmaysiz.' } });
        return;
      }
      const user = management
        ? await management.setStatus(req.actor!, id, req.body.status, req.body.reason)
        : await repository.setUserStatus({ userId: id, status: req.body.status, reason: req.body.reason });
      res.json({ user });
    } catch (error) {
      if (!notFound(res, error) && !managementError(res, error)) throw error;
    }
  });

  router.post('/:id/role', requireRoles('owner'), validateBody(setUserRoleSchema), async (req, res) => {
    try {
      const id = targetId(req.params);
      if (id === req.actor!.id) {
        res.status(409).json({ error: { code: 'cannot_change_self', message: 'O‘z rolingizni o‘zgartira olmaysiz.' } });
        return;
      }
      const user = management
        ? await management.setRole(req.actor!, id, req.body.role)
        : await repository.setUserRole({ userId: id, role: req.body.role });
      res.json({ user });
    } catch (error) {
      if (!notFound(res, error) && !managementError(res, error)) throw error;
    }
  });

  router.delete('/:id', requireRoles('owner'), async (req, res) => {
    const id = targetId(req.params);
    if (id === req.actor!.id) {
      res.status(409).json({ error: { code: 'cannot_delete_self', message: 'O‘z hisobingizni o‘chira olmaysiz.' } });
      return;
    }
    if (management) {
      try {
        await management.safeDeleteUser(req.actor!, id);
        res.status(204).end();
      } catch (error) { if (!managementError(res, error)) throw error; }
      return;
    }
    const blockers = await repository.countDependents(id);
    if (blockers.length) {
      res.status(409).json({
        error: {
          code: 'user_has_data',
          message: 'Bu hisobga bog‘liq ma’lumot bor. Oddiy o‘chirish o‘rniga to‘xtating yoki “Butunlay o‘chirish”dan foydalaning.',
          detail: blockers.map((row) => `${row.what}: ${row.count}`).join(', '),
        },
      });
      return;
    }
    try {
      await repository.deleteUser(id);
      res.status(204).end();
    } catch (error) {
      if (!notFound(res, error)) throw error;
    }
  });

  router.post('/:id/purge', requireRoles('owner'), validateBody(purgeSchema), async (req, res) => {
    if (managementRequired(res)) return;
    const id = targetId(req.params);
    if (id === req.actor!.id) {
      res.status(409).json({ error: { code: 'cannot_delete_self', message: 'O‘z hisobingizni o‘chira olmaysiz.' } });
      return;
    }
    try {
      res.json(await management!.purgeUser(req.actor!, id));
    } catch (error) { if (!managementError(res, error)) throw error; }
  });

  router.post('/:id/reinstate', requireRoles('owner'), async (req, res) => {
    try {
      if (management) {
        res.json({ user: await management.reinstateUser(req.actor!, targetId(req.params)) });
        return;
      }
      res.json({ user: await repository.reinstateUser(targetId(req.params)) });
    } catch (error) {
      if (!notFound(res, error) && !managementError(res, error)) throw error;
    }
  });

  router.post('/:id/verify-email', requireRoles('owner'), async (req, res) => {
    try {
      const id = targetId(req.params);
      if (management) await management.verifyEmail(req.actor!, id);
      else await repository.markEmailVerified(id);
      res.status(204).end();
    } catch (error) {
      if (!notFound(res, error) && !managementError(res, error)) throw error;
    }
  });

  /**
   * Owners can issue a reset link inside their own school. Teachers can issue one
   * only for an active student in the same school; they cannot reset staff.
   */
  router.post('/:id/reset-code', requireRoles('owner', 'teacher'), async (req, res) => {
    const id = targetId(req.params);
    const target = await repository.findById(id);
    if (!target) {
      const inactive = (await repository.listUsers({})).find((user) => user.id === id);
      if (!inactive || !req.actor!.schoolId || !inactive.schoolId || inactive.schoolId !== req.actor!.schoolId) {
        res.status(404).json({ error: { code: 'user_not_found', message: 'Topilmadi.' } });
      } else {
        res.status(409).json({ error: { code: 'user_not_active', message: 'Faol bo‘lmagan hisob uchun parol tiklanmaydi.' } });
      }
      return;
    }
    if (!req.actor!.schoolId || !target.schoolId || req.actor!.schoolId !== target.schoolId) {
      res.status(404).json({ error: { code: 'user_not_found', message: 'Topilmadi.' } });
      return;
    }
    if (req.actor!.role === 'teacher' && target.role !== 'student') {
      res.status(403).json({
        error: { code: 'teacher_reset_forbidden', message: 'O‘qituvchi faqat o‘quvchi parolini tiklay oladi.' },
      });
      return;
    }
    const result = await auth.issueResetToken(target.id, req.actor!.id);
    if (management && req.actor!.role === 'owner') {
      await management.recordAction(req.actor!, 'admin.user_reset_link_issue', target.id, undefined, {
        expiresInMinutes: result.expiresInMinutes,
      });
    }
    res.json(result);
  });

  return router;
}
