import { Router } from 'express';
import { z } from 'zod';
import type { LiveExamReportService } from '../services/live-exam-report-service.js';

const uuid=z.string().uuid();

export function createLiveExamReportRouter(service:LiveExamReportService){
  const router=Router();

  router.get('/:id/detailed-report',async(req,res)=>{
    res.set('Cache-Control','private, no-store');
    res.json(await service.report(req.actor!,uuid.parse(req.params.id)));
  });

  router.get('/:id/detailed-report.csv',async(req,res)=>{
    const sessionId=uuid.parse(req.params.id);
    const data=await service.csv(req.actor!,sessionId);
    res.set('Cache-Control','private, no-store');
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition',`attachment; filename="live-challenge-${sessionId}-report.csv"`);
    res.send(data);
  });

  router.get('/:id/detailed-report.pdf',async(req,res)=>{
    const sessionId=uuid.parse(req.params.id);
    const data=await service.pdf(req.actor!,sessionId);
    res.set('Cache-Control','private, no-store');
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="live-challenge-${sessionId}-report.pdf"`);
    res.send(data);
  });

  return router;
}
