import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../lib/validation.js';
import { requireRoles } from '../middleware/auth.js';
import type { SystemService } from '../services/system-service.js';

const updateSettingSchema = z.object({
  key: z.string().min(1).max(80),
  // Deliberately loose: the service owns the per-key shape, so a rule lives in
  // one place instead of being half here and half there.
  value: z.union([z.string(), z.number(), z.boolean()]),
}).strict();

export function createSystemRouter(service: SystemService) {
  const router = Router();
  router.use(requireRoles('owner'));

  router.get('/', async (req, res) => res.json(await service.summary(req.actor!)));

  router.put('/settings', validateBody(updateSettingSchema), async (req, res) => {
    res.json({ setting: await service.updateSetting(req.actor!, req.body.key, req.body.value) });
  });

  return router;
}
