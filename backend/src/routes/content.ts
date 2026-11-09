import { Router } from 'express';
import { z } from 'zod';
import { ContentService } from '../services/content-service.js';

const courseCode = z.enum(['9618', '0478']);
const chapterNo = z.number().int().min(1).max(20);

export function createContentRouter(service: ContentService) {
  const router = Router();

  router.get('/', async (req, res) => res.json({ data: await service.list(req.actor!) }));
  router.get('/games', async (req, res) => res.json({ data: await service.games(req.actor!) }));

  // Unlike the legacy /games endpoint, these routes are chapter/section scoped.
  // They read the latest glossary and Hodder section links on every request.
  router.get('/interactive-games/catalog', async (req, res) => {
    const query = z.object({ courseCode: courseCode.default('9618') }).strict().parse(req.query);
    res.json({ data: await service.interactiveGameCatalog(req.actor!, query.courseCode) });
  });
  router.get('/interactive-games/pack', async (req, res) => {
    const query = z.object({
      courseCode: courseCode.default('9618'),
      chapterNo: z.coerce.number().int().min(1).max(20),
      sectionCode: z.string().regex(/^\d+(?:\.\d+)*$/).max(24).optional(),
    }).strict().parse(req.query);
    res.json({ data: await service.interactiveGamePack(req.actor!, query) });
  });

  router.get('/lessons/progress', async (req, res) => {
    res.json({ data: await service.lessonProgress(req.actor!) });
  });
  router.put('/lessons/progress', async (req, res) => {
    const body = z.object({
      courseCode: courseCode.default('9618'),
      chapterNo,
      slideId: z.string().trim().min(1).max(160),
      completed: z.boolean().default(false),
    }).strict().parse(req.body);
    res.json(await service.touchLesson(req.actor!, {
      courseCode: body.courseCode,
      chapterNo: body.chapterNo,
      slideId: body.slideId,
      completed: body.completed,
    }));
  });

  router.get('/flashcards/due', async (req, res) => res.json({ data: await service.due(req.actor!) }));
  router.post('/flashcards/:id/review', async (req, res) => {
    const body = z.object({ grade:z.number().int().min(0).max(5) }).parse(req.body);
    res.json(await service.review(req.actor!, z.string().uuid().parse(req.params.id), body.grade));
  });

  return router;
}
