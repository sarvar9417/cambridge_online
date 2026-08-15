import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import type { CorpusService } from '../services/corpus-service.js';

export function createCorpusRouter(service: CorpusService) {
  const router = Router();
  router.get('/', requireRoles('owner'), async (req, res) => {
    res.json(await service.summary(req.actor!));
  });
  return router;
}
