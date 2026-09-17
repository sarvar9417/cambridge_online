import { Router } from 'express';
import { z } from 'zod';
import type { LiveExamBuilderService } from '../services/live-exam-builder-service.js';

const uuid = z.string().uuid();
const sessionId = (params: Record<string,unknown>) => uuid.parse(params.id);
const expectedVersion = z.number().int().positive();
const settings = z.object({
  questionOrder:z.enum(['fixed','shuffled']).optional(),
  timingMode:z.enum(['teacher','per_question']).optional(),
  defaultTimeLimitSeconds:z.number().int().min(30).max(7200).nullable().optional(),
  allowLateJoin:z.boolean().optional(),
  autoCloseWhenAllSubmitted:z.boolean().optional(),
  peerMarkingEnabled:z.boolean().optional(),
  teacherOverrideEnabled:z.boolean().optional(),
  displayNameMode:z.enum(['first_name','full_name','anonymous']).optional(),
}).strict();

export function createLiveExamBuilderRouter(service: LiveExamBuilderService) {
  const router = Router();

  router.get('/builder-options', async (req, res) => {
    const query = z.object({ syllabusId: uuid.optional() }).parse(req.query);
    res.set('Cache-Control', 'private, no-store');
    res.json({ data: await service.builderOptions(req.actor!, query.syllabusId) });
  });

  router.get('/eligible-questions', async (req, res) => {
    const query = z.object({
      syllabusId: uuid,
      topicId: uuid,
      subtopicId: uuid.optional(),
      limit: z.coerce.number().int().min(1).max(500).default(100),
    }).parse(req.query);
    res.set('Cache-Control', 'private, no-store');
    res.json({ data: await service.eligibleQuestions(req.actor!, query) });
  });

  router.post('/drafts', async (req,res) => {
    const body = z.object({
      classId:uuid,
      title:z.string().trim().min(3).max(120),
      topicId:uuid,
      subtopicId:uuid.optional(),
      markingMode:z.enum(['teacher','peer','self']),
      settings:settings.optional(),
    }).strict().parse(req.body);
    res.status(201).json({ data:await service.createDraft(req.actor!,body) });
  });

  router.get('/:id/builder', async (req,res) => {
    res.set('Cache-Control','private, no-store');
    res.json({ data:await service.draft(req.actor!,sessionId(req.params)) });
  });

  // This ordered replacement is deliberately the single mutation primitive for
  // manual selection, removal and reordering. Omitting a question removes it;
  // array order becomes the canonical classroom order.
  router.put('/:id/questions', async (req,res) => {
    const body = z.object({
      questionIds:z.array(uuid).max(20),
      expectedVersion,
    }).strict().parse(req.body);
    res.json({ data:await service.replaceQuestions(
      req.actor!,sessionId(req.params),body.questionIds,body.expectedVersion,
    ) });
  });

  router.post('/:id/questions/auto', async (req,res) => {
    const body = z.object({
      count:z.number().int().min(1).max(20),
      expectedVersion,
    }).strict().parse(req.body);
    res.json({ data:await service.autoSelect(
      req.actor!,sessionId(req.params),body.count,body.expectedVersion,
    ) });
  });

  router.post('/:id/publish', async (req,res) => {
    const body = z.object({ expectedVersion }).strict().parse(req.body);
    res.json({ data:await service.publish(req.actor!,sessionId(req.params),body.expectedVersion) });
  });

  return router;
}
