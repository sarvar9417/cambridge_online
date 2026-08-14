import { Router } from 'express';
import type { ClassesRepository } from '../repositories/classes-repository.js';
import { z } from 'zod';

export function createClassesRouter(repository: ClassesRepository) {
  const router = Router();

  router.get('/', async (req, res) => {
    const classes = await repository.findVisible(req.actor!);
    res.json({ data: classes });
  });
  router.get('/:id',async(req,res)=>{
    const item=await repository.findOne(req.actor!,z.string().uuid().parse(req.params.id));
    if(!item){res.status(404).json({error:{code:'not_found',message:'Topilmadi.'}});return;}
    res.json({data:item});
  });

  return router;
}
