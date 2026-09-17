import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createLiveExamControlRouter } from './live-exam-control.js';
import type { LiveExamControlService } from '../services/live-exam-control-service.js';

const teacher={
  id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  role:'teacher' as const,
  schoolId:'school',
  fullName:'Teacher',
};
const sessionId='22222222-2222-4222-8222-222222222222';

function appFor(service:Partial<LiveExamControlService>) {
  const app=express();
  app.use(express.json());
  app.use((req,_res,next)=>{req.actor=teacher;next()});
  app.use('/live-exams',createLiveExamControlRouter(service as LiveExamControlService));
  // Compatibility-window sentinel: a versionless legacy control must pass
  // through rather than being half-handled by the new router.
  app.post('/live-exams/:id/start',(_req,res)=>res.status(209).json({legacy:true}));
  app.post('/live-exams/:id/reveal',(_req,res)=>res.status(209).json({legacy:true}));
  app.post('/live-exams/:id/marking/complete',(_req,res)=>res.status(209).json({legacy:true}));
  app.post('/live-exams/:id/next',(_req,res)=>res.status(209).json({legacy:true}));
  app.post('/live-exams/:id/cancel',(_req,res)=>res.status(209).json({legacy:true}));
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(error&&typeof error==='object'&&'issues'in error){res.status(400).json({error:{code:'validation_error'}});return}
    res.status(500).json({error:{code:'internal_error'}});
  });
  return app;
}

describe('live exam version-aware control routes',()=>{
  it('opens a published room only with an explicit expected version',async()=>{
    const openRoom=vi.fn().mockResolvedValue({sessionId,status:'lobby',version:8});
    await request(appFor({openRoom}))
      .post(`/live-exams/${sessionId}/open-room`)
      .send({expectedVersion:7})
      .expect(200);
    expect(openRoom).toHaveBeenCalledWith(teacher,sessionId,7);
  });

  it('rejects a missing version on new-only controls',async()=>{
    const lockAnswers=vi.fn();
    await request(appFor({lockAnswers}))
      .post(`/live-exams/${sessionId}/answers/lock`)
      .send({})
      .expect(400);
    expect(lockAnswers).not.toHaveBeenCalled();
  });

  it('uses the CAS start transition when expectedVersion is present',async()=>{
    const start=vi.fn().mockResolvedValue({sessionId,status:'question_open',version:11});
    const response=await request(appFor({start}))
      .post(`/live-exams/${sessionId}/start`)
      .send({expectedVersion:10})
      .expect(200);
    expect(response.body.version).toBe(11);
    expect(start).toHaveBeenCalledWith(teacher,sessionId,10);
  });

  it('lets a versionless legacy start request fall through during migration',async()=>{
    const start=vi.fn();
    const response=await request(appFor({start}))
      .post(`/live-exams/${sessionId}/start`)
      .send({})
      .expect(209);
    expect(response.body.legacy).toBe(true);
    expect(start).not.toHaveBeenCalled();
  });

  it('separates answer lock from Mark Scheme reveal',async()=>{
    const lockAnswers=vi.fn().mockResolvedValue({sessionId,status:'answers_locked',version:13});
    const revealMarkScheme=vi.fn().mockResolvedValue({sessionId,status:'marking',version:14});
    await request(appFor({lockAnswers,revealMarkScheme}))
      .post(`/live-exams/${sessionId}/answers/lock`)
      .send({expectedVersion:12})
      .expect(200);
    await request(appFor({lockAnswers,revealMarkScheme}))
      .post(`/live-exams/${sessionId}/mark-scheme/reveal`)
      .send({expectedVersion:13})
      .expect(200);
    expect(lockAnswers).toHaveBeenCalledWith(teacher,sessionId,12);
    expect(revealMarkScheme).toHaveBeenCalledWith(teacher,sessionId,13);
  });

  it('passes expectedVersion and force into marking completion',async()=>{
    const completeMarking=vi.fn().mockResolvedValue({sessionId,status:'review',version:22});
    await request(appFor({completeMarking}))
      .post(`/live-exams/${sessionId}/marking/complete`)
      .send({expectedVersion:21,force:true})
      .expect(200);
    expect(completeMarking).toHaveBeenCalledWith(teacher,sessionId,21,true);
  });

  it('exposes pause and resume as explicit versioned transitions',async()=>{
    const pause=vi.fn().mockResolvedValue({sessionId,status:'paused',version:31});
    const resume=vi.fn().mockResolvedValue({sessionId,status:'question_open',version:32});
    await request(appFor({pause,resume}))
      .post(`/live-exams/${sessionId}/pause`)
      .send({expectedVersion:30})
      .expect(200);
    await request(appFor({pause,resume}))
      .post(`/live-exams/${sessionId}/resume`)
      .send({expectedVersion:31})
      .expect(200);
    expect(pause).toHaveBeenCalledWith(teacher,sessionId,30);
    expect(resume).toHaveBeenCalledWith(teacher,sessionId,31);
  });
});
