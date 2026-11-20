import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { durableRateLimit } from '../middleware/durable-rate-limit.js';
import { rateLimit } from '../middleware/rate-limit.js';
import type { LiveQuizService } from '../services/live-quiz-service.js';

const id=z.string().uuid();
const scope=z.object({chapterNo:z.number().int().min(1).max(30),
  kind:z.enum(['chapter','topic','section']),code:z.string().max(30).optional()}).strict();
const createBody=z.object({courseCode:z.enum(['9618','0478']),scopes:z.array(scope).min(1).max(100),
  count:z.number().int().min(4).max(30),seconds:z.union([z.literal(10),z.literal(15),z.literal(20),z.literal(30)])}).strict();
const avatar=z.enum(['🦊','🐼','🦁','🐯','🐸','🐨','🐙','🦄']);
const joinBody=z.object({pin:z.string().regex(/^\d{6}$/),
  nickname:z.string().trim().min(2).max(24),avatar}).strict();
const answerBody=z.object({questionIndex:z.number().int().min(0).max(29),
  choiceIndex:z.number().int().min(0).max(3)}).strict();
const commandBody=z.object({action:z.enum(['start','reveal','next','finish'])}).strict();
const neverCache=(res:{set:(header:string,value:string)=>unknown})=>res.set('Cache-Control','private, no-store');

export function createLiveQuizGuestRouter(service:LiveQuizService,pool?:Pool){
  const router=Router();
  const limiter=pool?durableRateLimit(pool,{windowMs:60_000,max:100,
    key:req=>'live-quiz-join:'+req.ip}):rateLimit({windowMs:60_000,max:100,key:req=>'live-quiz-join:'+req.ip});
  const token=(header:string|undefined)=>{
    const match=/^Quiz ([0-9a-f]{64})$/i.exec(header??'');
    return match?.[1]??'';
  };
  router.post('/join',limiter,async(req,res)=>{
    neverCache(res);
    res.status(201).json({data:await service.join(joinBody.parse(req.body))});
  });
  router.get('/:playerId/report',async(req,res)=>{
    neverCache(res);
    res.json({data:await service.guestReport(id.parse(req.params.playerId),token(req.header('authorization')))});
  });
  router.get('/:playerId',async(req,res)=>{
    neverCache(res);
    res.json({data:await service.guestSnapshot(id.parse(req.params.playerId),token(req.header('authorization')))});
  });
  router.post('/:playerId/answer',async(req,res)=>{
    neverCache(res);
    const body=answerBody.parse(req.body);
    res.json({data:await service.answer(id.parse(req.params.playerId),token(req.header('authorization')),
      body.questionIndex,body.choiceIndex)});
  });
  return router;
}

export function createLiveQuizHostRouter(service:LiveQuizService){
  const router=Router();
  router.get('/',async(req,res)=>{neverCache(res);res.json({data:await service.history(req.actor!)});});
  router.post('/',async(req,res)=>{neverCache(res);
    res.status(201).json({data:await service.create(req.actor!,createBody.parse(req.body))});});
  router.get('/:roomId/report',async(req,res)=>{neverCache(res);
    res.json({data:await service.teacherReport(req.actor!,id.parse(req.params.roomId))});});
  router.get('/:roomId',async(req,res)=>{neverCache(res);
    res.json({data:await service.teacherSnapshot(req.actor!,id.parse(req.params.roomId))});});
  router.post('/:roomId/action',async(req,res)=>{neverCache(res);
    res.json({data:await service.command(req.actor!,id.parse(req.params.roomId),
      commandBody.parse(req.body).action)});});
  return router;
}
