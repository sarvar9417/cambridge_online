import { Router } from 'express';
import type { ClassesRepository } from '../repositories/classes-repository.js';
import { z } from 'zod';
import type{AssignmentsService}from'../services/assignments-service.js';

export function createClassesRouter(repository: ClassesRepository,assignments?:AssignmentsService) {
  const router = Router();

  router.get('/', async (req, res) => {
    const classes = await repository.findVisible(req.actor!);
    res.json({ data: classes });
  });
  if(assignments)router.get('/:id/assignments',async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id);
    const item=await repository.findOne(req.actor!,id);
    if(!item){res.status(404).json({error:{code:'not_found',message:'Topilmadi.'}});return;}
    res.json({data:await assignments.list(req.actor!,id)});
  });
  router.get('/:id',async(req,res)=>{
    const item=await repository.findOne(req.actor!,z.string().uuid().parse(req.params.id));
    if(!item){res.status(404).json({error:{code:'not_found',message:'Topilmadi.'}});return;}
    res.json({data:item});
  });
  router.post('/:id/enrollments',async(req,res)=>{
    const classId=z.string().uuid().parse(req.params.id);
    const body=z.object({studentId:z.string().uuid()}).strict().parse(req.body);
    res.status(201).json({data:await repository.enroll(req.actor!,classId,body.studentId)});
  });

  return router;
}
