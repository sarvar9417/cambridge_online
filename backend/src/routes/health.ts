import { Router } from 'express';
import type { Pool } from 'pg';

export const healthRouter = Router();

export function readinessTimeoutMs(env:NodeJS.ProcessEnv=process.env) {
  const raw=Number(env.DB_READY_TIMEOUT_MS ?? env.DB_CONNECT_TIMEOUT_MS ?? 10_000);
  if(!Number.isFinite(raw))return 10_000;
  return Math.max(1_000,Math.min(30_000,Math.trunc(raw)));
}

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

export function createReadyRouter(pool: Pool | null, capabilities: Record<string, boolean> = {}) {
  const router = Router();
  router.get('/', async (_req, res) => {
    if (!pool) { res.status(503).json({ status: 'unavailable', database: 'missing' }); return; }
    let timeout: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        pool.query('select 1'),
        new Promise((_, reject) => { timeout=setTimeout(() => reject(new Error('readiness_timeout')), readinessTimeoutMs()); }),
      ]);
      res.json({ status: 'ok', database: 'ok', capabilities });
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'error' });
    } finally {
      if(timeout)clearTimeout(timeout);
    }
  });
  return router;
}
