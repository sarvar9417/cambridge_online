import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createLiveExamBuilderRouter } from './live-exam-builder.js';
import type { LiveExamBuilderService } from '../services/live-exam-builder-service.js';

const teacher={
  id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  role:'teacher' as const,
  schoolId:'school',
  fullName:'Teacher',
};

function appFor(service:Partial<LiveExamBuilderService>) {
  const app=express();
  app.use(express.json());
  app.use((req,_res,next)=>{req.actor=teacher;next()});
  app.use('/live-exams',createLiveExamBuilderRouter(service as LiveExamBuilderService));
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(error&&typeof error==='object'&&'issues'in error){res.status(400).json({error:{code:'validation_error'}});return}
    res.status(500).json({error:{code:'internal_error'}});
  });
  return app;
}

describe('live exam builder routes',()=>{
  it('returns private non-cacheable builder options',async()=>{
    const builderOptions=vi.fn().mockResolvedValue({classes:[],topics:[],syllabi:[]});
    const response=await request(appFor({builderOptions}))
      .get('/live-exams/builder-options')
      .expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(builderOptions).toHaveBeenCalledWith(teacher,undefined);
  });

  it('passes an authorised syllabus filter to builder options',async()=>{
    const builderOptions=vi.fn().mockResolvedValue({});
    const syllabusId='11111111-1111-4111-8111-111111111111';
    await request(appFor({builderOptions}))
      .get(`/live-exams/builder-options?syllabusId=${syllabusId}`)
      .expect(200);
    expect(builderOptions).toHaveBeenCalledWith(teacher,syllabusId);
  });

  it('validates eligible-question taxonomy identifiers before the service',async()=>{
    const eligibleQuestions=vi.fn();
    await request(appFor({eligibleQuestions}))
      .get('/live-exams/eligible-questions?syllabusId=not-a-uuid')
      .expect(400);
    expect(eligibleQuestions).not.toHaveBeenCalled();
  });

  it('normalises the eligible-question limit and keeps the response private',async()=>{
    const eligibleQuestions=vi.fn().mockResolvedValue([{id:'question-1'}]);
    const syllabusId='11111111-1111-4111-8111-111111111111';
    const topicId='22222222-2222-4222-8222-222222222222';
    const response=await request(appFor({eligibleQuestions}))
      .get(`/live-exams/eligible-questions?syllabusId=${syllabusId}&topicId=${topicId}&limit=25`)
      .expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body.data).toEqual([{id:'question-1'}]);
    expect(eligibleQuestions).toHaveBeenCalledWith(teacher,{
      syllabusId,topicId,subtopicId:undefined,limit:25,
    });
  });
});