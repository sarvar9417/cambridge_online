import { Router } from 'express';
import { z } from 'zod';
import { ContentService } from '../services/content-service.js';

const chapterNo = z.union([z.literal(1), z.literal(7), z.literal(13)]);

export function createContentRouter(service: ContentService) {
  const router = Router();

  router.get('/', async (req, res) => res.json({ data: await service.list(req.actor!) }));
  router.get('/games', async (req, res) => res.json({ data: await service.games(req.actor!) }));

  router.get('/lessons/progress', async (req, res) => {
    res.json({ data: await service.lessonProgress(req.actor!) });
  });
  router.put('/lessons/progress', async (req, res) => {
    const body = z.object({
      chapterNo,
      slideId: z.string().trim().min(1).max(160),
      completed: z.boolean().default(false),
    }).strict().parse(req.body);
    res.json(await service.touchLesson(req.actor!, body));
  });

  router.get('/flashcards/due', async (req, res) => res.json({ data: await service.due(req.actor!) }));
  router.post('/flashcards/:id/review', async (req, res) => {
    const body = z.object({ grade:z.number().int().min(0).max(5) }).parse(req.body);
    res.json(await service.review(req.actor!, z.string().uuid().parse(req.params.id), body.grade));
  });

  return router;
}
