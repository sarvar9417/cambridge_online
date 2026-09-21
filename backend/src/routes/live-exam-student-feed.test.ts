import express from 'express';
import request from 'supertest';
import { describe,expect,it,vi } from 'vitest';
import { createLiveExamStudentFeedRouter } from './live-exam-student-feed.js';
import type { LiveExamStudentFeedService } from '../services/live-exam-student-feed-service.js';

const student={id:'11111111-1111-4111-8111-111111111111',role:'student' as const,schoolId:'school',fullName:'Student'};

function appFor(service:Partial<LiveExamStudentFeedService>){
  const app=express();app.use((req,_res,next)=>{req.actor=student;next()});
  app.use('/live-exams',createLiveExamStudentFeedRouter(service as LiveExamStudentFeedService));
  return app;
}

describe('Live Challenge student feed route',()=>{
  it('returns private no-store feed data',async()=>{
    const feed=vi.fn().mockResolvedValue({active:[],upcoming:[],history:[]});
    const response=await request(appFor({feed})).get('/live-exams/student-feed').expect(200);
    expect(feed).toHaveBeenCalledWith(student);
    expect(response.headers['cache-control']).toContain('private');
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.headers.vary).toContain('Authorization');
    expect(response.body.data).toEqual({active:[],upcoming:[],history:[]});
  });
});
