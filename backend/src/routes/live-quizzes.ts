import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { durableRateLimit } from '../middleware/durable-rate-limit.js';
import { rateLimit } from '../middleware/rate-limit.js';
import type { LiveQuizService } from '../services/live-quiz-service.js';

const id=z.string().uuid();
const scope=z.object({chapterNo:z.number().int().min(1).max(30),
  kind:z.enum(['chapter','topic','section']),code:z.string().max(30).optional()}).strict();
const createBody=z.object({classId:id.optional(),courseCode:z.enum(['9618','0478']),scopes:z.array(scope).min(1).max(100),
  count:z.number().int().min(4).max(30),seconds:z.union([z.literal(10),z.literal(15),z.literal(20),z.literal(30)]),
  mode:z.enum(['classic','treasure']).optional(),
  durationSeconds:z.number().int().min(60).max(1800).optional(),
  treasureGoal:z.number().int().min(1000).max(1000000).optional(),
  questionOrder:z.enum(['random','ordered','mastery']).optional(),
  questionDifficulty:z.enum(['standard','challenging']).optional(),
  incorrectPenaltySeconds:z.union([z.literal(0),z.literal(2),z.literal(5),z.literal(10)]).optional(),
  allowLateJoin:z.boolean().optional(),showCorrectness:z.boolean().optional(),
  randomNames:z.boolean().optional()}).strict();
const avatar=z.enum(['🦊','🐼','🦁','🐯','🐸','🐨','🐙','🦄']);
const joinBody=z.object({pin:z.string().regex(/^\d{6}$/),
  nickname:z.string().trim().min(2).max(24).optional(),avatar}).strict();
const answerBody=z.object({questionIndex:z.number().int().min(0).max(499),
  choiceIndex:z.number().int().min(0).max(3)}).strict();
const commandBody=z.object({action:z.enum(['start','reveal','next','finish']),
  expectedQuestionIndex:z.number().int().min(-1).max(29).optional()}).strict();
const rewardBody=z.object({turnIndex:z.number().int().min(0).max(499),
  chestIndex:z.number().int().min(0).max(2).optional(),targetId:id.optional()}).strict();
const neverCache=(res:{set:(header:string,value:string)=>unknown})=>res.set('Cache-Control','private, no-store');

export function createLiveQuizGuestRouter(service:LiveQuizService,pool?:Pool){
  const router=Router();
  // A whole class may share one school NAT IP. A PIN lookup followed by a join
  // is two requests per learner, so separate the limits to avoid rejecting the
  // last students in a 60-player classroom while retaining IP throttling.
  const limit=(name:string,max:number)=>pool?durableRateLimit(pool,{windowMs:60_000,max,
    key:req=>name+req.ip}):rateLimit({windowMs:60_000,max,key:req=>name+req.ip});
  const joinLimiter=limit('live-quiz-join:',180);
  const lobbyLimiter=limit('live-quiz-lobby:',360);
  const token=(header:string|undefined)=>{
    const match=/^Quiz ([0-9a-f]{64})$/i.exec(header??'');
    return match?.[1]??'';
  };
  router.post('/join',joinLimiter,async(req,res)=>{
    neverCache(res);
    res.status(201).json({data:await service.join(joinBody.parse(req.body))});
  });
  router.get('/lobby/:pin',lobbyLimiter,async(req,res)=>{
    neverCache(res);
    res.json({data:await service.lobby(z.string().regex(/^\d{6}$/).parse(req.params.pin))});
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
  router.post('/:playerId/reward',async(req,res)=>{
    neverCache(res);
    res.json({data:await service.treasureReward(id.parse(req.params.playerId),
      token(req.header('authorization')),rewardBody.parse(req.body))});
  });
  return router;
}

export function createLiveQuizHostRouter(service:LiveQuizService){
  const router=Router();
  router.get('/available',async(req,res)=>{neverCache(res);
    res.json({data:await service.availableForStudent(req.actor!)});});
  router.get('/',async(req,res)=>{neverCache(res);res.json({data:await service.history(req.actor!)});});
  router.post('/',async(req,res)=>{neverCache(res);
    const input=createBody.parse(req.body);
    res.status(201).json({data:await service.create(req.actor!,{...input,seconds:input.seconds??20})});});
  router.get('/:roomId/report',async(req,res)=>{neverCache(res);
    res.json({data:await service.teacherReport(req.actor!,id.parse(req.params.roomId))});});
  router.get('/:roomId',async(req,res)=>{neverCache(res);
    res.json({data:await service.teacherSnapshot(req.actor!,id.parse(req.params.roomId))});});
  router.delete('/:roomId',async(req,res)=>{neverCache(res);
    res.json({data:await service.deleteFinished(req.actor!,id.parse(req.params.roomId))});});
  router.post('/:roomId/action',async(req,res)=>{neverCache(res);
    const body=commandBody.parse(req.body);
    res.json({data:await service.command(req.actor!,id.parse(req.params.roomId),
      body.action,body.expectedQuestionIndex)});});
  return router;
}
