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
  it('marks the session list private and non-cacheable', async () => {
    const list=vi.fn().mockResolvedValue([{id:'session-1',joinCode:'123456'}]);
    const response=await request(appFor({list})).get('/live-exams').expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(list).toHaveBeenCalledWith(student);
  });

  it('marks the per-user authoritative snapshot private and non-cacheable', async () => {
    const snapshot=vi.fn().mockResolvedValue({session:{version:3},ownAnswer:{text:'private'}});
    const response=await request(appFor({snapshot}))
      .get('/live-exams/22222222-2222-4222-8222-222222222222')
      .expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(snapshot).toHaveBeenCalledWith(student,'22222222-2222-4222-8222-222222222222');
  });

  it('routes projector snapshots through the privacy-scoped service view', async () => {
    const snapshot=vi.fn().mockResolvedValue({session:{version:4},participants:[],teacherAnswers:[]});
    const response=await request(appFor({snapshot}))
      .get('/live-exams/22222222-2222-4222-8222-222222222222/projector')
      .expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(snapshot).toHaveBeenCalledWith(student,'22222222-2222-4222-8222-222222222222',true);
  });

  it('allows Live sessions larger than the old 20-question ceiling', async () => {
    const create=vi.fn().mockResolvedValue({id:'session-large'});
    const questionId='33333333-3333-4333-8333-333333333333';
    const body={
      classId:'22222222-2222-4222-8222-222222222222',
      title:'Large revision set',
      topicIds:['44444444-4444-4444-8444-444444444444'],
      subtopicIds:[],
      questionCount:75,
      markingMode:'teacher',
      includeDiagrams:true,
      excludeSeen:false,
      questionIds:Array.from({length:75},()=>questionId),
      questionOrder:'fixed',
    };
    await request(appFor({create})).post('/live-exams').send(body).expect(201);
    expect(create).toHaveBeenCalledWith(student,expect.objectContaining({
      questionCount:75,
      questionIds:expect.arrayContaining([questionId]),
    }));
  });

  it('accepts a coursebook-only Chapter 16 scope without inventing an official syllabus 16.3 row', async () => {
    const create=vi.fn().mockResolvedValue({id:'session-coursebook'});
    await request(appFor({create})).post('/live-exams').send({
      classId:'22222222-2222-4222-8222-222222222222',
      title:'Chapter 16 textbook revision',
      topicIds:[],
      subtopicIds:[],
      coursebookSectionCodes:['16.2','16.3'],
      questionCount:2,
      markingMode:'teacher',
      includeDiagrams:true,
      excludeSeen:false,
      questionOrder:'shuffled',
    }).expect(201);
    expect(create).toHaveBeenCalledWith(student,expect.objectContaining({
      topicIds:[],
      subtopicIds:[],
      coursebookSectionCodes:['16.2','16.3'],
    }));
  });

  it('returns the full eligible total and availability breakdown even when only a limited preview is requested', async () => {
    const eligibleQuestions=vi.fn().mockResolvedValue({
      data:[],
      total:137,
      counts:{database:142,liveReady:140,available:137},
    });
    const response=await request(appFor({eligibleQuestions}))
      .get('/live-exams/eligible-questions')
      .query({
        classId:'22222222-2222-4222-8222-222222222222',
        topicIds:'44444444-4444-4444-8444-444444444444',
        subtopicIds:'',
        coursebookSectionCodes:'16.2,16.3',
        includeDiagrams:'true',
        excludeSeen:'false',
        limit:'137',
      })
      .expect(200);
    expect(response.body).toEqual({
      data:[],
      total:137,
      counts:{database:142,liveReady:140,available:137},
    });
    expect(eligibleQuestions).toHaveBeenCalledWith(student,expect.objectContaining({
      limit:137,
      coursebookSectionCodes:['16.2','16.3'],
    }));
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

  it('turns a database peer-integrity rejection into a recoverable conflict', async () => {
    const revealMarkScheme=vi.fn().mockRejectedValue(Object.assign(
      new Error('live_peer_assignment_impossible'),
      { code:'P0001' },
    ));
    const response=await request(appFor({revealMarkScheme}))
      .post('/live-exams/22222222-2222-4222-8222-222222222222/reveal')
      .send({expectedVersion:1})
      .expect(409);
    expect(response.body.error.code).toBe('live_peer_assignment_impossible');
  });

  it('does not disguise unrelated database errors as peer-integrity conflicts', async () => {
    const revealMarkScheme=vi.fn().mockRejectedValue(Object.assign(new Error('database exploded'),{code:'XX000'}));
    const response=await request(appFor({revealMarkScheme}))
      .post('/live-exams/22222222-2222-4222-8222-222222222222/reveal')
      .send({expectedVersion:1})
      .expect(500);
    expect(response.body.error.code).toBe('internal_error');
  });

  it('rejects stale-risk teacher score overrides without a session version', async () => {
    const moderateAnswer=vi.fn();
    await request(appFor({moderateAnswer}))
      .put('/live-exams/22222222-2222-4222-8222-222222222222/answers/33333333-3333-4333-8333-333333333333/moderate')
      .send({score:1})
      .expect(400);
    expect(moderateAnswer).not.toHaveBeenCalled();
  });

  it('rejects teacher transitions that omit the authoritative session version', async () => {
    const start=vi.fn();
    await request(appFor({start}))
      .post('/live-exams/22222222-2222-4222-8222-222222222222/start')
      .send({})
      .expect(400);
    expect(start).not.toHaveBeenCalled();
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

  it('passes optimistic state versions to every teacher transition', async () => {
    const start=vi.fn().mockResolvedValue({version:2});
    const revealMarkScheme=vi.fn().mockResolvedValue({version:3});
    const completeMarking=vi.fn().mockResolvedValue({version:4});
    const nextQuestion=vi.fn().mockResolvedValue({version:5});
    const cancel=vi.fn().mockResolvedValue({version:6});
    const app=appFor({start,revealMarkScheme,completeMarking,nextQuestion,cancel});
    const sessionId='22222222-2222-4222-8222-222222222222';
    await request(app).post(`/live-exams/${sessionId}/start`).send({expectedVersion:1}).expect(200);
    await request(app).post(`/live-exams/${sessionId}/reveal`).send({expectedVersion:2}).expect(200);
    await request(app).post(`/live-exams/${sessionId}/marking/complete`).send({force:true,expectedVersion:3}).expect(200);
    await request(app).post(`/live-exams/${sessionId}/next`).send({expectedVersion:4}).expect(200);
    await request(app).post(`/live-exams/${sessionId}/cancel`).send({expectedVersion:5}).expect(200);
    expect(start).toHaveBeenCalledWith(student,sessionId,1);
    expect(revealMarkScheme).toHaveBeenCalledWith(student,sessionId,2);
    expect(completeMarking).toHaveBeenCalledWith(student,sessionId,true,3);
    expect(nextQuestion).toHaveBeenCalledWith(student,sessionId,4);
    expect(cancel).toHaveBeenCalledWith(student,sessionId,5);
  });

  it('routes terminal history deletion through the archive service', async () => {
    const archiveHistory=vi.fn().mockResolvedValue({sessionId:'22222222-2222-4222-8222-222222222222',archived:true,version:7});
    const app=appFor({archiveHistory});
    const sessionId='22222222-2222-4222-8222-222222222222';
    const response=await request(app).delete(`/live-exams/${sessionId}`).expect(200);
    expect(response.body.archived).toBe(true);
    expect(archiveHistory).toHaveBeenCalledWith(student,sessionId);
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
