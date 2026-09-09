import { Router } from 'express';
import { z } from 'zod';
import type { LiveChallengeService } from '../services/live-challenge-service.js';

const uuid = z.string().uuid();

const settingsSchema = z.object({
  questionOrder: z.enum(['fixed','shuffled']).optional(),
  timingMode: z.enum(['teacher','per_question']).optional(),
  defaultTimeLimitSeconds: z.number().int().min(10).max(7200).nullable().optional(),
  allowLateJoin: z.boolean().optional(),
  autoCloseWhenAllSubmitted: z.boolean().optional(),
  peerMarkingEnabled: z.boolean().optional(),
  teacherOverrideEnabled: z.boolean().optional(),
  leaderboardMode: z.enum(['marks','marks_plus_small_speed_bonus']).optional(),
  displayNameMode: z.enum(['first_name','full_name','anonymous']).optional(),
}).strict();

export function createLiveChallengesRouter(service: LiveChallengeService) {
  const router = Router();

  router.get('/builder-options', async (req, res) => {
    const query = z.object({ syllabusId: uuid.optional() }).parse(req.query);
    res.json({ data: await service.builderOptions(req.actor!, query.syllabusId) });
  });

  router.get('/eligible-questions', async (req, res) => {
    const query = z.object({
      syllabusId: uuid,
      topicId: uuid.optional(),
      subtopicId: uuid.optional(),
      limit: z.coerce.number().int().min(1).max(500).default(100),
    }).parse(req.query);
    res.json({ data: await service.eligibleQuestions(req.actor!, query) });
  });

  router.get('/', async (req, res) => {
    res.json({ data: await service.list(req.actor!) });
  });

  router.post('/', async (req, res) => {
    const body = z.object({
      classId: uuid,
      title: z.string().trim().min(3).max(120),
      syllabusId: uuid,
      topicId: uuid.nullable().optional(),
      subtopicId: uuid.nullable().optional(),
      settings: settingsSchema.optional(),
      questionIds: z.array(uuid).max(30).optional(),
    }).strict().parse(req.body);
    res.status(201).json({ data: await service.createDraft(req.actor!, body) });
  });

  router.put('/:id/questions', async (req, res) => {
    const body = z.object({ questionIds: z.array(uuid).min(1).max(30) }).strict().parse(req.body);
    res.json({ data: await service.replaceQuestions(req.actor!, uuid.parse(req.params.id), body.questionIds) });
  });

  router.post('/:id/questions/auto', async (req, res) => {
    const body = z.object({ count: z.number().int().min(1).max(30) }).strict().parse(req.body);
    res.json({ data: await service.autoSelect(req.actor!, uuid.parse(req.params.id), body.count) });
  });

  router.patch('/:id', async (req, res) => {
    const body = z.object({
      title: z.string().trim().min(3).max(120).optional(),
      settings: settingsSchema.optional(),
    }).strict().refine((value) => value.title !== undefined || value.settings !== undefined, {
      message: 'At least one draft field is required.',
    }).parse(req.body);
    res.json({ data: await service.updateDraft(req.actor!, uuid.parse(req.params.id), body) });
  });

  router.post('/:id/publish', async (req, res) => {
    res.json({ data: await service.publish(req.actor!, uuid.parse(req.params.id)) });
  });

  return router;
}
