import { Router } from 'express';
import { z } from 'zod';
import type { AssessmentCenterService } from '../services/assessment-center-service.js';

const id=z.string().uuid();
const question=z.object({
  prompt:z.string().trim().min(3).max(12000),
  options:z.array(z.string().trim().min(1).max(5000)).length(4),
  correctIndex:z.number().int().min(0).max(3).nullable(),
  topic:z.string().trim().min(2).max(160),
  maxMarks:z.number().int().min(1).max(20).default(1),
  sourceNumber:z.number().int().min(1).max(1000).optional(),
}).strict();
const create=z.object({
  title:z.string().trim().min(3).max(160),
  courseCode:z.enum(['school','0478','9618']),
  gradeLabel:z.string().trim().max(48).default(''),
  kind:z.enum(['practice','diagnostic','monitoring','summative']).default('diagnostic'),
  sourceFilename:z.string().max(300).optional(),
  durationMinutes:z.number().int().min(1).max(240),
  opensAt:z.iso.datetime({offset:true}).nullable().optional(),
  closesAt:z.iso.datetime({offset:true}).nullable().optional(),
  shuffleQuestions:z.boolean().default(false),
  questions:z.array(question).min(1).max(100),
}).strict().superRefine((value,ctx)=>{
  if(value.courseCode==='school'&&!/^Grade [5-9]$/.test(value.gradeLabel)){
    ctx.addIssue({code:'custom',path:['gradeLabel'],
      message:'Grade 5–9 is required for school assessments'});
  }
  if(value.opensAt&&value.closesAt&&Date.parse(value.closesAt)<=Date.parse(value.opensAt)){
    ctx.addIssue({code:'custom',path:['closesAt'],
      message:'Closing time must be after opening time'});
  }
});
const publish=z.object({
  classIds:z.array(id).max(20),
  studentIds:z.array(id).max(200).default([]),
  releaseAnswers:z.boolean().default(false),
  sourceReviewed:z.literal(true),
}).strict();
export function createAssessmentCenterRouter(service:AssessmentCenterService){
  const router=Router();
  const noStore=(res:{set:(name:string,value:string)=>unknown})=>res.set('Cache-Control','private, no-store');
  router.get('/',async(req,res)=>{
    noStore(res);res.json({data:await service.list(req.actor!)});
  });
  router.post('/',async(req,res)=>{
    const body=create.parse(req.body);res.status(201).json({data:await service.create(req.actor!,body)});
  });
  router.get('/profile',async(req,res)=>{
    noStore(res);res.json({data:await service.profile(req.actor!,req.actor!.id)});
  });
  router.get('/students/:id/profile',async(req,res)=>{
    noStore(res);res.json({data:await service.profile(req.actor!,id.parse(req.params.id))});
  });
  router.get('/tests/:id',async(req,res)=>{
    noStore(res);res.json({data:await service.detail(req.actor!,id.parse(req.params.id))});
  });
  router.patch('/tests/:id/questions/:questionId',async(req,res)=>{
    const input=question.partial().omit({sourceNumber:true}).strict().parse(req.body);
    res.json({data:await service.updateQuestion(req.actor!,
      id.parse(req.params.id),id.parse(req.params.questionId),input)});
  });
  router.get('/tests/:id/eligible-students',async(req,res)=>{
    noStore(res);res.json({data:await service.eligibleStudents(req.actor!,id.parse(req.params.id))});
  });
  router.get('/tests/:id/eligible-classes',async(req,res)=>{
    noStore(res);res.json({data:await service.eligibleClasses(req.actor!,id.parse(req.params.id))});
  });
  router.post('/tests/:id/publish',async(req,res)=>{
    const body=publish.parse(req.body);
    res.json({data:await service.publish(req.actor!,id.parse(req.params.id),body.classIds,body.releaseAnswers,body.sourceReviewed,body.studentIds)});
  });
  router.post('/tests/:id/release-answers',async(req,res)=>{
    noStore(res);res.json({data:await service.releaseAnswers(req.actor!,id.parse(req.params.id))});
  });
  router.post('/tests/:id/archive',async(req,res)=>{
    noStore(res);res.json({data:await service.archive(req.actor!,id.parse(req.params.id))});
  });
  router.delete('/tests/:id',async(req,res)=>{
    noStore(res);res.json({data:await service.deleteDraft(req.actor!,id.parse(req.params.id))});
  });
  router.get('/tests/:id/report',async(req,res)=>{
    noStore(res);res.json({data:await service.report(req.actor!,id.parse(req.params.id))});
  });
  router.post('/tests/:id/start',async(req,res)=>{
    noStore(res);res.status(201).json({data:await service.start(req.actor!,id.parse(req.params.id))});
  });
  router.get('/attempts/:id',async(req,res)=>{
    noStore(res);res.json({data:await service.attempt(req.actor!,id.parse(req.params.id))});
  });
  router.put('/attempts/:attemptId/answers/:questionId',async(req,res)=>{
    const input=z.object({choiceIndex:z.number().int().min(0).max(3)}).strict().parse(req.body);
    res.json({data:await service.saveAnswer(req.actor!,id.parse(req.params.attemptId),
      id.parse(req.params.questionId),input.choiceIndex)});
  });
  router.post('/attempts/:id/submit',async(req,res)=>{
    noStore(res);res.json({data:await service.submit(req.actor!,id.parse(req.params.id))});
  });
  return router;
}
