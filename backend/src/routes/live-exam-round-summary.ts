import { Router } from 'express';
import { z } from 'zod';
import type { LiveExamRoundSummaryService } from '../services/live-exam-round-summary-service.js';

const uuid=z.string().uuid();

export function createLiveExamRoundSummaryRouter(service:LiveExamRoundSummaryService){
  const router=Router();
  router.get('/:id/round-summary',async(req,res)=>{
    const sessionId=uuid.parse(req.params.id);
    const projector=z.enum(['true','false']).default('false').parse(req.query.projector) === 'true';
    res.set('Cache-Control','private, no-store');
    res.json(await service.summary(req.actor!,sessionId,projector));
  });
  return router;
}
