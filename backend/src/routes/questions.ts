import { Router } from 'express';
import { z } from 'zod';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';

const querySchema = z.object({
  q: z.string().trim().max(200).optional(), commandWord: z.string().max(20).optional(),
  marksMin: z.coerce.number().int().min(0).optional(), marksMax: z.coerce.number().int().min(0).optional(),
});

export function createQuestionsRouter(repository: PgQuestionsRepository) {
  const router = Router();
  router.get('/', async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: { code: 'validation_error', message: 'Filtrlarni tekshiring.' } }); return; }
    res.json({ data: await repository.findVisible(req.actor!, parsed.data), nextCursor: null });
  });
  router.get('/:id', async (req, res) => {
    const question = await repository.findOne(req.actor!, z.string().uuid().parse(req.params.id));
    if (!question) { res.status(404).json({ error: { code: 'not_found', message: 'Topilmadi.' } }); return; }
    res.json(question);
  });
  router.post('/:id/approve', async (req, res) => {
    if (req.actor!.role !== 'owner') { res.status(403).json({ error: { code: 'forbidden', message: 'Faqat owner tasdiqlaydi.' } }); return; }
    const question = await repository.approve(req.actor!, z.string().uuid().parse(req.params.id));
    if (!question) { res.status(404).json({ error: { code: 'not_found', message: 'Topilmadi.' } }); return; }
    res.json(question);
  });
  return router;
}
