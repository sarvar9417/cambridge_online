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
    if(error&&typeof error==='object'&&'status'in error&&'code'in error){
      res.status(Number(error.status)).json({error:{code:String(error.code)}});return;
    }
    res.status(500).json({error:{code:'internal_error'}});
  });
  return app;
}

describe('live exam routes', () => {
  it('creates a private draft without a room code', async () => {
    const createDraft=vi.fn().mockResolvedValue({id:'draft-1',status:'draft',joinCode:null,version:1});
    const body={
      classId:'22222222-2222-4222-8222-222222222222',
      title:'Chapter 2 practice',
      topicIds:['33333333-3333-4333-8333-333333333333'],
      subtopicIds:[],
      markingMode:'teacher',
      includeDiagrams:true,
      excludeSeen:true,
      questionOrder:'fixed',
      allowLateJoin:false,
      autoCloseWhenAllSubmitted:false,
      teacherOverrideEnabled:true,
      leaderboardMode:'marks',
    };
    const response=await request(appFor({createDraft})).post('/live-exams/drafts').send(body).expect(201);
    expect(response.body.status).toBe('draft');
    expect(createDraft).toHaveBeenCalledWith(student,body);
  });

  it('requires optimistic versions for builder mutations', async () => {
    const replaceDraftQuestions=vi.fn();
    const publishDraft=vi.fn();
    const session='22222222-2222-4222-8222-222222222222';
    const app=appFor({replaceDraftQuestions,publishDraft});
    await request(app).put(`/live-exams/${session}/questions`).send({questionIds:[]}).expect(400);
    await request(app).post(`/live-exams/${session}/publish`).send({}).expect(400);
    expect(replaceDraftQuestions).not.toHaveBeenCalled();
    expect(publishDraft).not.toHaveBeenCalled();
  });

  it('routes manual, automatic, publish and open builder actions with expectedVersion', async () => {
    const replaceDraftQuestions=vi.fn().mockResolvedValue({version:3});
    const autoSelectDraft=vi.fn().mockResolvedValue({version:4});
    const publishDraft=vi.fn().mockResolvedValue({version:5,status:'published'});
    const openPublished=vi.fn().mockResolvedValue({version:6,status:'lobby'});
    const session='22222222-2222-4222-8222-222222222222';
    const question='33333333-3333-4333-8333-333333333333';
    const app=appFor({replaceDraftQuestions,autoSelectDraft,publishDraft,openPublished});
    await request(app).put(`/live-exams/${session}/questions`).send({questionIds:[question],expectedVersion:2}).expect(200);
    await request(app).post(`/live-exams/${session}/questions/auto`).send({count:5,expectedVersion:3}).expect(200);
    await request(app).post(`/live-exams/${session}/publish`).send({expectedVersion:4}).expect(200);
    await request(app).post(`/live-exams/${session}/open`).send({expectedVersion:5}).expect(200);
    expect(replaceDraftQuestions).toHaveBeenCalledWith(student,session,[question],2);
    expect(autoSelectDraft).toHaveBeenCalledWith(student,session,5,3);
    expect(publishDraft).toHaveBeenCalledWith(student,session,4);
    expect(openPublished).toHaveBeenCalledWith(student,session,5);
  });

  it('marks builder reads private and non-cacheable', async () => {
    const draft=vi.fn().mockResolvedValue({id:'draft-1',status:'draft'});
    const response=await request(appFor({draft}))
      .get('/live-exams/22222222-2222-4222-8222-222222222222/builder')
      .expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
  });

  it('marks the session list private and non-cacheable', async () => {
    const list=vi.fn().mockResolvedValue([{id:'session-1',joinCode:'123456'}]);
    const response=await request(appFor({list})).get('/live-exams').expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(list).toHaveBeenCalledWith(student);
  });

  it('marks the board-safe projector projection private and non-cacheable', async () => {
    const board=vi.fn().mockResolvedValue({session:{id:'session-1'},question:null,markScheme:null});
    const session='22222222-2222-4222-8222-222222222222';
    const response=await request(appFor({board})).get(`/live-exams/${session}/board`).expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body.data.session.id).toBe('session-1');
    expect(board).toHaveBeenCalledWith(student,session);
  });

  it('marks the per-user authoritative snapshot private and non-cacheable', async () => {
    const snapshot=vi.fn().mockResolvedValue({session:{version:3},ownAnswer:{text:'private'}});
    const response=await request(appFor({snapshot}))
      .get('/live-exams/22222222-2222-4222-8222-222222222222')
      .expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(snapshot).toHaveBeenCalledWith(student,'22222222-2222-4222-8222-222222222222');
  });

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

  it('requires and passes optimistic versions for answer lock and reveal', async () => {
    const lockAnswers=vi.fn().mockResolvedValue({status:'answers_locked',version:8});
    const revealMarkScheme=vi.fn().mockResolvedValue({status:'marking',version:9});
    const app=appFor({lockAnswers,revealMarkScheme});
    const session='22222222-2222-4222-8222-222222222222';
    await request(app).post(`/live-exams/${session}/lock`).send({}).expect(400);
    await request(app).post(`/live-exams/${session}/reveal`).send({}).expect(400);
    await request(app).post(`/live-exams/${session}/lock`).send({expectedVersion:7}).expect(200);
    await request(app).post(`/live-exams/${session}/reveal`).send({expectedVersion:8}).expect(200);
    expect(lockAnswers).toHaveBeenCalledWith(student,session,7);
    expect(revealMarkScheme).toHaveBeenCalledWith(student,session,8);
  });

  it('turns a database peer-integrity rejection into a recoverable conflict', async () => {
    const revealMarkScheme=vi.fn().mockRejectedValue(Object.assign(
      new Error('live_peer_assignment_impossible'),
      { code:'P0001' },
    ));
    const response=await request(appFor({revealMarkScheme}))
      .post('/live-exams/22222222-2222-4222-8222-222222222222/reveal')
      .send({expectedVersion:7})
      .expect(409);
    expect(response.body.error.code).toBe('live_peer_assignment_impossible');
  });

  it('does not disguise unrelated database errors as peer-integrity conflicts', async () => {
    const revealMarkScheme=vi.fn().mockRejectedValue(Object.assign(new Error('database exploded'),{code:'XX000'}));
    const response=await request(appFor({revealMarkScheme}))
      .post('/live-exams/22222222-2222-4222-8222-222222222222/reveal')
      .send({expectedVersion:7})
      .expect(500);
    expect(response.body.error.code).toBe('internal_error');
  });

  it('passes optimistic state versions to pause and resume controls', async () => {
    const pause=vi.fn().mockResolvedValue({paused:true,version:8});
    const resume=vi.fn().mockResolvedValue({paused:false,version:9});
    const app=appFor({pause,resume});
    await request(app).post('/live-exams/22222222-2222-4222-8222-222222222222/pause')
      .send({expectedVersion:7}).expect(200);
    await request(app).post('/live-exams/22222222-2222-4222-8222-222222222222/resume')
      .send({expectedVersion:8}).expect(200);
    expect(pause).toHaveBeenCalledWith(student,'22222222-2222-4222-8222-222222222222',7);
    expect(resume).toHaveBeenCalledWith(student,'22222222-2222-4222-8222-222222222222',8);
  });

  it('requires versions on teacher classroom state transitions', async () => {
    const start=vi.fn().mockResolvedValue({version:3});
    const completeMarking=vi.fn().mockResolvedValue({version:4});
    const nextQuestion=vi.fn().mockResolvedValue({version:5});
    const cancel=vi.fn().mockResolvedValue({version:6});
    const session='22222222-2222-4222-8222-222222222222';
    const app=appFor({start,completeMarking,nextQuestion,cancel});
    await request(app).post(`/live-exams/${session}/start`).send({}).expect(400);
    await request(app).post(`/live-exams/${session}/start`).send({expectedVersion:2}).expect(200);
    await request(app).post(`/live-exams/${session}/marking/complete`).send({force:true,expectedVersion:3}).expect(200);
    await request(app).post(`/live-exams/${session}/next`).send({expectedVersion:4}).expect(200);
    await request(app).post(`/live-exams/${session}/cancel`).send({expectedVersion:5}).expect(200);
    expect(start).toHaveBeenCalledWith(student,session,2);
    expect(completeMarking).toHaveBeenCalledWith(student,session,true,3);
    expect(nextQuestion).toHaveBeenCalledWith(student,session,4);
    expect(cancel).toHaveBeenCalledWith(student,session,5);
  });

  it('routes lobby removal and voluntary leave separately', async () => {
    const removeParticipant=vi.fn().mockResolvedValue({version:3});
    const leave=vi.fn().mockResolvedValue({version:4});
    const app=appFor({removeParticipant,leave});
    await request(app).post('/live-exams/22222222-2222-4222-8222-222222222222/participants/33333333-3333-4333-8333-333333333333/remove')
      .send({expectedVersion:2}).expect(200);
    await request(app).post('/live-exams/22222222-2222-4222-8222-222222222222/leave').expect(200);
    expect(removeParticipant).toHaveBeenCalledWith(
      student,'22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',2,
    );
    expect(leave).toHaveBeenCalledWith(student,'22222222-2222-4222-8222-222222222222');
  });
});
