import { Router } from 'express';
import type { Pool } from 'pg';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

export function createReadyRouter(pool: Pool | null, capabilities: Record<string, boolean> = {}) {
  const router = Router();
  router.get('/', async (_req, res) => {
    if (!pool) {
      res.status(503).json({ status: 'unavailable', database: 'missing' });
      return;
    }
    try {
      await Promise.race([
        pool.query('select 1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('readiness_timeout')), 3000)),
      ]);
      res.json({ status: 'ok', database: 'ok', capabilities });
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'error' });
    }
  });
  return router;
}
