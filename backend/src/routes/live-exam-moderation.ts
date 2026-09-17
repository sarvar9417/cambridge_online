import { Router } from 'express';
import { z } from 'zod';
import type { LiveExamModerationService } from '../services/live-exam-moderation-service.js';

const uuid=z.string().uuid();
const id=(params:Record<string,unknown>,key:string)=>uuid.parse(params[key]);

export function createLiveExamModerationRouter(service:LiveExamModerationService){
  const router=Router();

  router.put('/:id/answers/:answerId/moderate',async(req,res)=>{
    const body=z.object({
      score:z.number().min(0).max(100),
      feedback:z.string().trim().max(5000).optional(),
      reason:z.string().trim().min(3).max(500),
      expectedVersion:z.number().int().positive(),
    }).strict().parse(req.body);
    res.json(await service.moderate(
      req.actor!,id(req.params,'id'),id(req.params,'answerId'),body,
    ));
  });

  return router;
}
