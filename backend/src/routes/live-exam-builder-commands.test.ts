import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createLiveExamBuilderCommandsRouter } from './live-exam-builder-commands.js';
import type { LiveExamBuilderCommandService } from '../services/live-exam-builder-command-service.js';

const teacher={id:'11111111-1111-4111-8111-111111111111',role:'teacher' as const,schoolId:'school',fullName:'Teacher'};
const sessionId='22222222-2222-4222-8222-222222222222';

function appFor(service:Partial<LiveExamBuilderCommandService>){
  const app=express();app.use(express.json());
  app.use((req,_res,next)=>{req.actor=teacher;next()});
  app.use('/live-exams',createLiveExamBuilderCommandsRouter(service as LiveExamBuilderCommandService));
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(error&&typeof error==='object'&&'issues'in error){res.status(400).json({error:{code:'validation_error'}});return}
    if(error&&typeof error==='object'&&'status'in error&&'code'in error){res.status(Number(error.status)).json({error:{code:String(error.code)}});return}
    res.status(500).json({error:{code:'internal_error'}});
  });
  return app;
}

describe('live exam builder command routes',()=>{
  it('creates a canonical live-exam draft',async()=>{
    const createDraft=vi.fn().mockResolvedValue({id:sessionId,status:'draft'});
    const classId='33333333-3333-4333-8333-333333333333';
    const syllabusId='44444444-4444-4444-8444-444444444444';
    const response=await request(appFor({createDraft})).post('/live-exams/drafts').send({
      classId,title:'Chapter 2 challenge',syllabusId,markingMode:'peer',
    }).expect(201);
    expect(response.body.data.status).toBe('draft');
    expect(createDraft).toHaveBeenCalledWith(teacher,expect.objectContaining({classId,syllabusId,markingMode:'peer'}));
  });

  it('keeps builder state private and non-cacheable',async()=>{
    const builderState=vi.fn().mockResolvedValue({id:sessionId,status:'draft',questions:[]});
    const response=await request(appFor({builderState})).get(`/live-exams/${sessionId}/builder`).expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
  });

  it('validates manual question ids before replacement',async()=>{
    const replaceQuestions=vi.fn();
    await request(appFor({replaceQuestions})).put(`/live-exams/${sessionId}/questions`)
      .send({questionIds:['not-a-uuid']}).expect(400);
    expect(replaceQuestions).not.toHaveBeenCalled();
  });

  it('publishes and opens the lobby through separate transitions',async()=>{
    const publish=vi.fn().mockResolvedValue({sessionId,status:'published'});
    const openLobby=vi.fn().mockResolvedValue({sessionId,status:'lobby'});
    await request(appFor({publish})).post(`/live-exams/${sessionId}/publish`).expect(200);
    await request(appFor({openLobby})).post(`/live-exams/${sessionId}/lobby/open`).expect(200);
    expect(publish).toHaveBeenCalledWith(teacher,sessionId);
    expect(openLobby).toHaveBeenCalledWith(teacher,sessionId);
  });
});
