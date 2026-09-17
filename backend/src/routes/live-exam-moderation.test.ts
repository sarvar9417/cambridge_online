import express from 'express';
import request from 'supertest';
import { describe,expect,it,vi } from 'vitest';
import { createLiveExamModerationRouter } from './live-exam-moderation.js';
import type { LiveExamModerationService } from '../services/live-exam-moderation-service.js';

const teacher={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',role:'teacher' as const,schoolId:'school',fullName:'Teacher'};
const sessionId='22222222-2222-4222-8222-222222222222';
const answerId='33333333-3333-4333-8333-333333333333';

function appFor(service:Partial<LiveExamModerationService>){
 const app=express();app.use(express.json());app.use((req,_res,next)=>{req.actor=teacher;next()});
 app.use('/live-exams',createLiveExamModerationRouter(service as LiveExamModerationService));
 app.put('/live-exams/:id/answers/:answerId/moderate',(_req,res)=>res.status(209).json({legacy:true}));
 app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  if(error&&typeof error==='object'&&'issues'in error){res.status(400).json({error:{code:'validation_error'}});return;}
  res.status(500).json({error:{code:'internal_error'}});
 });return app;
}

describe('live exam moderation route',()=>{
 it('uses reasoned CAS moderation when the new UI shape is present',async()=>{
  const moderate=vi.fn().mockResolvedValue({answerId,score:2,reason:'Peer score corrected.',version:18});
  await request(appFor({moderate})).put(`/live-exams/${sessionId}/answers/${answerId}/moderate`)
   .send({score:2,feedback:'Adjusted to the MS.',reason:'Peer score corrected.',expectedVersion:17}).expect(200);
  expect(moderate).toHaveBeenCalledWith(teacher,sessionId,answerId,{
   score:2,feedback:'Adjusted to the MS.',reason:'Peer score corrected.',expectedVersion:17,
  });
 });

 it('temporarily lets the legacy marker fall through until its reason field lands',async()=>{
  const moderate=vi.fn();
  const response=await request(appFor({moderate})).put(`/live-exams/${sessionId}/answers/${answerId}/moderate`)
   .send({score:2}).expect(209);
  expect(response.body.legacy).toBe(true);
  expect(moderate).not.toHaveBeenCalled();
 });
});
