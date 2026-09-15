import { Router } from 'express';
import { z } from 'zod';
import type { LiveExamService } from '../services/live-exam-service.js';

const uuid = z.string().uuid();
const id = (params: Record<string, unknown>, key = 'id') => uuid.parse(params[key]);

const createInput = z.object({
  classId: uuid,
  title: z.string().trim().min(3).max(120),
  topicIds: z.array(uuid).max(30).default([]),
  subtopicIds: z.array(uuid).max(100).default([]),
  questionCount: z.number().int().min(1).max(20),
  questionTimeLimitS: z.number().int().min(30).max(7200).optional(),
  markingMode: z.enum(['teacher', 'peer', 'self']),
  includeDiagrams: z.boolean().default(true),
  excludeSeen: z.boolean().default(true),
}).strict();

export function createLiveExamsRouter(service: LiveExamService) {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json({ data: await service.list(req.actor!) });
  });

  router.post('/', async (req, res) => {
    const body = createInput.parse(req.body);
    res.status(201).json(await service.create(req.actor!, body));
  });

  // Named routes stay above '/:id' so an ordinary word can never be parsed as
  // a UUID and turn a valid join request into a validation error.
  router.post('/join', async (req, res) => {
    const body = z.object({ code: z.string().trim().regex(/^\d{6}$/) }).strict().parse(req.body);
    res.status(201).json(await service.join(req.actor!, body.code));
  });

  router.get('/:id', async (req, res) => {
    res.json(await service.snapshot(req.actor!, id(req.params)));
  });

  router.post('/:id/heartbeat', async (req, res) => {
    res.json(await service.heartbeat(req.actor!, id(req.params)));
  });

  router.post('/:id/start', async (req, res) => {
    res.json(await service.start(req.actor!, id(req.params)));
  });

  router.put('/:id/answer', async (req, res) => {
    const body = z.object({ text: z.string().max(20000) }).strict().parse(req.body);
    res.json(await service.saveAnswer(req.actor!, id(req.params), body.text));
  });

  router.post('/:id/answer/submit', async (req, res) => {
    const body = z.object({ text: z.string().max(20000).optional() }).strict().parse(req.body ?? {});
    res.json(await service.submitAnswer(req.actor!, id(req.params), body.text));
  });

  router.post('/:id/reveal', async (req, res) => {
    res.json(await service.revealMarkScheme(req.actor!, id(req.params)));
  });

  router.post('/:id/reviews/:reviewId/submit', async (req, res) => {
    const body = z.object({
      matchedPointIds: z.array(uuid).max(100).default([]),
      score: z.number().min(0).max(100).optional(),
      feedback: z.string().trim().max(5000).optional(),
    }).strict().parse(req.body);
    res.json(await service.submitReview(req.actor!, id(req.params), id(req.params, 'reviewId'), body));
  });

  router.put('/:id/answers/:answerId/moderate', async (req, res) => {
    const body = z.object({
      score: z.number().min(0).max(100),
      feedback: z.string().trim().max(5000).optional(),
    }).strict().parse(req.body);
    res.json(await service.moderateAnswer(req.actor!, id(req.params), id(req.params, 'answerId'), body));
  });

  router.post('/:id/marking/complete', async (req, res) => {
    const body = z.object({ force: z.boolean().default(false) }).strict().parse(req.body ?? {});
    res.json(await service.completeMarking(req.actor!, id(req.params), body.force));
  });

  router.post('/:id/next', async (req, res) => {
    res.json(await service.nextQuestion(req.actor!, id(req.params)));
  });

  router.post('/:id/cancel', async (req, res) => {
    res.json(await service.cancel(req.actor!, id(req.params)));
  });

  return router;
}
