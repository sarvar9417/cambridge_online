import { Router } from 'express';
import { z } from 'zod';
import { IngestionService } from '../services/ingestion-service.js';
const uuid = z.string().uuid();
export function createIngestionRouter(s: IngestionService) {
  const r = Router();
  r.post('/papers', async (q, p) => {
    const b = z
      .object({
        syllabusId: uuid,
        componentId: uuid,
        year: z.number().int().min(2000).max(2100),
        series: z.enum(['MJ', 'ON', 'FM']),
        variant: z.number().int().min(1).max(9),
        kind: z.enum(['QP', 'MS', 'IN', 'ER', 'GT']),
        storagePath: z.string().min(1).max(500),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .parse(q.body);
    p.status(202).json(await s.register(q.actor!, b));
  });
  r.get('/jobs', async (q, p) => p.json({ data: await s.jobs(q.actor!) }));
  r.get('/review', async (q, p) => p.json({ data: await s.review(q.actor!) }));
  r.post('/review/:id/:decision', async (q, p) =>
    p.json(
      await s.decide(
        q.actor!,
        uuid.parse(q.params.id),
        z.enum(['approved', 'rejected']).parse(q.params.decision),
      ),
    ),
  );
  return r;
}
