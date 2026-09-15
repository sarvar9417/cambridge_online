import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createLiveExamsRouter } from './live-exams.js';
import type { LiveExamService } from '../services/live-exam-service.js';

const student = { id:'11111111-1111-4111-8111-111111111111',role:'student' as const,schoolId:'school',fullName:'Student' };

function appFor(service:Partial<LiveExamService>) {
  const app=express();
  app.use(express.json());
  app.use((req,_res,next)=>{req.actor=student;next()});
  app.use('/live-exams',createLiveExamsRouter(service as LiveExamService));
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(error&&typeof error==='object'&&'issues'in error){res.status(400).json({error:{code:'validation_error'}});return}
    res.status(500).json({error:{code:'internal_error'}});
  });
  return app;
}

describe('live exam routes', () => {
  it('keeps /join above the UUID session route', async () => {
    const join=vi.fn().mockResolvedValue({sessionId:'session-1'});
    const response=await request(appFor({join})).post('/live-exams/join').send({code:'123456'}).expect(201);
    expect(response.body.sessionId).toBe('session-1');
    expect(join).toHaveBeenCalledWith(student,'123456');
  });

  it('rejects malformed room codes before calling the service', async () => {
    const join=vi.fn();
    await request(appFor({join})).post('/live-exams/join').send({code:'12A'}).expect(400);
    expect(join).not.toHaveBeenCalled();
  });

  it('validates review point identifiers', async () => {
    const submitReview=vi.fn();
    await request(appFor({submitReview}))
      .post('/live-exams/22222222-2222-4222-8222-222222222222/reviews/33333333-3333-4333-8333-333333333333/submit')
      .send({matchedPointIds:['not-a-uuid']})
      .expect(400);
    expect(submitReview).not.toHaveBeenCalled();
  });
});
