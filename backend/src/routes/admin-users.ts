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
   * Deleting an account.
   *
   * Refused whenever anything still points at it, and the refusal names what.
   * The alternative is worse in both directions: submissions, enrolments and
   * mastery cascade, so deleting a student who has answered anything would take
   * their whole graded history with them silently; assignments and classes do
   * not cascade, so deleting the teacher who created them fails with a
   * constraint error nobody can read.
   *
   * What is left is the case this is actually for -- a mistaken or spam
   * registration that has done nothing yet. Anything else is suspended, or
   * anonymised through the privacy endpoint.
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
          message: 'Bu hisobga bog‘liq ma’lumot bor, shuning uchun o‘chirilmadi. Uni to‘xtatishingiz mumkin.',
          detail: blockers.map((row) => `${row.what}: ${row.count}`).join(', '),
        },
      });
      return;
    }
    try {
      await repository.deleteUser(id);
      res.status(204).end();
    } catch (error) { if (!notFound(res, error)) throw error; }
  });

  /** Puts a rejected application back in the queue, which is otherwise final. */
  router.post('/:id/reinstate', requireRoles('owner'), async (req, res) => {
    try {
      res.json({ user: await repository.reinstateUser(targetId(req.params)) });
    } catch (error) { if (!notFound(res, error)) throw error; }
  });

  /**
   * Marks the address proven without an email round trip.
   *
   * For the student whose message never arrived, or the account created before
   * a provider was configured. It is a judgement the owner is making about a
   * person they know, so it is recorded as theirs.
   */
  router.post('/:id/verify-email', requireRoles('owner'), async (req, res) => {
    try {
      await repository.markEmailVerified(targetId(req.params));
      res.status(204).end();
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
