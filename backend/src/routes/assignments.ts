import { Router, type Response } from 'express';
import { z } from 'zod';
import { AssignmentsService, DomainError } from '../services/assignments-service.js';
import { GeneratorService } from '../services/generator-service.js';
import type { Pool } from 'pg';

const uuid = z.string().uuid();

export function createAssignmentsRouter(service: AssignmentsService, pool?:Pool) {
  const router = Router();
  router.get('/', async (req, res) => res.json({ data: await service.list(req.actor!) }));
  router.get('/:id/results', async (req, res) => res.json({ data: await service.results(req.actor!, uuid.parse(req.params.id)) }));
  router.post('/', async (req, res) => {
    const body = z.object({
      classId: uuid, title: z.string().trim().min(3).max(120), instructions: z.string().max(5000).optional(),
      dueAt: z.string().datetime().optional(), timeLimitMin: z.number().int().min(1).max(300).optional(),
      questionIds: z.array(uuid).min(1).max(100),
    }).parse(req.body);
    res.status(201).json(await service.create(req.actor!, body));
  });
  if(pool)router.post('/generate',async(req,res)=>{const body=z.object({classId:uuid,title:z.string().min(3).max(120),targetMarks:z.number().int().min(1).max(100),aoRatio:z.object({AO1:z.number().min(0).max(100),AO2:z.number().min(0).max(100),AO3:z.number().min(0).max(100)}).optional(),excludeSeen:z.boolean().optional(),excludeDiagrams:z.boolean().optional(),seed:z.number().int().optional()}).parse(req.body);res.status(201).json(await new GeneratorService(pool).generate(req.actor!,body));});
  router.get('/submissions/:id',async(req,res)=>res.json(await service.submission(req.actor!,uuid.parse(req.params.id))));
  router.post('/submissions/:id/extend',async(req,res)=>{const body=z.object({minutes:z.number().int().min(1).max(240)}).parse(req.body);res.json(await service.extend(req.actor!,uuid.parse(req.params.id),body.minutes));});
  router.post('/:id/attempt', async (req, res) => {
    try { res.status(201).json(await service.start(req.actor!, uuid.parse(req.params.id), req.body?.clientSessionId)); }
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
  router.post('/:id/publish',async(req,res)=>res.json(await service.update(req.actor!,uuid.parse(req.params.id),{published:true})));
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
    assignment_not_open: 'Vazifa hali ochilmagan.', assignment_closed: 'Vazifa muddati tugagan.',
  } as Record<string, string>)[code] ?? code;
}
