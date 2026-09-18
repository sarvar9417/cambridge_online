import { Router } from 'express';
import { z } from 'zod';
import type { LiveExamParticipationService } from '../services/live-exam-participation-service.js';

const uuid=z.string().uuid();
const id=(params:Record<string,unknown>,key='id')=>uuid.parse(params[key]);
const expectedVersion=z.number().int().positive();

export function createLiveExamParticipationRouter(service:LiveExamParticipationService){
  const router=Router();

  // Own the canonical join route so late-join policy is enforced transactionally
  // against the same locked session row used by teacher transitions.
  router.post('/join',async(req,res)=>{
    const body=z.object({code:z.string().trim().regex(/^\d{6}$/)}).strict().parse(req.body);
    res.status(201).json(await service.join(req.actor!,body.code));
  });

  router.post('/:id/leave',async(req,res)=>{
    res.json(await service.leave(req.actor!,id(req.params)));
  });

  router.post('/:id/participants/:participantId/remove',async(req,res)=>{
    const body=z.object({expectedVersion}).strict().parse(req.body??{});
    res.json(await service.remove(
      req.actor!,id(req.params),id(req.params,'participantId'),body.expectedVersion,
    ));
  });

  return router;
}
