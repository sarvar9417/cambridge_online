import { Router } from 'express';
import { z } from 'zod';
import { GradingService } from '../services/grading-service.js';

export function createGradingRouter(service: GradingService) {
  const router = Router();

  router.get('/queue', async (req, res) => {
    const filters=z.object({classId:z.string().uuid().optional(),mode:z.enum(['by_question','by_student']).optional(),sort:z.literal('confidence').optional()}).strict().parse(req.query);
    res.json({ data: await service.queue(req.actor!,filters) });
  });
  router.get('/appeals', async (req, res) => res.json({ data: await service.appealQueue(req.actor!) }));
  router.post('/appeals/:id/resolve', async (req, res) => {
    const body = z.object({ decision: z.enum(['accepted','rejected']), resolution: z.string().trim().min(3).max(1000) }).parse(req.body);
    res.json(await service.resolveAppeal(req.actor!, z.string().uuid().parse(req.params.id), body.decision, body.resolution));
  });
  router.patch('/points/:id', async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const body = z.object({ teacherMatched: z.boolean() }).parse(req.body);
    res.json(await service.togglePoint(req.actor!, id, body.teacherMatched));
  });
  router.patch('/:id/score', async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const body = z.object({ score: z.number().int().nonnegative() }).parse(req.body);
    res.json(await service.setScore(req.actor!, id, body.score));
  });
  router.post('/:id/release', async (req, res) => {
    res.json(await service.release(req.actor!, z.string().uuid().parse(req.params.id)));
  });
  router.post('/:id/confirm',async(req,res)=>res.json(await service.confirm(req.actor!,z.string().uuid().parse(req.params.id))));
  router.post('/:id/appeal',async(req,res)=>{const body=z.object({reason:z.string().trim().min(10).max(1000)}).parse(req.body);res.status(201).json(await service.appeal(req.actor!,z.string().uuid().parse(req.params.id),body.reason));});

  return router;
}
