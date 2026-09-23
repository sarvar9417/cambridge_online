import { Router, type Response } from 'express';
import { z } from 'zod';
import type { LiveExamService } from '../services/live-exam-service.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { durableRateLimit } from '../middleware/durable-rate-limit.js';
import type { Pool } from 'pg';
import { runIdempotent } from '../lib/idempotent-request.js';

const uuid = z.string().uuid();
const id = (params: Record<string, unknown>, key = 'id') => uuid.parse(params[key]);

const createInput = z.object({
  classId: uuid,
  title: z.string().trim().min(3).max(120),
  topicIds: z.array(uuid).max(30).default([]),
  subtopicIds: z.array(uuid).max(100).default([]),
  questionCount: z.number().int().min(1).max(20),
  questionTimeLimitS: z.number().int().min(30).max(7200).optional(),
  markingMode: z.enum(['teacher', 'peer', 'self']),
  includeDiagrams: z.boolean().default(true),
  excludeSeen: z.boolean().default(true),
  questionIds: z.array(uuid).min(1).max(20).optional(),
  questionOrder: z.enum(['fixed', 'shuffled']).default('shuffled'),
  allowLateJoin: z.boolean().default(false),
  autoCloseWhenAllSubmitted: z.boolean().default(false),
  teacherOverrideEnabled: z.boolean().default(true),
  leaderboardMode: z.enum(['marks', 'marks_speed_tiebreak']).default('marks'),
}).strict();

const versionInput = z.object({
  expectedVersion: z.number().int().positive(),
}).strict();

function isPeerIntegrityConflict(error: unknown) {
  return Boolean(error && typeof error === 'object'
    && 'code' in error && error.code === 'P0001'
    && 'message' in error && error.message === 'live_peer_assignment_impossible');
}

function privateNoStore(res: Response) {
  res.set('Cache-Control', 'private, no-store');
}

