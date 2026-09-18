import { Router, type Response } from 'express';
import { z } from 'zod';
import type { LiveExamService } from '../services/live-exam-service.js';
import { projectLiveExamForBoard } from '../services/live-exam-board-projection.js';

const uuid = z.string().uuid();
const id = (params: Record<string, unknown>, key = 'id') => uuid.parse(params[key]);

function privateNoStore(res: Response) {
  res.set('Cache-Control', 'private, no-store');
}

export function createLiveExamsRouter(service: LiveExamService) {
  const router = Router();

  router.get('/', async (req, res) => {
    // Session lists contain classroom membership state and room codes for
    // authorised users. Never let a browser intermediary or shared device cache
    // one user's view and replay it to the next signed-in user.
    privateNoStore(res);
    res.json({ data: await service.list(req.actor!) });
  });

  // Board stays above '/:id' so its literal path segment is never parsed as a UUID.
  router.get('/:id/board', async (req, res) => {
    // Projector/board mode is a staff-controlled classroom surface. Students
    // receive their own authorised projection through the normal snapshot.
    if (req.actor!.role === 'student') {
      res.status(403).json({ error: { code: 'staff_only', message: 'Bu amal faqat o‘qituvchi yoki administrator uchun mavjud.' } });
      return;
    }
    privateNoStore(res);
    const snapshot = await service.snapshot(req.actor!, id(req.params));
    res.json({ data: projectLiveExamForBoard(snapshot) });
  });

  router.get('/:id', async (req, res) => {
    // A snapshot can contain the learner's draft/submitted answer and, after
    // reveal, Mark Scheme or review data. Treat it as sensitive per-user state.
    privateNoStore(res);
    res.json(await service.snapshot(req.actor!, id(req.params)));
  });

  router.post('/:id/heartbeat', async (req, res) => {
    res.json(await service.heartbeat(req.actor!, id(req.params)));
  });

  router.put('/:id/answer', async (req, res) => {
    const body = z.object({ text: z.string().max(20000) }).strict().parse(req.body);
    res.json(await service.saveAnswer(req.actor!, id(req.params), body.text));
  });

  router.post('/:id/answer/submit', async (req, res) => {
    const body = z.object({ text: z.string().max(20000).optional() }).strict().parse(req.body ?? {});
    res.json(await service.submitAnswer(req.actor!, id(req.params), body.text));
  });

  router.post('/:id/reviews/:reviewId/submit', async (req, res) => {
    const body = z.object({
      matchedPointIds: z.array(uuid).max(100).default([]),
      score: z.number().min(0).max(100).optional(),
      feedback: z.string().trim().max(5000).optional(),
    }).strict().parse(req.body);
    res.json(await service.submitReview(req.actor!, id(req.params), id(req.params, 'reviewId'), body));
  });

  return router;
}