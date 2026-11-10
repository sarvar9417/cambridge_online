import { Router } from 'express';
import { z } from 'zod';
import { requireRoles } from '../middleware/auth.js';
import type { ClassPracticeReportsService } from '../services/class-practice-reports-service.js';

/** No learner-level practice history is exposed through this endpoint. */
export function createClassPracticeReportsRouter(service: ClassPracticeReportsService) {
  const router = Router();
  router.get('/:id/practice-report', requireRoles('owner', 'teacher'), async (req, res) => {
    const classId = z.string().uuid().parse(req.params.id);
    res.json({ data: await service.report(req.actor!, classId) });
  });
  return router;
}
