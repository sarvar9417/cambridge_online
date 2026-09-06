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

/**
 * Deciding who gets in and managing the full account lifecycle.
 *
 * Approval existed before the full management surface. The optional management
 * service deliberately sits on top of that path rather than replacing it: test
 * doubles and the registration flow keep using AuthRepository, while production
 * gets profile editing, direct password changes, class placement, session
 * revocation, audit history and irreversible purge through the PostgreSQL-backed
 * service.
 */
export function createAdminUsersRouter(
  auth: AuthService,
  repository: AuthRepository,
  management?: AdminUsersService,
) {
  const router = Router();
  router.use(requireAuth(auth));

  // Express 5 types a route param as string | string[]. Parsing it as a UUID
  // both narrows the type and rejects a malformed id before it reaches a query.
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
      user_not_found: 'Foydalanuvchi topilmadi.',
      class_not_found: 'Sinf topilmadi.',
      group_not_in_class: 'Bu guruh tanlangan sinfga tegishli emas.',
      email_taken: 'Bu email boshqa hisobda ishlatilgan.',
      username_taken: 'Bu username boshqa hisobda ishlatilgan.',
      duplicate_user: 'Bu ma’lumot bilan foydalanuvchi allaqachon mavjud.',
      identifier_required: 'Email yoki username dan kamida bittasi qolishi kerak.',
      invalid_user_state: 'Bu hisob holatida amalni bajarib bo‘lmaydi.',
      cannot_delete_self: 'O‘z hisobingizni o‘chira olmaysiz.',
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
      res.json(await management.listUsers(req.actor!, query));
      return;
    }
    res.json({ users: await repository.listUsers({ status: query.status }) });
  });

  /** Owner-created accounts are immediately approved and email-trusted. */
  router.post('/', requireRoles('owner'), validateBody(createManagedUserSchema), async (req, res) => {
    if (managementRequired(res)) return;
    try {
      res.status(201).json({ user: await management!.createUser(req.actor!, req.body) });
    } catch (error) { if (!managementError(res, error)) throw error; }
  });

  /**
   * The groups of one class, so approval and later placement can offer a valid
   * group rather than relying on the administrator to remember its parent class.
   */
  router.get('/groups/:id', requireRoles('owner'), async (req, res) => {
    res.json({ groups: await repository.listGroups(targetId(req.params)) });
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
      const user = await repository.approveUser({
        userId: targetId(req.params),
        role: req.body.role,
        classId: req.body.classId,
        groupId: req.body.groupId,
        approvedBy: req.actor!.id,
      });
      if (management) {
        await management.recordAction(req.actor!, 'admin.user_approve', user.id, undefined, {
          role: req.body.role,
          classId: req.body.classId ?? null,
          groupId: req.body.groupId ?? null,
        });
      }
      res.json({ user });
    } catch (error) {
      if (!notFound(res, error) && !managementError(res, error)) throw error;
    }
  });

  router.post('/:id/reject', requireRoles('owner'), validateBody(rejectUserSchema), async (req, res) => {
    try {
      const user = await repository.rejectUser({
        userId: targetId(req.params), reason: req.body.reason, approvedBy: req.actor!.id,
      });
      if (management) {
        await management.recordAction(req.actor!, 'admin.user_reject', user.id, undefined, { reason: req.body.reason });
      }
      res.json({ user });
    } catch (error) {
      if (!notFound(res, error) && !managementError(res, error)) throw error;
    }
  });

  router.post('/:id/status', requireRoles('owner'), validateBody(setUserStatusSchema), async (req, res) => {
    try {
      const id = targetId(req.params);
      // Locking yourself out is not a decision anyone means to make, and there
      // may be no second owner to undo it.
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
      // Same reason: demoting yourself from owner leaves nobody who can promote
      // anyone back.
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

  /**
   * Safe delete keeps the old behaviour: if academic or administrative data is
   * attached, it refuses and names the blockers. The separate /purge endpoint is
   * the explicit, irreversible option for an owner who really means to remove
   * the account and transfer required historical ownership.
   */
  router.delete('/:id', requireRoles('owner'), async (req, res) => {
    const id = targetId(req.params);
    if (id === req.actor!.id) {
      res.status(409).json({ error: { code: 'cannot_delete_self', message: 'O‘z hisobingizni o‘chira olmaysiz.' } });
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
      const before = management ? await management.getUser(req.actor!, id) : undefined;
      await repository.deleteUser(id);
      if (management) await management.recordAction(req.actor!, 'admin.user_delete', id, before, { deleted: true });
      res.status(204).end();
    } catch (error) {
      if (!notFound(res, error) && !managementError(res, error)) throw error;
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

  /** Puts a rejected application back in the queue, which is otherwise final. */
  router.post('/:id/reinstate', requireRoles('owner'), async (req, res) => {
    try {
      const user = await repository.reinstateUser(targetId(req.params));
      if (management) await management.recordAction(req.actor!, 'admin.user_reinstate', user.id, undefined, { status: 'pending' });
      res.json({ user });
    } catch (error) {
      if (!notFound(res, error) && !managementError(res, error)) throw error;
    }
  });

  /**
   * Marks the address proven without an email round trip. For a user whose mail
   * never arrived or an account created before a provider was configured.
   */
  router.post('/:id/verify-email', requireRoles('owner'), async (req, res) => {
    try {
      const id = targetId(req.params);
      await repository.markEmailVerified(id);
      if (management) await management.recordAction(req.actor!, 'admin.user_email_verify', id, undefined, { verified: true });
      res.status(204).end();
    } catch (error) {
      if (!notFound(res, error) && !managementError(res, error)) throw error;
    }
  });

  /**
   * The manual half of password recovery: a teacher can issue the same one-shot,
   * one-hour reset link for an active student. Owners may do this for any active
   * account; direct password assignment remains owner-only above.
   */
  router.post('/:id/reset-code', requireRoles('owner', 'teacher'), async (req, res) => {
    const users = await repository.listUsers({});
    const target = users.find((user) => user.id === targetId(req.params));
    if (!target) {
      res.status(404).json({ error: { code: 'user_not_found', message: 'Topilmadi.' } });
      return;
    }
    if (target.status !== 'active') {
      res.status(409).json({ error: { code: 'user_not_active', message: 'Faol bo‘lmagan hisob uchun parol tiklanmaydi.' } });
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
