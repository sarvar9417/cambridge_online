import { Router } from 'express';
import { z } from 'zod';
import type { LiveChallengeService } from '../services/live-challenge-service.js';
import type { LiveChallengeSessionService } from '../services/live-challenge-session-service.js';
import type { LiveChallengeAnswerService } from '../services/live-challenge-answer-service.js';
import type { LiveChallengePeerMarkingService } from '../services/live-challenge-peer-marking-service.js';
import { projectLiveChallengeForBoard } from '../services/live-challenge-board-projection.js';

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

export function createLiveChallengesRouter(
  service: LiveChallengeService,
  session: LiveChallengeSessionService,
  answers: LiveChallengeAnswerService,
  peerMarking: LiveChallengePeerMarkingService,
) {
  const router = Router();

  router.get('/student', async (req, res) => {
    res.json({ data: await session.studentFeed(req.actor!) });
  });

  router.post('/join', async (req, res) => {
    const body=z.object({code:z.string().trim().min(1).max(12)}).strict().parse(req.body);
    res.json({data:await session.join(req.actor!,body.code)});
  });

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

  router.get('/:id/board',async(req,res)=>{
    const id=uuid.parse(req.params.id);
    // metrics() performs the staff/class-control check before any teacher state
    // is projected. The subsequent allow-list projection is deliberately not a
    // subtraction from teacher state, so future private fields fail closed.
    const metrics=await answers.metrics(req.actor!,id);
    const state=await session.state(req.actor!,id);
    const lobby=['PUBLISHED','LOBBY'].includes(state.status)?await session.lobby(req.actor!,id):null;
    res.json({data:projectLiveChallengeForBoard(state,metrics,lobby)});
  });

  router.get('/:id/state',async(req,res)=>{
    res.json({data:await session.state(req.actor!,uuid.parse(req.params.id))});
  });

  router.get('/:id/answer',async(req,res)=>{
    res.json({data:await answers.own(req.actor!,uuid.parse(req.params.id))});
  });

  router.post('/:id/answer',async(req,res)=>{
    const body=z.object({answerText:z.string().trim().min(1).max(50000),expectedStateVersion:z.number().int().min(0).optional()}).strict().parse(req.body);
    res.status(201).json({data:await answers.submit(req.actor!,uuid.parse(req.params.id),body.answerText,body.expectedStateVersion)});
  });

  router.post('/:id/answers/lock',async(req,res)=>{
    const body=z.object({expectedStateVersion:z.number().int().min(0).optional()}).strict().parse(req.body??{});
    res.json({data:await answers.lock(req.actor!,uuid.parse(req.params.id),body.expectedStateVersion)});
  });

  router.post('/:id/peer-marking/start',async(req,res)=>{
    const body=z.object({expectedStateVersion:z.number().int().min(0).optional()}).strict().parse(req.body??{});
    res.json({data:await peerMarking.start(req.actor!,uuid.parse(req.params.id),body.expectedStateVersion)});
  });

  router.get('/:id/peer-marking/assignment',async(req,res)=>{
    res.json({data:await peerMarking.assignment(req.actor!,uuid.parse(req.params.id))});
  });

  router.post('/:id/peer-marking/submit',async(req,res)=>{
    const body=z.object({
      awardedMarks:z.number().min(0),
      markPointIds:z.array(uuid).max(100).default([]),
      feedbackText:z.string().trim().max(5000).nullable().optional(),
    }).strict().parse(req.body);
    res.status(201).json({data:await peerMarking.submit(req.actor!,uuid.parse(req.params.id),body)});
  });

  router.post('/:id/peer-marking/release',async(req,res)=>{
    const body=z.object({expectedStateVersion:z.number().int().min(0).optional()}).strict().parse(req.body??{});
    res.json({data:await peerMarking.release(req.actor!,uuid.parse(req.params.id),body.expectedStateVersion)});
  });

  router.post('/:id/next',async(req,res)=>{
    const body=z.object({expectedStateVersion:z.number().int().min(0).optional()}).strict().parse(req.body??{});
    res.json({data:await peerMarking.advance(req.actor!,uuid.parse(req.params.id),body.expectedStateVersion)});
  });

  router.get('/:id/result',async(req,res)=>{
    res.json({data:await peerMarking.ownResult(req.actor!,uuid.parse(req.params.id))});
  });

  router.post('/:id/start',async(req,res)=>{
    const body=z.object({expectedStateVersion:z.number().int().min(0).optional()}).strict().parse(req.body??{});
    res.json({data:await session.start(req.actor!,uuid.parse(req.params.id),body.expectedStateVersion)});
  });

  router.get('/:id/lobby',async(req,res)=>{
    res.json({data:await session.lobby(req.actor!,uuid.parse(req.params.id))});
  });

  router.post('/:id/lobby/open',async(req,res)=>{
    const body=z.object({expectedStateVersion:z.number().int().min(0).optional()}).strict().parse(req.body??{});
    res.json({data:await session.openLobby(req.actor!,uuid.parse(req.params.id),body.expectedStateVersion)});
  });

  router.post('/:id/leave',async(req,res)=>{
    res.json({data:await session.leave(req.actor!,uuid.parse(req.params.id))});
  });

  return router;
}