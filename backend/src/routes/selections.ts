import { Router } from 'express';
import { z } from 'zod';
import type { PgSelectionsRepository } from '../repositories/selections-repository.js';

const roleSchema = z.enum(['graded', 'context_only']);
const createSchema = z.object({ name: z.string().trim().min(1).max(120) });
const itemSchema = z.object({ questionId: z.string().uuid(), role: roleSchema.default('graded') });
const updateItemSchema = z.object({ role: roleSchema });
const uuid = z.string().uuid();

export function createSelectionsRouter(repository: PgSelectionsRepository) {
  const router = Router();

  router.use((req, res, next) => {
    if (req.actor!.role === 'student') {
      res.status(403).json({ error: { code: 'forbidden', message: 'Bu amal faqat o‘qituvchi yoki owner uchun.' } });
      return;
    }
    if (!req.actor!.schoolId) {
      res.status(403).json({ error: { code: 'school_required', message: 'Foydalanuvchi maktabga biriktirilmagan.' } });
      return;
    }
    next();
  });

  router.get('/', async (req, res) => {
    res.json(await repository.list(req.actor!));
  });

  router.post('/', async (req, res) => {
    const body = createSchema.parse(req.body);
    const selection = await repository.create(req.actor!, body.name);
    if (!selection) { res.status(403).json({ error: { code: 'forbidden', message: 'Ruxsat yo‘q.' } }); return; }
    res.status(201).json(selection);
  });

  router.get('/:id', async (req, res) => {
    const review = await repository.review(req.actor!, uuid.parse(req.params.id));
    if (!review) { res.status(404).json({ error: { code: 'not_found', message: 'Tanlov topilmadi.' } }); return; }
    res.json(review);
  });

  router.post('/:id/items', async (req, res) => {
    const selectionId = uuid.parse(req.params.id);
    const body = itemSchema.parse(req.body);
    const result = await repository.addItem(req.actor!, selectionId, body.questionId, body.role);
    if (!result) { res.status(404).json({ error: { code: 'not_found', message: 'Tanlov yoki savol topilmadi.' } }); return; }
    res.status(201).json(result);
  });

  router.patch('/:id/items/:itemId', async (req, res) => {
    const body = updateItemSchema.parse(req.body);
    const result = await repository.updateItem(
      req.actor!,
      uuid.parse(req.params.id),
      uuid.parse(req.params.itemId),
      body.role,
    );
    if (!result) { res.status(404).json({ error: { code: 'not_found', message: 'Tanlov elementi topilmadi.' } }); return; }
    res.json(result);
  });

  router.delete('/:id/items/:itemId', async (req, res) => {
    const removed = await repository.removeItem(
      req.actor!,
      uuid.parse(req.params.id),
      uuid.parse(req.params.itemId),
    );
    if (!removed) { res.status(404).json({ error: { code: 'not_found', message: 'Tanlov elementi topilmadi.' } }); return; }
    res.json({ ok: true });
  });

  return router;
}
