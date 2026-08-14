import { Router } from 'express';
import { z } from 'zod';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';
import {
  questionInputSchema,
  type QuestionAuthoringService,
} from '../services/question-authoring-service.js';

/** `?subtopicIds=a,b` and `?subtopicIds=a&subtopicIds=b` both mean the same list. */
const asList = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : value.split(',')).filter(Boolean));

const querySchema = z.object({
  q: z.string().trim().max(200).optional(),
  commandWord: z.string().max(20).optional(),
  marksMin: z.coerce.number().int().min(0).optional(),
  marksMax: z.coerce.number().int().min(0).optional(),
  subtopicIds: asList.pipe(z.array(z.string().uuid())).optional(),
  topicNumbers: asList
    .transform((values) => values.map(Number))
    .pipe(z.array(z.number().int().min(1).max(20)))
    .optional(),
  componentNumber: z.coerce.number().int().min(1).max(4).optional(),
  yearFrom: z.coerce.number().int().min(2000).max(2100).optional(),
  yearTo: z.coerce.number().int().min(2000).max(2100).optional(),
  unusedInClassId: z.string().uuid().optional(),
  status: z.enum(['draft', 'needs_review', 'approved', 'rejected', 'archived']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().max(200).optional(),
});

export function createQuestionsRouter(
  repository: PgQuestionsRepository,
  authoring?: QuestionAuthoringService,
) {
  const router = Router();

  router.get('/', async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: { code: 'validation_error', message: 'Filtrlarni tekshiring.' } });
      return;
    }
    res.json(await repository.findVisible(req.actor!, parsed.data));
  });

  // Registered before `/:id` so the literal path is not parsed as a question id.
  if (authoring) {
    router.get('/authoring-context', async (req, res) => {
      res.json({ data: await authoring.authoringContext(req.actor!) });
    });
  }

  router.get('/:id', async (req, res) => {
    const question = await repository.findOne(req.actor!, z.string().uuid().parse(req.params.id));
    if (!question) {
      res.status(404).json({ error: { code: 'not_found', message: 'Topilmadi.' } });
      return;
    }
    res.json(question);
  });

  /**
   * Separate endpoint on purpose: the mark scheme is never part of the question
   * payload, so no serializer change can accidentally leak it to a student.
   */
  router.get('/:id/mark-scheme', async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const question = await repository.findOne(req.actor!, id);
    if (!question) {
      res.status(404).json({ error: { code: 'not_found', message: 'Topilmadi.' } });
      return;
    }
    const markScheme = await repository.findMarkScheme(req.actor!, id);
    if (!markScheme) {
      res.status(404).json({ error: { code: 'not_found', message: 'Topilmadi.' } });
      return;
    }
    res.json(markScheme);
  });

  if (authoring) {
    router.post('/', async (req, res) => {
      const body = questionInputSchema.parse(req.body);
      res.status(201).json(await authoring.create(req.actor!, body));
    });

    router.put('/:id', async (req, res) => {
      const body = questionInputSchema.parse(req.body);
      res.json(await authoring.update(req.actor!, z.string().uuid().parse(req.params.id), body));
    });
  }

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
