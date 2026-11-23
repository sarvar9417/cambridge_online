import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { durableRateLimit } from '../middleware/durable-rate-limit.js';
import { rateLimit } from '../middleware/rate-limit.js';
import type { AssessmentCodeService } from '../services/assessment-code-service.js';

const id=z.string().uuid();
const pin=z.string().regex(/^\d{6}$/);
const noStore=(res:{set:(name:string,value:string)=>unknown})=>res.set('Cache-Control','private, no-store');
const auth=(value:string|undefined)=>/^Test ([0-9a-f]{64})$/i.exec(value??'')?.[1]??'';

export function createAssessmentCodeTeacherRouter(service:AssessmentCodeService){
  const router=Router();
  router.get('/sessions',async(req,res)=>{
    noStore(res);res.json({data:await service.list(req.actor!)});
  });
  router.post('/sessions',async(req,res)=>{
    noStore(res);
    const body=z.object({testId:id,sourceReviewed:z.literal(true)}).strict().parse(req.body);
    res.status(201).json({data:await service.create(req.actor!,body.testId,body.sourceReviewed)});
  });
  router.get('/sessions/:sessionId/report',async(req,res)=>{
    noStore(res);res.json({data:await service.report(req.actor!,id.parse(req.params.sessionId))});
  });
  router.post('/sessions/:sessionId/close',async(req,res)=>{
    noStore(res);res.json({data:await service.close(req.actor!,id.parse(req.params.sessionId))});
  });
  return router;
}
export function createAssessmentCodeGuestRouter(service:AssessmentCodeService,pool?:Pool){
  const router=Router();
  const limit=(prefix:string,max:number)=>pool
    ?durableRateLimit(pool,{windowMs:60_000,max,key:req=>prefix+req.ip})
    :rateLimit({windowMs:60_000,max,key:req=>prefix+req.ip});
  router.get('/lobby/:code',limit('assessment-code-lobby:',360),async(req,res)=>{
    noStore(res);res.json({data:await service.lobby(pin.parse(req.params.code))});
  });
  router.post('/join',limit('assessment-code-join:',120),async(req,res)=>{
    noStore(res);
    const body=z.object({code:pin,name:z.string().trim().min(2).max(48)}).strict().parse(req.body);
    res.status(201).json({data:await service.join(body.code,body.name)});
  });
  router.get('/players/:playerId',async(req,res)=>{
    noStore(res);
    res.json({data:await service.snapshot(id.parse(req.params.playerId),auth(req.header('authorization')))});
  });
  router.post('/players/:playerId/answers/:questionId',async(req,res)=>{
    noStore(res);
    const choice=z.object({choiceIndex:z.number().int().min(0).max(3)}).strict().parse(req.body);
    res.json({data:await service.answer(id.parse(req.params.playerId),
      auth(req.header('authorization')),id.parse(req.params.questionId),choice.choiceIndex)});
  });
  router.post('/players/:playerId/submit',async(req,res)=>{
    noStore(res);
    res.json({data:await service.submit(id.parse(req.params.playerId),auth(req.header('authorization')))});
  });
  return router;
}

