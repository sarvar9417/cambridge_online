import { Router } from 'express';
import { z } from 'zod';
import {
  approveUserSchema, rejectUserSchema, setUserRoleSchema, setUserStatusSchema,
} from '../lib/auth-schemas.js';
import { validateBody } from '../lib/validation.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import type { AuthRepository } from '../repositories/auth-repository.js';
import type { AuthService } from '../services/auth-service.js';

/**
 * Deciding who gets in and what they may do.
 *
 * Owner only. A teacher can teach a class without being allowed to mint another
 * owner, and role assignment is exactly the operation that would let them.
 * The one exception is issuing a password reset code, which teachers need for
 * their own students and which grants nothing beyond what the student already
 * has.
 */
export function createAdminUsersRouter(auth: AuthService, repository: AuthRepository) {
  const router = Router();
  router.use(requireAuth(auth));

  // Express 5 types a route param as string | string[]. Parsing it as a UUID
  // both narrows the type and rejects a malformed id before it reaches a query.
  const idParam = z.string().uuid();
  const targetId = (params: Record<string, unknown>) => idParam.parse(params.id);

  const notFound = (res: Parameters<Parameters<typeof router.get>[1]>[1], error: unknown) => {
    const message = error instanceof Error ? error.message : '';
    if (message === 'user_not_pending') {
      res.status(409).json({ error: { code: 'user_not_pending', message: 'Bu foydalanuvchi allaqachon ko‘rib chiqilgan.' } });
      return true;
    }
    if (message === 'user_not_found' || message === 'class_not_found') {
      res.status(404).json({ error: { code: message, message: 'Topilmadi.' } });
      return true;
    }
    if (message === 'group_not_in_class') {
      res.status(409).json({ error: { code: message, message: 'Bu guruh tanlangan sinfga tegishli emas.' } });
      return true;
    }
    return false;
  };

  router.get('/', requireRoles('owner'), async (req, res) => {
    const query = z.object({
      status: z.enum(['pending', 'active', 'rejected', 'suspended']).optional(),
    }).parse(req.query);
    res.json({ users: await repository.listUsers({ status: query.status }) });
  });

  /**
   * The groups of one class, so the approval form can offer a placement rather
   * than leaving the approver to remember which groups exist.
   */
  router.get('/groups/:id', requireRoles('owner'), async (req, res) => {
    res.json({ groups: await repository.listGroups(targetId(req.params)) });
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
      res.json({ user });
    } catch (error) { if (!notFound(res, error)) throw error; }
  });

  router.post('/:id/reject', requireRoles('owner'), validateBody(rejectUserSchema), async (req, res) => {
    try {
      res.json({ user: await repository.rejectUser({
        userId: targetId(req.params), reason: req.body.reason, approvedBy: req.actor!.id,
      }) });
    } catch (error) { if (!notFound(res, error)) throw error; }
  });

  router.post('/:id/status', requireRoles('owner'), validateBody(setUserStatusSchema), async (req, res) => {
    try {
      // Locking yourself out is not a decision anyone means to make, and there
      // may be no second owner to undo it.
      if (targetId(req.params) === req.actor!.id) {
        res.status(409).json({ error: { code: 'cannot_change_self', message: 'O‘z hisobingiz holatini o‘zgartira olmaysiz.' } });
        return;
      }
      res.json({ user: await repository.setUserStatus({
        userId: targetId(req.params), status: req.body.status, reason: req.body.reason,
      }) });
    } catch (error) { if (!notFound(res, error)) throw error; }
  });

  router.post('/:id/role', requireRoles('owner'), validateBody(setUserRoleSchema), async (req, res) => {
    try {
      // Same reason: demoting yourself from owner leaves nobody who can promote
      // anyone back.
      if (targetId(req.params) === req.actor!.id) {
        res.status(409).json({ error: { code: 'cannot_change_self', message: 'O‘z rolingizni o‘zgartira olmaysiz.' } });
        return;
      }
      res.json({ user: await repository.setUserRole({ userId: targetId(req.params), role: req.body.role }) });
    } catch (error) { if (!notFound(res, error)) throw error; }
  });

  /**
   * The manual half of password recovery: a teacher reads this code out to a
   * student whose email never arrived. It is the same single-use, one-hour token
   * the email carries, so handing it over is no weaker than sending it -- and it
   * is returned once, in this response, never stored in readable form.
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
    res.json(await auth.issueResetToken(target.id, req.actor!.id));
  });

  return router;
}
