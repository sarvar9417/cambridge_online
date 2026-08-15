import { Router } from 'express';
import { requireRoles } from '../middleware/auth.js';
import type { QualityService } from '../services/quality-service.js';

export function createQualityRouter(service: QualityService) {
  const router = Router();
  router.get('/', requireRoles('owner'), async (req, res) => {
    res.json(await service.summary(req.actor!));
  });
  return router;
}
