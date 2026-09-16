import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createLiveExamRealtimeRouter } from './live-exam-realtime.js';
import type { LiveExamRealtimeService } from '../services/live-exam-realtime-service.js';

const student = { id:'11111111-1111-4111-8111-111111111111',role:'student' as const,schoolId:'school',fullName:'Student' };

function appFor(service:Partial<LiveExamRealtimeService>) {
  const app=express();
  app.use((req,_res,next)=>{req.actor=student;next()});
  app.use('/live-exams',createLiveExamRealtimeRouter(service as LiveExamRealtimeService));
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(error&&typeof error==='object'&&'issues'in error){res.status(400).json({error:{code:'validation_error'}});return}
    res.status(500).json({error:{code:'internal_error'}});
  });
  return app;
}

describe('live exam realtime route', () => {
  it('parses the event cursor and forwards the authenticated actor', async () => {
    const events=vi.fn().mockResolvedValue({sessionId:'22222222-2222-4222-8222-222222222222',currentVersion:8,changed:false,events:[]});
    const response=await request(appFor({events}))
      .get('/live-exams/22222222-2222-4222-8222-222222222222/events?afterVersion=8&limit=25')
      .expect(200);
    expect(response.body.currentVersion).toBe(8);
    expect(events).toHaveBeenCalledWith(student,'22222222-2222-4222-8222-222222222222',8,25);
  });

  it('rejects malformed cursors before the service is called', async () => {
    const events=vi.fn();
    await request(appFor({events}))
      .get('/live-exams/22222222-2222-4222-8222-222222222222/events?afterVersion=-1')
      .expect(400);
    expect(events).not.toHaveBeenCalled();
  });
});
