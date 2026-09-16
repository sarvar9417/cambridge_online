import { Router } from 'express';
import { z } from 'zod';
import type { LiveExamRealtimeService } from '../services/live-exam-realtime-service.js';

const uuid = z.string().uuid();
const queryInput = z.object({
  afterVersion: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export function createLiveExamRealtimeRouter(service: LiveExamRealtimeService) {
  const router = Router();

  router.get('/:id/events', async (req, res) => {
    const sessionId = uuid.parse(req.params.id);
    const query = queryInput.parse(req.query);
    res.set('Cache-Control','private, no-store');
    res.json(await service.events(req.actor!, sessionId, query.afterVersion, query.limit));
  });

  return router;
}
