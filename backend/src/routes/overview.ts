import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import type { OverviewService } from '../services/overview-service.js';

export function createOverviewRouter(service: OverviewService) {
  const router = Router();
  router.get('/', requireRoles('owner'), async (req, res) => {
    res.json(await service.load(req.actor!));
  });
  return router;
}
