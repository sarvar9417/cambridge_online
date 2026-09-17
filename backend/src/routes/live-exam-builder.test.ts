import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createLiveExamBuilderRouter } from './live-exam-builder.js';
import type { LiveExamBuilderService } from '../services/live-exam-builder-service.js';

const teacher = { id:'11111111-1111-4111-8111-111111111111',role:'teacher' as const,schoolId:'school',fullName:'Teacher' };

function appFor(service:Partial<LiveExamBuilderService>) {
  const app=express();
  app.use(express.json());
  app.use((req,_res,next)=>{req.actor=teacher;next()});
  app.use('/live-exams',createLiveExamBuilderRouter(service as LiveExamBuilderService));
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(error&&typeof error==='object'&&'issues'in error){res.status(400).json({error:{code:'validation_error'}});return}
    if(error&&typeof error==='object'&&'status'in error&&'code'in error){
      res.status(Number(error.status)).json({error:{code:String(error.code)}});return;
    }
    res.status(500).json({error:{code:'internal_error'}});
  });
  return app;
}

describe('live exam builder routes', () => {
  it('returns builder options privately without cache', async () => {
    const builderOptions=vi.fn().mockResolvedValue({syllabi:[],topics:[],classes:[]});
    const response=await request(appFor({builderOptions})).get('/live-exams/builder-options').expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(builderOptions).toHaveBeenCalledWith(teacher,undefined);
  });

  it('validates eligible-question taxonomy ids before calling the service', async () => {
    const eligibleQuestions=vi.fn();
    await request(appFor({eligibleQuestions}))
      .get('/live-exams/eligible-questions?syllabusId=not-a-uuid')
      .expect(400);
    expect(eligibleQuestions).not.toHaveBeenCalled();
  });

  it('forwards a bounded eligible-question request and disables caching', async () => {
    const eligibleQuestions=vi.fn().mockResolvedValue([{id:'q1'}]);
    const syllabusId='33333333-3333-4333-8333-333333333333';
    const topicId='44444444-4444-4444-8444-444444444444';
    const response=await request(appFor({eligibleQuestions}))
      .get(`/live-exams/eligible-questions?syllabusId=${syllabusId}&topicId=${topicId}&limit=25`)
      .expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(eligibleQuestions).toHaveBeenCalledWith(teacher,{
      syllabusId,topicId,limit:25,
    });
  });
});
