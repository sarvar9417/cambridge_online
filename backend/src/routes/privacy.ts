import { Router } from 'express';
import { z } from 'zod';
import { PrivacyService } from '../services/privacy-service.js';

export function createPrivacyRouter(service: PrivacyService) {
  const router = Router();
  router.get('/export', async (req, res) => {
    const data = await service.exportOwnData(req.actor!);
    res.setHeader('Content-Disposition', `attachment; filename="campath-data-${req.actor!.id}.json"`);
    res.json(data);
  });
  router.post('/students/:id/anonymize', async (req, res) => {
    res.json(await service.anonymizeStudent(req.actor!, z.string().uuid().parse(req.params.id)));
  });
  return router;
}
