import { Router } from 'express';
import { z } from 'zod';
import type { LessonSessionService } from '../services/lesson-session-service.js';

const id=z.string().trim().min(3).max(120);
const uuid=z.string().uuid();

export function createLessonSessionsRouter(service:LessonSessionService) {
  const router=Router();

  router.get('/classes',async(req,res)=>res.json(await service.classes(req.actor!)));
  router.get('/units',async(req,res)=>res.json(await service.units(req.actor!)));

  router.get('/',async(req,res)=>{
    const unitId=id.parse(req.query.unitId);
    res.json(await service.sessions(req.actor!,unitId));
  });

  router.get('/:sessionId',async(req,res)=>{
    const sessionId=id.parse(req.params.sessionId);
    const publicationId=req.query.publicationId===undefined?undefined:uuid.parse(req.query.publicationId);
    res.json(await service.detail(req.actor!,sessionId,publicationId));
  });

  router.post('/:sessionId/publish',async(req,res)=>{
    const sessionId=id.parse(req.params.sessionId);
    const body=z.object({
      classId:uuid,
      dueAt:z.string().datetime({offset:true}).nullable().optional(),
      releasePolicy:z.enum(['after_first_attempt','teacher','after_due','never']).default('after_first_attempt'),
    }).parse(req.body);
    res.status(201).json(await service.publish(req.actor!,sessionId,body));
  });

  router.post('/:sessionId/unpublish',async(req,res)=>{
    const sessionId=id.parse(req.params.sessionId);
    const body=z.object({publicationId:uuid}).parse(req.body);
    res.json(await service.unpublish(req.actor!,sessionId,body.publicationId));
  });

  router.post('/:sessionId/mark-scheme/release',async(req,res)=>{
    const sessionId=id.parse(req.params.sessionId);
    const body=z.object({publicationId:uuid}).parse(req.body);
    res.json(await service.releaseMarkScheme(req.actor!,sessionId,body.publicationId));
  });

  router.put('/:sessionId/steps/:stepKey',async(req,res)=>{
    const sessionId=id.parse(req.params.sessionId);
    const stepKey=z.string().trim().min(2).max(40).parse(req.params.stepKey);
    const body=z.object({publicationId:uuid,responseText:z.string().max(20000).nullable().optional()}).parse(req.body);
    res.json(await service.saveStep(req.actor!,sessionId,stepKey,body));
  });

  router.put('/:sessionId/questions/:questionId/attempt',async(req,res)=>{
    const sessionId=id.parse(req.params.sessionId);
    const questionId=uuid.parse(req.params.questionId);
    const body=z.object({publicationId:uuid,responseText:z.string().trim().min(1).max(30000)}).parse(req.body);
    res.json(await service.attemptQuestion(req.actor!,sessionId,questionId,body));
  });

  router.post('/:sessionId/questions/:questionId/reveal',async(req,res)=>{
    const sessionId=id.parse(req.params.sessionId);
    const questionId=uuid.parse(req.params.questionId);
    const body=z.object({publicationId:uuid}).parse(req.body);
    res.json(await service.revealMarkScheme(req.actor!,sessionId,questionId,body));
  });

  router.put('/:sessionId/questions/:questionId/self-score',async(req,res)=>{
    const sessionId=id.parse(req.params.sessionId);
    const questionId=uuid.parse(req.params.questionId);
    const body=z.object({publicationId:uuid,score:z.number().int().min(0).max(100)}).parse(req.body);
    res.json(await service.selfScore(req.actor!,sessionId,questionId,body));
  });

  router.post('/:sessionId/complete',async(req,res)=>{
    const sessionId=id.parse(req.params.sessionId);
    const body=z.object({publicationId:uuid}).parse(req.body);
    res.json(await service.complete(req.actor!,sessionId,body));
  });

  return router;
}
