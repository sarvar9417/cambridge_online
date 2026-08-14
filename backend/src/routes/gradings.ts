import{Router}from'express';
import{z}from'zod';
import{GradingService}from'../services/grading-service.js';

const uuid=z.string().uuid();

export function createGradingsRouter(service:GradingService){
  const router=Router();
  router.get('/:id',async(req,res)=>res.json({data:await service.detail(req.actor!,uuid.parse(req.params.id))}));
  router.patch('/:id/points/:pointId',async(req,res)=>{
    const body=z.object({teacherMatched:z.boolean()}).strict().parse(req.body);
    res.json(await service.togglePoint(req.actor!,uuid.parse(req.params.pointId),body.teacherMatched,uuid.parse(req.params.id)));
  });
  router.post('/:id/confirm',async(req,res)=>res.json(await service.confirm(req.actor!,uuid.parse(req.params.id))));
  router.post('/:id/release',async(req,res)=>res.json(await service.release(req.actor!,uuid.parse(req.params.id))));
  router.post('/:id/appeal',async(req,res)=>{
    const body=z.object({reason:z.string().trim().min(10).max(1000)}).strict().parse(req.body);
    res.status(201).json(await service.appeal(req.actor!,uuid.parse(req.params.id),body.reason));
  });
  return router;
}
