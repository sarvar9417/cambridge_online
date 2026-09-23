import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createLiveExamRoundSummaryRouter } from './live-exam-round-summary.js';
import type { LiveExamRoundSummaryService } from '../services/live-exam-round-summary-service.js';

const teacher={id:'11111111-1111-4111-8111-111111111111',role:'teacher' as const,schoolId:'school',fullName:'Teacher'};

function appFor(service:Partial<LiveExamRoundSummaryService>){
  const app=express();
  app.use((req,_res,next)=>{req.actor=teacher;next()});
  app.use('/live-exams',createLiveExamRoundSummaryRouter(service as LiveExamRoundSummaryService));
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(error&&typeof error==='object'&&'issues'in error){res.status(400).json({error:{code:'validation_error'}});return}
    res.status(500).json({error:{code:'internal_error'}});
  });
  return app;
}

describe('live exam round summary route',()=>{
  it('returns a non-cacheable teacher summary',async()=>{
    const summary=vi.fn().mockResolvedValue({sessionId:'22222222-2222-4222-8222-222222222222',marksFirst:true,round:{standings:[]}});
    const response=await request(appFor({summary}))
      .get('/live-exams/22222222-2222-4222-8222-222222222222/round-summary')
      .expect(200);
    expect(response.body.marksFirst).toBe(true);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(summary).toHaveBeenCalledWith(teacher,'22222222-2222-4222-8222-222222222222',false);
  });

  it('rejects a malformed session id before querying the service',async()=>{
    const summary=vi.fn();
    await request(appFor({summary})).get('/live-exams/not-a-uuid/round-summary').expect(400);
    expect(summary).not.toHaveBeenCalled();
  });
});
