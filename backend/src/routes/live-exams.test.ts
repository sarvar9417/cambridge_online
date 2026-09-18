import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createLiveExamsRouter } from './live-exams.js';
import type { LiveExamService } from '../services/live-exam-service.js';
import type { Actor } from '../lib/actor.js';

const student:Actor = { id:'11111111-1111-4111-8111-111111111111',role:'student',schoolId:'school',fullName:'Student' };
const teacher:Actor = { id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',role:'teacher',schoolId:'school',fullName:'Teacher' };

function appFor(service:Partial<LiveExamService>, actor:Actor=student) {
  const app=express();
  app.use(express.json());
  app.use((req,_res,next)=>{req.actor=actor;next()});
  app.use('/live-exams',createLiveExamsRouter(service as LiveExamService));
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(error&&typeof error==='object'&&'issues'in error){res.status(400).json({error:{code:'validation_error'}});return}
    if(error&&typeof error==='object'&&'status'in error&&'code'in error){
      res.status(Number(error.status)).json({error:{code:String(error.code)}});return;
    }
    res.status(500).json({error:{code:'internal_error'}});
  });
  return app;
}

describe('live exam routes', () => {
  it('marks the session list private and non-cacheable', async () => {
    const list=vi.fn().mockResolvedValue([{id:'session-1',joinCode:'123456'}]);
    const response=await request(appFor({list},teacher)).get('/live-exams').expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(list).toHaveBeenCalledWith(teacher);
  });

  it('marks the per-user authoritative snapshot private and non-cacheable', async () => {
    const snapshot=vi.fn().mockResolvedValue({session:{version:3},ownAnswer:{text:'private'}});
    const response=await request(appFor({snapshot}))
      .get('/live-exams/22222222-2222-4222-8222-222222222222')
      .expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(snapshot).toHaveBeenCalledWith(student,'22222222-2222-4222-8222-222222222222');
  });

  it('keeps the board route staff-only and does not fetch a student snapshot for it', async () => {
    const snapshot=vi.fn();
    const response=await request(appFor({snapshot}))
      .get('/live-exams/22222222-2222-4222-8222-222222222222/board')
      .expect(403);
    expect(response.body.error.code).toBe('staff_only');
    expect(snapshot).not.toHaveBeenCalled();
  });

  it('returns a private learner-safe board projection to staff', async () => {
    const snapshot=vi.fn().mockResolvedValue({
      session:{
        id:'private-session-id',title:'Live Challenge',className:'AS',status:'question_open',
        currentQuestionIndex:0,questionCount:2,participantCount:5,submittedCount:2,
        reviewCount:0,reviewedCount:0,joinCode:'123456',deadline:null,serverNow:'now',
      },
      question:{
        id:'private-session-question',sourceQuestionId:'private-source-id',position:0,marks:2,
        portable:{
          sourceRef:'9618/12/M/J/25 Q1',
          leaf:{id:'private-leaf',stem:'Explain.',marks:2,commandWord:'Explain'},
          contextBlocks:[],
        },
      },
      markScheme:null,
      participants:[{fullName:'Private Learner'}],
      teacherAnswers:[{answerText:'private answer'}],
    });
    const response=await request(appFor({snapshot},teacher))
      .get('/live-exams/22222222-2222-4222-8222-222222222222/board')
      .expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(snapshot).toHaveBeenCalledWith(teacher,'22222222-2222-4222-8222-222222222222');
    expect(response.body.data.session.title).toBe('Live Challenge');
    expect(response.body.data.question.sourceRef).toBe('9618/12/M/J/25 Q1');
    expect(JSON.stringify(response.body)).not.toContain('private-session-id');
    expect(JSON.stringify(response.body)).not.toContain('private-source-id');
    expect(JSON.stringify(response.body)).not.toContain('private-leaf');
    expect(JSON.stringify(response.body)).not.toContain('Private Learner');
    expect(JSON.stringify(response.body)).not.toContain('private answer');
  });

  it('does not expose a duplicate join implementation from the generic runtime router', async () => {
    const join=vi.fn();
    await request(appFor({join})).post('/live-exams/join').send({code:'123456'}).expect(404);
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

  it('does not expose retired versionless staff creation or control fallbacks', async () => {
    const create=vi.fn();
    const start=vi.fn();
    const revealMarkScheme=vi.fn();
    const moderateAnswer=vi.fn();
    const completeMarking=vi.fn();
    const nextQuestion=vi.fn();
    const cancel=vi.fn();
    const service={create,start,revealMarkScheme,moderateAnswer,completeMarking,nextQuestion,cancel};

    await request(appFor(service,teacher)).post('/live-exams').send({}).expect(404);
    await request(appFor(service,teacher))
      .post('/live-exams/22222222-2222-4222-8222-222222222222/start').send({}).expect(404);
    await request(appFor(service,teacher))
      .post('/live-exams/22222222-2222-4222-8222-222222222222/reveal').send({}).expect(404);
    await request(appFor(service,teacher))
      .put('/live-exams/22222222-2222-4222-8222-222222222222/answers/33333333-3333-4333-8333-333333333333/moderate').send({}).expect(404);
    await request(appFor(service,teacher))
      .post('/live-exams/22222222-2222-4222-8222-222222222222/marking/complete').send({}).expect(404);
    await request(appFor(service,teacher))
      .post('/live-exams/22222222-2222-4222-8222-222222222222/next').send({}).expect(404);
    await request(appFor(service,teacher))
      .post('/live-exams/22222222-2222-4222-8222-222222222222/cancel').send({}).expect(404);

    expect(create).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(revealMarkScheme).not.toHaveBeenCalled();
    expect(moderateAnswer).not.toHaveBeenCalled();
    expect(completeMarking).not.toHaveBeenCalled();
    expect(nextQuestion).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });
});
