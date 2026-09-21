import express from 'express';
import request from 'supertest';
import { describe,expect,it,vi } from 'vitest';
import { createLiveExamAnalyticsRouter } from './live-exam-analytics.js';
import type { LiveExamAnalyticsService } from '../services/live-exam-analytics-service.js';

const teacher={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',role:'teacher' as const,schoolId:'school',fullName:'Teacher'};
const sessionId='22222222-2222-4222-8222-222222222222';

function appFor(service:Partial<LiveExamAnalyticsService>){
  const app=express();app.use((req,_res,next)=>{req.actor=teacher;next()});
  app.use('/live-exams',createLiveExamAnalyticsRouter(service as LiveExamAnalyticsService));
  return app;
}

describe('Live Challenge analytics route',()=>{
  it('returns private no-store finished analytics',async()=>{
    const summary=vi.fn().mockResolvedValue({session:{id:sessionId,title:'Challenge',className:'AS'},strongest:[],weakest:[]});
    const response=await request(appFor({summary})).get(`/live-exams/${sessionId}/analytics`).expect(200);
    expect(summary).toHaveBeenCalledWith(teacher,sessionId);
    expect(response.headers['cache-control']).toContain('private');
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.headers.vary).toContain('Authorization');
    expect(response.body.data.session.id).toBe(sessionId);
  });
});
