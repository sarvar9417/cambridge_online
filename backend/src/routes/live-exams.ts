import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { LiveExamService } from '../services/live-exam-service.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { durableRateLimit } from '../middleware/durable-rate-limit.js';
import type { Pool } from 'pg';
import { runIdempotent } from '../lib/idempotent-request.js';
import { LIVE_COURSEBOOK_SECTION_CODES } from '../lib/live-coursebook-sections.js';

const uuid = z.string().uuid();
const coursebookSectionCode=z.string().trim().regex(/^\d{1,2}\.\d{1,2}$/)
  .refine((value)=>LIVE_COURSEBOOK_SECTION_CODES.has(value),'Unknown 9618 coursebook section');
const id = (params: Record<string, unknown>, key = 'id') => uuid.parse(params[key]);

const createInput = z.object({
  classId: uuid,
  title: z.string().trim().min(3).max(120),
  topicIds: z.array(uuid).max(30).default([]),
  subtopicIds: z.array(uuid).max(100).default([]),
  coursebookSectionCodes: z.array(coursebookSectionCode).max(100).default([]),
  questionCount: z.number().int().min(1),
  questionTimeLimitS: z.number().int().min(30).max(7200).optional(),
  questionTimeLimits: z.record(uuid, z.number().int().min(30).max(7200).nullable()).default({}),
  markingMode: z.enum(['teacher', 'peer', 'self']),
  includeDiagrams: z.boolean().default(true),
  excludeSeen: z.boolean().default(true),
  difficulty: z.enum(['easy','medium','hard']).optional(),
  marksMin: z.number().int().min(1).max(100).optional(),
  marksMax: z.number().int().min(1).max(100).optional(),
  yearFrom: z.number().int().min(2000).max(2100).optional(),
  yearTo: z.number().int().min(2000).max(2100).optional(),
  series: z.array(z.enum(['FM','MJ','ON'])).max(3).default([]),
  components: z.array(z.number().int().min(1).max(9)).max(9).default([]),
  questionIds: z.array(uuid).min(1).optional(),
  questionOrder: z.enum(['fixed', 'shuffled']).default('shuffled'),
  allowLateJoin: z.boolean().default(false),
  autoCloseWhenAllSubmitted: z.boolean().default(false),
  teacherOverrideEnabled: z.boolean().default(true),
  leaderboardMode: z.enum(['marks', 'marks_speed_tiebreak']).default('marks'),
  displayNameMode: z.enum(['full', 'first_name', 'initials', 'anonymous_alias']).default('anonymous_alias'),
  peerCalibrationPercent: z.number().int().min(0).max(100).default(0),
  peerDisagreementThreshold: z.number().min(0).max(100).default(1),
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

  const mutation = async (req:Request, res:Response, operation:()=>Promise<unknown>) => {
    const execute=async()=>({status:200,body:await operation()});
    if(pool)return runIdempotent(req,res,pool,execute);
    const result=await execute();
    return res.status(result.status).json(result.body);
  };

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
    const csvCoursebookSections=z.string().default('').transform((value,ctx)=>{
      const values=value?value.split(',').filter(Boolean):[];
      const parsed=z.array(coursebookSectionCode).max(100).safeParse(values);
      if(!parsed.success){ctx.addIssue({code:'custom',message:'Invalid coursebook section list'});return z.NEVER}
      return parsed.data;
    });
    const csvSeries=z.string().optional().transform((value,ctx)=>{
      const values=value?value.split(',').filter(Boolean):[];
      const parsed=z.array(z.enum(['FM','MJ','ON'])).max(3).safeParse(values);
      if(!parsed.success){ctx.addIssue({code:'custom',message:'Invalid series list'});return z.NEVER}
      return parsed.data;
    });
    const csvComponents=z.string().optional().transform((value,ctx)=>{
      const values=value?value.split(',').filter(Boolean).map(Number):[];
      const parsed=z.array(z.number().int().min(1).max(9)).max(9).safeParse(values);
      if(!parsed.success){ctx.addIssue({code:'custom',message:'Invalid component list'});return z.NEVER}
      return parsed.data;
    });
    const query=z.object({
      classId:uuid,
      topicIds:csvUuids,
      subtopicIds:csvUuids,
      coursebookSectionCodes:csvCoursebookSections,
      includeDiagrams:z.enum(['true','false']).default('true').transform((value)=>value==='true'),
      excludeSeen:z.enum(['true','false']).default('true').transform((value)=>value==='true'),
      difficulty:z.enum(['easy','medium','hard']).optional(),
      marksMin:z.coerce.number().int().min(1).max(100).optional(),
      marksMax:z.coerce.number().int().min(1).max(100).optional(),
      yearFrom:z.coerce.number().int().min(2000).max(2100).optional(),
      yearTo:z.coerce.number().int().min(2000).max(2100).optional(),
      series:csvSeries,
      components:csvComponents,
      q:z.string().trim().max(120).optional().transform((value)=>value??''),
      offset:z.coerce.number().int().min(0).optional().transform((value)=>value??0),
      limit:z.coerce.number().int().min(1).default(30),
      includeData:z.enum(['true','false']).default('true').transform((value)=>value==='true'),
      includeCounts:z.enum(['true','false']).default('true').transform((value)=>value==='true'),
    }).parse(req.query);
    res.json(await service.eligibleQuestions(req.actor!,{
      classId:query.classId,
      topicIds:query.topicIds ?? [],
      subtopicIds:query.subtopicIds ?? [],
      coursebookSectionCodes:query.coursebookSectionCodes ?? [],
      includeDiagrams:query.includeDiagrams ?? true,
      excludeSeen:query.excludeSeen ?? true,
      difficulty:query.difficulty,
      marksMin:query.marksMin,
      marksMax:query.marksMax,
      yearFrom:query.yearFrom,
      yearTo:query.yearTo,
      series:query.series,
      components:query.components,
      search:query.q,
      offset:query.offset,
      limit:query.limit,
      includeData:query.includeData,
      includeCounts:query.includeCounts,
      allowLateJoin:false,
      autoCloseWhenAllSubmitted:false,
      teacherOverrideEnabled:true,
      leaderboardMode:'marks',
      questionOrder:'fixed',
    }));
  });

  router.post('/selection-preview', durableStaffLimit, async (req,res)=>{
    privateNoStore(res);
    const body=z.object({
      classId:uuid,
      topicIds:z.array(uuid).max(30).default([]),
      subtopicIds:z.array(uuid).max(100).default([]),
      coursebookSectionCodes:z.array(coursebookSectionCode).max(100).default([]),
      includeDiagrams:z.boolean().default(true),
      excludeSeen:z.boolean().default(true),
      difficulty:z.enum(['easy','medium','hard']).optional(),
      marksMin:z.number().int().min(1).max(100).optional(),
      marksMax:z.number().int().min(1).max(100).optional(),
      yearFrom:z.number().int().min(2000).max(2100).optional(),
      yearTo:z.number().int().min(2000).max(2100).optional(),
      series:z.array(z.enum(['FM','MJ','ON'])).max(3).default([]),
      components:z.array(z.number().int().min(1).max(9)).max(9).default([]),
      questionIds:z.array(uuid).min(1).max(100),
      questionOrder:z.literal('fixed').default('fixed'),
      allowLateJoin:z.boolean().default(false),
      autoCloseWhenAllSubmitted:z.boolean().default(false),
      teacherOverrideEnabled:z.boolean().default(true),
      leaderboardMode:z.enum(['marks','marks_speed_tiebreak']).default('marks'),
      displayNameMode:z.enum(['full','first_name','initials','anonymous_alias']).default('anonymous_alias'),
      peerCalibrationPercent:z.number().int().min(0).max(100).default(0),
      peerDisagreementThreshold:z.number().min(0).max(100).default(1),
    }).strict().parse(req.body);
    res.json(await service.previewSelection(req.actor!,body));
  });

  // Named routes stay above '/:id' so an ordinary word can never be parsed as
  // a UUID and turn a valid join request into a validation error.
  router.post('/join', durableJoinLimit, async (req, res) => {
    const body = z.object({ code: z.string().trim().regex(/^\d{6}$/) }).strict().parse(req.body);
    res.status(201).json(await service.join(req.actor!, body.code));
  });

  router.get('/:id/report', async (req,res)=>{
    privateNoStore(res);
    res.json(await service.detailedReport(req.actor!,id(req.params)));
  });

  router.get('/:id/report.csv', async (req,res)=>{
    privateNoStore(res);
    const csv=await service.detailedReportCsv(req.actor!,id(req.params));
    res.type('text/csv; charset=utf-8');
    res.set('Content-Disposition',`attachment; filename="live-report-${id(req.params)}.csv"`);
    res.send(csv);
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

  router.delete('/:id', durableStaffLimit, async (req, res) => {
    const body=versionInput.parse(req.body ?? {});
    return mutation(req,res,()=>service.archiveHistory(req.actor!,id(req.params),body.expectedVersion));
  });

  router.post('/:id/heartbeat', async (req, res) => {
    res.json(await service.heartbeat(req.actor!, id(req.params)));
  });

  router.post('/:id/late-join', async (req, res) => {
    const body = z.object({
      allowLateJoin: z.boolean(),
      expectedVersion: z.number().int().positive(),
    }).strict().parse(req.body);
    return mutation(req,res,()=>service.setLateJoin(req.actor!,id(req.params),body.allowLateJoin,body.expectedVersion));
  });

  router.post('/:id/start', async (req, res) => {
    const body = versionInput.parse(req.body ?? {});
    return mutation(req,res,()=>service.start(req.actor!,id(req.params),body.expectedVersion));
  });

  router.post('/:id/pause', async (req, res) => {
    const body = versionInput.parse(req.body ?? {});
    return mutation(req,res,()=>service.pause(req.actor!,id(req.params),body.expectedVersion));
  });

  router.post('/:id/resume', async (req, res) => {
    const body = versionInput.parse(req.body ?? {});
    return mutation(req,res,()=>service.resume(req.actor!,id(req.params),body.expectedVersion));
  });

  router.post('/:id/leave', async (req, res) => {
    res.json(await service.leave(req.actor!, id(req.params)));
  });

  router.post('/:id/participants/:studentId/remove', async (req, res) => {
    const body = versionInput.parse(req.body ?? {});
    return mutation(req,res,()=>service.removeParticipant(
      req.actor!,
      id(req.params),
      id(req.params,'studentId'),
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
      return await mutation(req,res,()=>service.revealMarkScheme(req.actor!,id(req.params),body.expectedVersion));
    } catch (error) {
      if (!isPeerIntegrityConflict(error)) throw error;
      res.status(409).json({ error: {
        code: 'live_peer_assignment_impossible',
        message: 'Anonim o‘zaro baholash uchun kamida ikki xavfsiz ishtirokchi kerak. Baholash ochilmadi.',
      } });
    }
  });

  router.post('/:id/reviews/:reviewId/submit', async (req, res) => {
    const reviewInput=z.object({
      matchedPointIds:z.array(uuid).max(100).default([]),
      score:z.number().min(0).max(100).optional(),
      levelNumber:z.number().int().positive().optional(),
      feedback:z.string().trim().max(5000).optional(),
    }).strict();
    let expectedVersion:number|undefined;
    const body=req.actor!.role==='student'
      ? reviewInput.parse(req.body)
      : (()=>{const parsed=reviewInput.extend({expectedVersion:z.number().int().positive()}).parse(req.body);expectedVersion=parsed.expectedVersion;return parsed})();
    return mutation(req,res,()=>service.submitReview(
      req.actor!,id(req.params),id(req.params,'reviewId'),
      {matchedPointIds:body.matchedPointIds,score:body.score,levelNumber:body.levelNumber,feedback:body.feedback},
      expectedVersion,
    ));
  });

  router.put('/:id/answers/:answerId/moderate', async (req, res) => {
    const body = z.object({
      score: z.number().min(0).max(100),
      feedback: z.string().trim().max(5000).optional(),
      levelNumber: z.number().int().positive().optional(),
      expectedVersion: z.number().int().positive(),
    }).strict().parse(req.body);
    return mutation(req,res,()=>service.moderateAnswer(
      req.actor!,
      id(req.params),
      id(req.params,'answerId'),
      {score:body.score,feedback:body.feedback,levelNumber:body.levelNumber},
      body.expectedVersion,
    ));
  });

  router.post('/:id/marking/complete', async (req, res) => {
    const body = z.object({ force: z.boolean().default(false), expectedVersion: z.number().int().positive() }).strict().parse(req.body ?? {});
    return mutation(req,res,()=>service.completeMarking(req.actor!,id(req.params),body.force,body.expectedVersion));
  });

  router.post('/:id/next', async (req, res) => {
    const body = versionInput.parse(req.body ?? {});
    return mutation(req,res,()=>service.nextQuestion(req.actor!,id(req.params),body.expectedVersion));
  });

  router.post('/:id/cancel', async (req, res) => {
    const body = versionInput.parse(req.body ?? {});
    return mutation(req,res,()=>service.cancel(req.actor!,id(req.params),body.expectedVersion));
  });

  return router;
}
