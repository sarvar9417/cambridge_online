import { Router } from 'express';
import { z } from 'zod';
import type { LessonCheckpointService } from '../services/lesson-checkpoint-service.js';

const loCodes = z.preprocess(
  (value) => value === undefined ? [] : Array.isArray(value) ? value : [value],
  z.array(z.string().trim().min(1).max(40)).min(1).max(20),
);

const querySchema = z.object({
  loCodes,
  yearFrom: z.coerce.number().int().min(2021).max(2025).default(2021),
  yearTo: z.coerce.number().int().min(2021).max(2025).default(2025),
}).superRefine((value, ctx) => {
  if (value.yearFrom > value.yearTo) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['yearTo'], message: 'yearTo must be >= yearFrom' });
  }
});

export function createLessonCheckpointsRouter(service: LessonCheckpointService) {
  const router = Router();

  router.get('/', async (req, res) => {
    if (req.actor!.role === 'student') {
      res.status(403).json({ error: { code: 'forbidden', message: 'Bu amal faqat o‘qituvchi yoki owner uchun.' } });
      return;
    }

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'validation_error', message: 'Checkpoint filtrlarini tekshiring.', details: parsed.error.flatten() } });
      return;
    }

    res.json(await service.list(parsed.data.loCodes, parsed.data.yearFrom, parsed.data.yearTo));
  });

  return router;
}
