import type { Pool } from 'pg';
import { AssignmentsService } from '../services/assignments-service.js';

export function startAttemptScheduler(pool: Pool) {
  const service = new AssignmentsService(pool);
  let running = false;
  let failures = 0;
  let nextAllowedAt = 0;
  const tick = async () => {
    if (running || Date.now() < nextAllowedAt) return;
    running = true;
    try { await service.closeExpired(); failures = 0; }
    catch (error) {
      failures += 1;
      nextAllowedAt = Date.now() + Math.min(10 * 60_000, 30_000 * 2 ** Math.min(failures - 1, 5));
      if (failures === 1 || failures % 5 === 0) console.error(`Attempt scheduler unavailable; retry ${new Date(nextAllowedAt).toISOString()}`, error);
    }
    finally { running = false; }
  };
  void tick();
  const timer = setInterval(tick, 30_000);
  timer.unref();
  return () => clearInterval(timer);
}
