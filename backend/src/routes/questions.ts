import { Router } from 'express';
import { z } from 'zod';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';

const stringList = z.preprocess(
  (value) => value === undefined ? [] : Array.isArray(value) ? value : [value],
  z.array(z.string().trim().min(1).max(100)).max(100),
);
const booleanQuery = z.preprocess((value) => {
  if (value === undefined || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
}, z.boolean().optional());

const querySchema = z.object({
  view: z.enum(['parts', 'families']).default('parts'),
  q: z.string().trim().max(200).optional(),
  component: z.coerce.number().int().min(1).max(4).optional(),
  commandWord: z.string().trim().max(30).optional(),
  commandWords: stringList,
  marksMin: z.coerce.number().int().min(0).optional(),
  marksMax: z.coerce.number().int().min(0).optional(),
  yearFrom: z.coerce.number().int().min(2000).max(2100).optional(),
  yearTo: z.coerce.number().int().min(2000).max(2100).optional(),
  series: stringList,
  aos: stringList,
  topicIds: stringList,
  subtopicIds: stringList,
  hasDiagram: booleanQuery,
  status: z.enum(['draft', 'needs_review', 'approved', 'rejected', 'archived']).optional(),
  dependency: z.enum(['any', 'independent']).default('any'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  unusedInClassId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(80),
}).superRefine((value, ctx) => {
  if (value.marksMin !== undefined && value.marksMax !== undefined && value.marksMin > value.marksMax) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['marksMax'], message: 'marksMax must be >= marksMin' });
  }
  if (value.yearFrom !== undefined && value.yearTo !== undefined && value.yearFrom > value.yearTo) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['yearTo'], message: 'yearTo must be >= yearFrom' });
  }
});

export function createQuestionsRouter(repository: PgQuestionsRepository) {
  const router = Router();

  router.get('/', async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'validation_error', message: 'Filtrlarni tekshiring.', details: parsed.error.flatten() } });
      return;
    }
    const filters = {
      ...parsed.data,
      commandWords: parsed.data.commandWords.length
        ? parsed.data.commandWords
        : parsed.data.commandWord
          ? [parsed.data.commandWord]
          : [],
    };
    res.json(await repository.findVisible(req.actor!, filters));
  });

  router.get('/filter-options', async (req, res) => {
    if (req.actor!.role === 'student') {
      res.status(403).json({ error: { code: 'forbidden', message: 'Bu amal faqat o‘qituvchi yoki owner uchun.' } });
      return;
    }
    res.json(await repository.filterOptions(req.actor!));
  });

  router.get('/:id/portable', async (req, res) => {
    if (req.actor!.role === 'student') {
      res.status(403).json({ error: { code: 'forbidden', message: 'Bu amal faqat o‘qituvchi yoki owner uchun.' } });
      return;
    }
    const portable = await repository.portable(req.actor!, z.string().uuid().parse(req.params.id));
    if (!portable) {
      res.status(404).json({ error: { code: 'not_found', message: 'Topilmadi.' } });
      return;
    }
    res.json(portable);
  });

  router.get('/:id', async (req, res) => {
    const question = await repository.findOne(req.actor!, z.string().uuid().parse(req.params.id));
    if (!question) {
      res.status(404).json({ error: { code: 'not_found', message: 'Topilmadi.' } });
      return;
    }
    res.json(question);
  });

  router.post('/:id/approve', async (req, res) => {
    if (req.actor!.role !== 'owner') {
      res.status(403).json({ error: { code: 'forbidden', message: 'Faqat owner tasdiqlaydi.' } });
      return;
    }
    const question = await repository.approve(req.actor!, z.string().uuid().parse(req.params.id));
    if (!question) {
      res.status(404).json({ error: { code: 'not_found', message: 'Topilmadi.' } });
      return;
    }
    res.json(question);
  });

  return router;
}
