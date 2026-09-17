import { Router } from 'express';
import { z } from 'zod';
import type { LiveExamBuilderCommandService } from '../services/live-exam-builder-command-service.js';

const uuid=z.string().uuid();
const settings=z.object({
  questionOrder:z.enum(['fixed','shuffled']).optional(),
  timingMode:z.enum(['teacher','per_question']).optional(),
  allowLateJoin:z.boolean().optional(),
  autoCloseWhenAllSubmitted:z.boolean().optional(),
  teacherOverrideEnabled:z.boolean().optional(),
  displayNameMode:z.enum(['first_name','full_name','anonymous']).optional(),
}).strict();

export function createLiveExamBuilderCommandsRouter(service:LiveExamBuilderCommandService){
  const router=Router();

  router.post('/drafts',async(req,res)=>{
    const body=z.object({
      classId:uuid,
      title:z.string().trim().min(3).max(120),
      syllabusId:uuid,
      topicId:uuid.nullable().optional(),
      subtopicId:uuid.nullable().optional(),
      markingMode:z.enum(['teacher','peer','self']).default('peer'),
      questionTimeLimitS:z.number().int().min(30).max(7200).nullable().optional(),
      settings:settings.optional(),
    }).strict().parse(req.body);
    res.status(201).json({data:await service.createDraft(req.actor!,body)});
  });

  router.get('/:id/builder',async(req,res)=>{
    res.set('Cache-Control','private, no-store');
    res.json({data:await service.builderState(req.actor!,uuid.parse(req.params.id))});
  });

  router.patch('/:id/draft',async(req,res)=>{
    const body=z.object({
      title:z.string().trim().min(3).max(120).optional(),
      markingMode:z.enum(['teacher','peer','self']).optional(),
      questionTimeLimitS:z.number().int().min(30).max(7200).nullable().optional(),
      settings:settings.optional(),
    }).strict().refine((value)=>Object.keys(value).length>0,{message:'At least one draft field is required.'}).parse(req.body);
    res.json({data:await service.updateDraft(req.actor!,uuid.parse(req.params.id),body)});
  });

  router.put('/:id/questions',async(req,res)=>{
    const body=z.object({questionIds:z.array(uuid).min(1).max(20)}).strict().parse(req.body);
    res.json({data:await service.replaceQuestions(req.actor!,uuid.parse(req.params.id),body.questionIds)});
  });

  router.post('/:id/questions/auto',async(req,res)=>{
    const body=z.object({count:z.number().int().min(1).max(20)}).strict().parse(req.body);
    res.json({data:await service.autoSelect(req.actor!,uuid.parse(req.params.id),body.count)});
  });

  router.post('/:id/publish',async(req,res)=>{
    res.json({data:await service.publish(req.actor!,uuid.parse(req.params.id))});
  });

  router.post('/:id/lobby/open',async(req,res)=>{
    res.json({data:await service.openLobby(req.actor!,uuid.parse(req.params.id))});
  });

  return router;
}
