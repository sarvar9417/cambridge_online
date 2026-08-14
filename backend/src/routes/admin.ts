import { Router } from 'express';
import { AdminService } from '../services/admin-service.js';
export function createAdminRouter(s: AdminService) {
  const r = Router();
  r.get('/settings', async (q, p) => p.json({ data: await s.settings(q.actor!) }));
  r.get('/ai-calls', async (q, p) => p.json({ data: await s.aiCalls(q.actor!) }));
  r.get('/audit-log', async (q, p) => p.json({ data: await s.audit(q.actor!) }));
  return r;
}
