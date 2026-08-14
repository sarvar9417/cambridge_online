import{Router}from'express';
import{z}from'zod';
import{AssignmentsService}from'../services/assignments-service.js';

const uuid=z.string().uuid();

export function createSubmissionsRouter(service:AssignmentsService){
  const router=Router();
  router.get('/:id',async(req,res)=>res.json({data:await service.submission(req.actor!,uuid.parse(req.params.id))}));
  router.put('/:id/answers/:questionId',async(req,res)=>{
    const body=z.object({text:z.string().max(20_000),activeSessionId:uuid.optional()}).strict().parse(req.body);
    res.json(await service.saveAnswer(req.actor!,uuid.parse(req.params.id),uuid.parse(req.params.questionId),body.text,body.activeSessionId));
  });
  router.post('/:id/submit',async(req,res)=>res.json(await service.submit(req.actor!,uuid.parse(req.params.id))));
  router.post('/:id/heartbeat',async(req,res)=>{
    const body=z.object({activeSessionId:uuid}).strict().parse(req.body);
    res.json(await service.heartbeat(req.actor!,uuid.parse(req.params.id),body.activeSessionId));
  });
  router.post('/:id/extend',async(req,res)=>{
    const body=z.object({minutes:z.number().int().min(1).max(240)}).strict().parse(req.body);
    res.json(await service.extend(req.actor!,uuid.parse(req.params.id),body.minutes));
  });
  return router;
}
