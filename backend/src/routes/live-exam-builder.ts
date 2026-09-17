import { Router } from 'express';
import { z } from 'zod';
import type { LiveExamBuilderService } from '../services/live-exam-builder-service.js';

const uuid = z.string().uuid();

export function createLiveExamBuilderRouter(service: LiveExamBuilderService) {
  const router = Router();

  router.get('/builder-options', async (req, res) => {
    const query = z.object({ syllabusId: uuid.optional() }).parse(req.query);
    res.set('Cache-Control', 'private, no-store');
    res.json({ data: await service.builderOptions(req.actor!, query.syllabusId) });
  });

  router.get('/eligible-questions', async (req, res) => {
    const query = z.object({
      syllabusId: uuid,
      topicId: uuid.optional(),
      subtopicId: uuid.optional(),
      limit: z.coerce.number().int().min(1).max(500).default(100),
    }).parse(req.query);
    res.set('Cache-Control', 'private, no-store');
    res.json({ data: await service.eligibleQuestions(req.actor!, query) });
  });

  return router;
}