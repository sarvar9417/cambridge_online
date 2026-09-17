import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Actor } from '../lib/actor.js';
import { createLiveExamParticipationRouter } from './live-exam-participation.js';
import type { LiveExamParticipationService } from '../services/live-exam-participation-service.js';

const student={id:'11111111-1111-4111-8111-111111111111',role:'student' as const,schoolId:'school',fullName:'Student'};
const teacher={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',role:'teacher' as const,schoolId:'school',fullName:'Teacher'};
const sessionId='22222222-2222-4222-8222-222222222222';
const participantId='33333333-3333-4333-8333-333333333333';

function appFor(service:Partial<LiveExamParticipationService>,actor:Actor=student){
 const app=express();app.use(express.json());app.use((req,_res,next)=>{req.actor=actor;next()});
 app.use('/live-exams',createLiveExamParticipationRouter(service as LiveExamParticipationService));
 app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  if(error&&typeof error==='object'&&'issues'in error){res.status(400).json({error:{code:'validation_error'}});return}
  res.status(500).json({error:{code:'internal_error'}});
 });return app;
}

describe('live exam participation routes',()=>{
 it('owns the six-digit join route',async()=>{
  const join=vi.fn().mockResolvedValue({sessionId,participantId});
  await request(appFor({join})).post('/live-exams/join').send({code:'123456'}).expect(201);
  expect(join).toHaveBeenCalledWith(student,'123456');
 });
 it('rejects malformed join codes before policy evaluation',async()=>{
  const join=vi.fn();
  await request(appFor({join})).post('/live-exams/join').send({code:'12A'}).expect(400);
  expect(join).not.toHaveBeenCalled();
 });
 it('lets a student leave through the state-restricted service',async()=>{
  const leave=vi.fn().mockResolvedValue({sessionId,version:4});
  await request(appFor({leave})).post(`/live-exams/${sessionId}/leave`).expect(200);
  expect(leave).toHaveBeenCalledWith(student,sessionId);
 });
 it('requires expectedVersion when staff removes a participant',async()=>{
  const remove=vi.fn().mockResolvedValue({sessionId,participantId,version:8});
  await request(appFor({remove},teacher))
   .post(`/live-exams/${sessionId}/participants/${participantId}/remove`)
   .send({expectedVersion:7}).expect(200);
  expect(remove).toHaveBeenCalledWith(teacher,sessionId,participantId,7);
 });
 it('fails validation before participant removal without a version',async()=>{
  const remove=vi.fn();
  await request(appFor({remove},teacher))
   .post(`/live-exams/${sessionId}/participants/${participantId}/remove`)
   .send({}).expect(400);
  expect(remove).not.toHaveBeenCalled();
 });
});
