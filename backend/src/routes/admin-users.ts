import { Router } from 'express';
import { z } from 'zod';
import {
  adminCreateUserSchema, adminSetClassesSchema, adminSetPasswordSchema, adminUpdateUserSchema,
  approveUserSchema, rejectUserSchema, setUserRoleSchema, setUserStatusSchema,
} from '../lib/auth-schemas.js';
import { validateBody } from '../lib/validation.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import type { AuthRepository } from '../repositories/auth-repository.js';
import type { AuthService } from '../services/auth-service.js';
import type { AdminUsersService } from '../services/admin-users-service.js';

/**
 * Owner administration of the complete user lifecycle.
 *
 * The approval flow that already existed remains intact; richer management is
 * layered on top of it so existing registration/invite behaviour is preserved.
 */
export function createAdminUsersRouter(
  auth: AuthService,
  repository: AuthRepository,
  management?: AdminUsersService,
) {
  const router = Router();
  router.use(requireAuth(auth));

  const idParam = z.string().uuid();
  const targetId = (params: Record<string, unknown>) => idParam.parse(params.id);
  const owner = requireRoles('owner');

  const service = (res: Parameters<Parameters<typeof router.get>[1]>[1]) => {
    if (!management) {
      res.status(503).json({ error: { code: 'database_unavailable', message: 'User boshqaruvi hozir mavjud emas.' } });
      return null;
    }
    return management;
  };

  const knownError = (res: Parameters<Parameters<typeof router.get>[1]>[1], error: unknown) => {
    const message = error instanceof Error ? error.message : '';
    const map: Record<string, { status:number; text:string }> = {
      user_not_pending: { status: 409, text: 'Bu foydalanuvchi allaqachon ko‘rib chiqilgan.' },
      user_not_found: { status: 404, text: 'Foydalanuvchi topilmadi.' },
      class_not_found: { status: 404, text: 'Sinf topilmadi yoki arxivlangan.' },
      user_not_rejected: { status: 409, text: 'Bu foydalanuvchi rad etilganlar orasida emas.' },
      group_not_in_class: { status: 409, text: 'Bu guruh tanlangan sinfga tegishli emas.' },
      identifier_taken: { status: 409, text: 'Bu email yoki username boshqa hisobda ishlatilgan.' },
      identifier_required: { status: 409, text: 'Email yoki username’dan kamida bittasi qolishi kerak.' },
      student_one_class: { status: 409, text: 'O‘quvchi bir vaqtning o‘zida faqat bitta faol sinfda bo‘lishi mumkin.' },
      group_student_only: { status: 409, text: 'Guruh faqat o‘quvchiga biriktiriladi.' },
    };
    const item = map[message];
    if (!item) return false;
    res.status(item.status).json({ error: { code: message, message: item.text } });
    return true;
  };

  router.get('/', owner, async (req, res) => {
    const query = z.object({
      status: z.enum(['pending', 'active', 'rejected', 'suspended']).optional(),
      role: z.enum(['owner', 'teacher', 'student']).optional(),
      q: z.string().trim().max(120).optional(),
    }).parse(req.query);
    if (management) {
      res.json({ users: await management.list(query) });
      return;
    }
    res.json({ users: await repository.listUsers({ status: query.status }) });
  });

  /** Admin-created accounts bypass the public pending queue by design. */
  router.post('/', owner, validateBody(adminCreateUserSchema), async (req, res) => {
    const admin = service(res); if (!admin) return;
    try {
      res.status(201).json({ user: await admin.create(req.actor!.id, req.body) });
    } catch (error) { if (!knownError(res, error)) throw error; }
  });

  router.get('/groups/:id', owner, async (req, res) => {
    res.json({ groups: await repository.listGroups(targetId(req.params)) });
  });

  router.get('/:id/detail', owner, async (req, res) => {
    const admin = service(res); if (!admin) return;
    try { res.json(await admin.detail(targetId(req.params))); }
    catch (error) { if (!knownError(res, error)) throw error; }
  });

  router.patch('/:id/profile', owner, validateBody(adminUpdateUserSchema), async (req, res) => {
    const admin = service(res); if (!admin) return;
    try { res.json({ user: await admin.updateIdentity(req.actor!.id, targetId(req.params), req.body) }); }
    catch (error) { if (!knownError(res, error)) throw error; }
  });

  /** Directly sets a new password, hashes it, and revokes every old session. */
  router.post('/:id/password', owner, validateBody(adminSetPasswordSchema), async (req, res) => {
    const admin = service(res); if (!admin) return;
    try {
      await admin.setPassword(req.actor!.id, targetId(req.params), req.body.password);
      res.status(204).end();
    } catch (error) { if (!knownError(res, error)) throw error; }
  });

  router.post('/:id/revoke-sessions', owner, async (req, res) => {
    const admin = service(res); if (!admin) return;
    try {
      if (targetId(req.params) === req.actor!.id) {
        res.status(409).json({ error: { code: 'cannot_change_self', message: 'Joriy admin sessiyasini bu yerdan bekor qilib bo‘lmaydi.' } });
        return;
      }
      await admin.revokeSessions(req.actor!.id, targetId(req.params));
      res.status(204).end();
    } catch (error) { if (!knownError(res, error)) throw error; }
  });

  router.put('/:id/classes', owner, validateBody(adminSetClassesSchema), async (req, res) => {
    const admin = service(res); if (!admin) return;
    try { res.json({ memberships: await admin.setClasses(req.actor!.id, targetId(req.params), req.body) }); }
    catch (error) { if (!knownError(res, error)) throw error; }
  });

  router.post('/:id/approve', owner, validateBody(approveUserSchema), async (req, res) => {
    try {
      const id = targetId(req.params);
      const user = await repository.approveUser({
        userId: id, role: req.body.role, classId: req.body.classId,
        groupId: req.body.groupId, approvedBy: req.actor!.id,
      });
      if (management) await management.record(req.actor!.id, 'user.approved', id, null, {
        role: req.body.role, classId: req.body.classId ?? null, groupId: req.body.groupId ?? null,
      });
      res.json({ user });
    } catch (error) { if (!knownError(res, error)) throw error; }
  });

  router.post('/:id/reject', owner, validateBody(rejectUserSchema), async (req, res) => {
    try {
      const id = targetId(req.params);
      const user = await repository.rejectUser({ userId: id, reason: req.body.reason, approvedBy: req.actor!.id });
      if (management) await management.record(req.actor!.id, 'user.rejected', id, null, { reason: req.body.reason });
      res.json({ user });
    } catch (error) { if (!knownError(res, error)) throw error; }
  });

  router.post('/:id/status', owner, validateBody(setUserStatusSchema), async (req, res) => {
    try {
      const id = targetId(req.params);
      if (id === req.actor!.id) {
        res.status(409).json({ error: { code: 'cannot_change_self', message: 'O‘z hisobingiz holatini o‘zgartira olmaysiz.' } });
        return;
      }
      const user = await repository.setUserStatus({ userId: id, status: req.body.status, reason: req.body.reason });
      if (management) await management.record(req.actor!.id, `user.${req.body.status}`, id, null, {
        status: req.body.status, reason: req.body.reason ?? null,
      });
      res.json({ user });
    } catch (error) { if (!knownError(res, error)) throw error; }
  });

  router.post('/:id/role', owner, validateBody(setUserRoleSchema), async (req, res) => {
    try {
      const id = targetId(req.params);
      if (id === req.actor!.id) {
        res.status(409).json({ error: { code: 'cannot_change_self', message: 'O‘z rolingizni o‘zgartira olmaysiz.' } });
        return;
      }
      const user = management
        ? await management.setRole(req.actor!.id, id, req.body.role)
        : await repository.setUserRole({ userId: id, role: req.body.role });
      res.json({ user });
    } catch (error) { if (!knownError(res, error)) throw error; }
  });

  router.delete('/:id', owner, async (req, res) => {
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
          message: 'Bu hisobga bog‘liq akademik yoki tizim ma’lumoti bor. Hard delete o‘rniga anonimlashtirishdan foydalaning.',
          detail: blockers.map((row) => `${row.what}: ${row.count}`).join(', '),
        },
      });
      return;
    }
    try {
      await repository.deleteUser(id);
      if (management) await management.record(req.actor!.id, 'user.deleted', id, null, { deleted: true });
      res.status(204).end();
    } catch (error) { if (!knownError(res, error)) throw error; }
  });

  /**
   * Erases personally identifying account data while preserving referenced
   * academic/audit rows. This is the safe permanent-erasure path for accounts
   * that cannot be physically deleted without destroying school history.
   */
  router.post('/:id/anonymize', owner, async (req, res) => {
    const id = targetId(req.params);
    if (id === req.actor!.id) {
      res.status(409).json({ error: { code: 'cannot_delete_self', message: 'O‘z hisobingizni anonimlashtira olmaysiz.' } });
      return;
    }
    const admin = service(res); if (!admin) return;
    try { res.json(await admin.anonymize(req.actor!.id, id)); }
    catch (error) { if (!knownError(res, error)) throw error; }
  });

  router.post('/:id/reinstate', owner, async (req, res) => {
    try {
      const id = targetId(req.params);
      const user = await repository.reinstateUser(id);
      if (management) await management.record(req.actor!.id, 'user.reinstated', id, null, { status: 'pending' });
      res.json({ user });
    } catch (error) { if (!knownError(res, error)) throw error; }
  });

  router.post('/:id/verify-email', owner, async (req, res) => {
    try {
      const id = targetId(req.params);
      await repository.markEmailVerified(id);
      if (management) await management.record(req.actor!.id, 'user.email_verified', id, null, { verified: true });
      res.status(204).end();
    } catch (error) { if (!knownError(res, error)) throw error; }
  });

  /** Teachers retain the existing manual reset-link workflow for their students. */
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
    const issued = await auth.issueResetToken(target.id, req.actor!.id);
    if (management) await management.record(req.actor!.id, 'user.reset_link_issued', target.id, null, {
      expiresInMinutes: issued.expiresInMinutes,
    });
    res.json(issued);
  });

  return router;
}
