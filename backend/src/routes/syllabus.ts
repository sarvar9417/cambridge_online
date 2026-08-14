import { Router } from 'express';
import type { SyllabusService } from '../services/syllabus-service.js';

export function createSyllabusRouter(service: SyllabusService) {
  const router = Router();

  router.get('/topics', async (_req, res) => {
    res.json({ data: await service.tree() });
  });

  router.get('/components', async (_req, res) => {
    res.json({ data: await service.components() });
  });

  return router;
}