export function createLiveExamsRouter(service: LiveExamService, pool?: Pool) {
  const router = Router();
  const userAndIp = (req: { ip?: string; actor?: { id?: string } }) => `${req.actor?.id ?? 'anonymous'}:${req.ip ?? 'unknown'}`;
  const joinLimit = rateLimit({ windowMs: 60_000, max: 20, key: userAndIp });
  const staffLimit = rateLimit({ windowMs: 60_000, max: 30, key: userAndIp });
  const autosaveLimit = rateLimit({ windowMs: 60_000, max: 120, key: userAndIp });
  const durableJoinLimit = pool ? durableRateLimit(pool, { windowMs: 60_000, max: 20, key: userAndIp }) : joinLimit;
  const durableStaffLimit = pool ? durableRateLimit(pool, { windowMs: 60_000, max: 30, key: userAndIp }) : staffLimit;
  const durableAutosaveLimit = pool ? durableRateLimit(pool, { windowMs: 60_000, max: 120, key: userAndIp }) : autosaveLimit;

  router.get('/', async (req, res) => {
    // Session lists contain classroom membership state and room codes for
    // authorised users. Never let a browser intermediary or shared device cache
    // one user's view and replay it to the next signed-in user.
    privateNoStore(res);
    res.json({ data: await service.list(req.actor!) });
  });

  router.post('/', durableStaffLimit, async (req, res) => {
    const body = createInput.parse(req.body);
    const operation = async () => ({ status:201, body:await service.create(req.actor!, body) });
    if (pool) return runIdempotent(req, res, pool, operation);
    const result = await operation();
    return res.status(result.status).json(result.body);
  });

  router.get('/eligible-questions', durableStaffLimit, async (req, res) => {
    privateNoStore(res);
    const csvUuids = z.string().default('').transform((value,ctx) => {
      const values=value ? value.split(',').filter(Boolean) : [];
      const parsed=z.array(uuid).max(100).safeParse(values);
      if(!parsed.success){ctx.addIssue({code:'custom',message:'Invalid UUID list'});return z.NEVER}
      return parsed.data;
    });
    const query=z.object({
      classId:uuid,
      topicIds:csvUuids,
      subtopicIds:csvUuids,
      includeDiagrams:z.enum(['true','false']).default('true').transform((value)=>value==='true'),
      excludeSeen:z.enum(['true','false']).default('true').transform((value)=>value==='true'),
      limit:z.coerce.number().int().min(1).max(50).default(30),
    }).parse(req.query);
    res.json({data:await service.eligibleQuestions(req.actor!,{
      classId:query.classId,
      topicIds:query.topicIds ?? [],
      subtopicIds:query.subtopicIds ?? [],
      includeDiagrams:query.includeDiagrams ?? true,
      excludeSeen:query.excludeSeen ?? true,
      limit:query.limit,
      allowLateJoin:false,
      autoCloseWhenAllSubmitted:false,
      teacherOverrideEnabled:true,
      leaderboardMode:'marks',
      questionOrder:'fixed',
    })});
  });

  // Named routes stay above '/:id' so an ordinary word can never be parsed as
  // a UUID and turn a valid join request into a validation error.
  router.post('/join', durableJoinLimit, async (req, res) => {
    const body = z.object({ code: z.string().trim().regex(/^\d{6}$/) }).strict().parse(req.body);
    res.status(201).json(await service.join(req.actor!, body.code));
  });

  router.get('/:id/projector', async (req, res) => {
    // Projectors are a separate privacy surface: return only the classroom
    // presentation DTO, never the teacher's participant/answer payload.
    privateNoStore(res);
    res.json(await service.snapshot(req.actor!, id(req.params), true));
  });

  router.get('/:id', async (req, res) => {
    // A snapshot can contain the learner's draft/submitted answer and, after
    // reveal, Mark Scheme or review data. Treat it as sensitive per-user state.
    privateNoStore(res);
    res.json(await service.snapshot(req.actor!, id(req.params)));
  });

  router.post('/:id/heartbeat', async (req, res) => {
    res.json(await service.heartbeat(req.actor!, id(req.params)));
  });

  router.post('/:id/start', async (req, res) => {
    const body = versionInput.parse(req.body ?? {});
    res.json(await service.start(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/pause', async (req, res) => {
    const body = versionInput.parse(req.body ?? {});
    res.json(await service.pause(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/resume', async (req, res) => {
    const body = versionInput.parse(req.body ?? {});
    res.json(await service.resume(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/leave', async (req, res) => {
    res.json(await service.leave(req.actor!, id(req.params)));
  });

  router.post('/:id/participants/:studentId/remove', async (req, res) => {
    const body = versionInput.parse(req.body ?? {});
    res.json(await service.removeParticipant(
      req.actor!,
      id(req.params),
      id(req.params, 'studentId'),
      body.expectedVersion,
    ));
  });

  router.put('/:id/answer', durableAutosaveLimit, async (req, res) => {
    const body = z.object({ text: z.string().max(20000) }).strict().parse(req.body);
    res.json(await service.saveAnswer(req.actor!, id(req.params), body.text));
  });

  router.post('/:id/answer/submit', async (req, res) => {
    const body = z.object({ text: z.string().max(20000).optional() }).strict().parse(req.body ?? {});
    res.json(await service.submitAnswer(req.actor!, id(req.params), body.text));
  });

  router.post('/:id/reveal', async (req, res) => {
    const body = versionInput.parse(req.body ?? {});
    try {
      res.json(await service.revealMarkScheme(req.actor!, id(req.params), body.expectedVersion));
    } catch (error) {
      if (!isPeerIntegrityConflict(error)) throw error;
      res.status(409).json({ error: {
        code: 'live_peer_assignment_impossible',
        message: 'Anonim o‘zaro baholash uchun kamida ikki xavfsiz ishtirokchi kerak. Baholash ochilmadi.',
      } });
    }
  });

  router.post('/:id/reviews/:reviewId/submit', async (req, res) => {
    const body = z.object({
      matchedPointIds: z.array(uuid).max(100).default([]),
      score: z.number().min(0).max(100).optional(),
      levelNumber: z.number().int().positive().optional(),
      feedback: z.string().trim().max(5000).optional(),
    }).strict().parse(req.body);
    res.json(await service.submitReview(req.actor!, id(req.params), id(req.params, 'reviewId'), body));
  });

  router.put('/:id/answers/:answerId/moderate', async (req, res) => {
    const body = z.object({
      score: z.number().min(0).max(100),
      feedback: z.string().trim().max(5000).optional(),
    }).strict().parse(req.body);
    res.json(await service.moderateAnswer(req.actor!, id(req.params), id(req.params, 'answerId'), body));
  });

  router.post('/:id/marking/complete', async (req, res) => {
    const body = z.object({ force: z.boolean().default(false), expectedVersion: z.number().int().positive() }).strict().parse(req.body ?? {});
    res.json(await service.completeMarking(req.actor!, id(req.params), body.force, body.expectedVersion));
  });

  router.post('/:id/next', async (req, res) => {
    const body = versionInput.parse(req.body ?? {});
    res.json(await service.nextQuestion(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/cancel', async (req, res) => {
    const body = versionInput.parse(req.body ?? {});
    res.json(await service.cancel(req.actor!, id(req.params), body.expectedVersion));
  });

  return router;
}
