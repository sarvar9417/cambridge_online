import { Router } from 'express';
import { z } from 'zod';
import type { LiveExamRoundSummaryService } from '../services/live-exam-round-summary-service.js';

const uuid=z.string().uuid();

export function createLiveExamRoundSummaryRouter(service:LiveExamRoundSummaryService){
  const router=Router();
  router.get('/:id/round-summary',async(req,res)=>{
    const sessionId=uuid.parse(req.params.id);
    const query=z.object({audience:z.enum(['teacher','board']).default('teacher')}).parse(req.query);
    res.set('Cache-Control','private, no-store');
    res.json(await service.summary(req.actor!,sessionId,query.audience));
  });
  return router;
}
