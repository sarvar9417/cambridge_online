import { Router, type Response } from 'express';
import { z } from 'zod';
import { AssignmentsService, DomainError } from '../services/assignments-service.js';
import { GeneratorService } from '../services/generator-service.js';
import type { Pool } from 'pg';
import { runIdempotent } from '../lib/idempotent-request.js';
import { overlayAssignmentAttempt } from '../lib/assignment-attempt-overlay.js';

const uuid = z.string().uuid();

export function createAssignmentsRouter(service: AssignmentsService, pool?:Pool) {
  const router = Router();
  router.get('/', async (req, res) => res.json({ data: await service.list(req.actor!) }));
  router.post('/practice',async(req,res)=>{const body=z.object({subtopicId:uuid,commandWord:z.enum(['State','Give','Name','Identify','Define','Describe','Explain','Compare','Calculate','Complete','Draw','Write','Evaluate','Justify','Suggest','Show','Other']).optional()}).parse(req.body);const operation=async()=>({status:201,body:await service.createPractice(req.actor!,body)});if(pool)return runIdempotent(req,res,pool,operation);const result=await operation();return res.status(result.status).json(result.body)});
  router.get('/:id/results', async (req, res) => res.json({ data: await service.results(req.actor!, uuid.parse(req.params.id)) }));
  router.post('/', async (req, res) => {
    const body = z.object({
      classId: uuid, title: z.string().trim().min(3).max(120), instructions: z.string().max(5000).optional(),
      dueAt: z.string().datetime().optional(), timeLimitMin: z.number().int().min(1).max(300).optional(),
      questionIds: z.array(uuid).min(1).max(100),
    }).parse(req.body);
    const operation = async () => ({ status:201,body:await service.create(req.actor!,body) });
    if(pool)return runIdempotent(req,res,pool,operation);
    const result=await operation();return res.status(result.status).json(result.body);
  });
  if(pool)router.post('/generate',async(req,res)=>{const body=z.object({classId:uuid,title:z.string().min(3).max(120),targetMarks:z.number().int().min(1).max(100),aoRatio:z.object({AO1:z.number().min(0).max(100),AO2:z.number().min(0).max(100),AO3:z.number().min(0).max(100)}).optional(),excludeSeen:z.boolean().optional(),excludeDiagrams:z.boolean().optional(),seed:z.number().int().optional()}).parse(req.body);res.status(201).json(await new GeneratorService(pool).generate(req.actor!,body));});
  router.get('/submissions/:id',async(req,res)=>res.json(await service.submission(req.actor!,uuid.parse(req.params.id))));
  router.post('/submissions/:id/extend',async(req,res)=>{const body=z.object({minutes:z.number().int().min(1).max(240)}).parse(req.body);res.json(await service.extend(req.actor!,uuid.parse(req.params.id),body.minutes));});
  router.post('/:id/attempt', async (req, res) => {
    try {
      const assignmentId=uuid.parse(req.params.id);
      const body=z.object({clientSessionId:uuid.optional(),studentId:uuid.optional()}).strict().parse(req.body??{});
      const operation=async()=>{
        const started=await service.start(req.actor!,assignmentId,body.clientSessionId,body.studentId);
        return{status:201,body:pool?await overlayAssignmentAttempt(pool,assignmentId,started):started};
      };
      if(pool)return await runIdempotent(req,res,pool,operation);
      const result=await operation();return res.status(result.status).json(result.body);
    }
    catch (error) { send(res, error); }
  });
  router.put('/submissions/:id/answers/:questionId', async (req, res) => {
    try {
      const body = z.object({ text: z.string().max(20000), activeSessionId: uuid.optional() }).parse(req.body);
      res.json(await service.saveAnswer(req.actor!, uuid.parse(req.params.id), uuid.parse(req.params.questionId), body.text, body.activeSessionId));
    } catch (error) { send(res, error); }
  });
  router.post('/submissions/:id/submit', async (req, res) => {
    try { res.json(await service.submit(req.actor!, uuid.parse(req.params.id))); }
    catch (error) { send(res, error); }
  });
  router.post('/submissions/:id/heartbeat', async (req, res) => {
    const body = z.object({ activeSessionId: uuid }).parse(req.body);
    res.json(await service.heartbeat(req.actor!, uuid.parse(req.params.id), body.activeSessionId));
  });
  router.patch('/:id',async(req,res)=>{const body=z.object({title:z.string().min(3).max(120).optional(),dueAt:z.string().datetime().nullable().optional(),timeLimitMin:z.number().int().min(1).max(300).nullable().optional(),published:z.boolean().optional()}).parse(req.body);res.json(await service.update(req.actor!,uuid.parse(req.params.id),body));});
  router.post('/:id/publish',async(req,res)=>{const assignmentId=uuid.parse(req.params.id);const operation=async()=>({status:200,body:await service.update(req.actor!,assignmentId,{published:true})});if(pool)return runIdempotent(req,res,pool,operation);const result=await operation();return res.status(result.status).json(result.body)});
  router.post('/:id/session/open',async(req,res)=>res.json(await service.session(req.actor!,uuid.parse(req.params.id),true)));
  router.post('/:id/session/close',async(req,res)=>res.json(await service.session(req.actor!,uuid.parse(req.params.id),false)));
  return router;
}

function send(res: Response, error: unknown) {
  if (error instanceof DomainError) { res.status(error.status).json({ error: { code: error.code, message: message(error.code) } }); return; }
  if (error instanceof z.ZodError) { res.status(400).json({ error: { code: 'validation_error', message: 'Ma’lumotlarni tekshiring.' } }); return; }
  throw error;
}

function message(code: string) {
  return ({
    not_found: 'Topilmadi.', already_submitted: 'Vazifa allaqachon topshirilgan.',
    submission_closed: 'Topshirilgan javobni o‘zgartirib bo‘lmaydi.', time_expired: 'Imtihon vaqti tugadi.',
    session_replaced: 'Bu urinish boshqa qurilmada ochilgan.', students_only: 'Faqat o‘quvchi attempt boshlaydi.',
    student_scope_forbidden: 'Boshqa o‘quvchi nomidan attempt boshlab bo‘lmaydi.',
    assignment_not_open: 'Vazifa hali ochilmagan.', assignment_closed: 'Vazifa muddati tugagan.',
  } as Record<string, string>)[code] ?? code;
}
