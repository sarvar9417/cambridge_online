import { Router, type Response } from 'express';
import { z } from 'zod';
import type { LiveExamAnalyticsService } from '../services/live-exam-analytics-service.js';

const uuid=z.string().uuid();
function privateNoStore(res:Response){res.set('Cache-Control','private, no-store, max-age=0');res.set('Pragma','no-cache');res.set('Vary','Authorization, Cookie');}

export function createLiveExamAnalyticsRouter(service:LiveExamAnalyticsService){
  const router=Router();
  router.get('/:id/analytics',async(req,res)=>{
    privateNoStore(res);
    res.json({data:await service.summary(req.actor!,uuid.parse(req.params.id))});
  });
  return router;
}
