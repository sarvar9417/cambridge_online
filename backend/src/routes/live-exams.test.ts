import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createLiveExamsRouter } from './live-exams.js';
import type { LiveExamService } from '../services/live-exam-service.js';

const student = { id:'11111111-1111-4111-8111-111111111111',role:'student' as const,schoolId:'school',fullName:'Student' };
const owner = { id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',role:'owner' as const,schoolId:'school',fullName:'Owner' };

function appFor(service:Partial<LiveExamService>,actor:{id:string;role:'owner'|'teacher'|'student';schoolId:string|null;fullName:string}=student) {
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
  it('publishes the 16 genuine IGCSE Hodder book sections for student hosts', async()=>{
    const response=await request(appFor({})).get('/live-exams/sections').expect(200);
    expect(response.body.igcseBookSections.map((s:{section_code:string})=>s.section_code)).toEqual([
      '7.1','7.2','7.3','7.4','7.5','7.6','7.7','7.8','7.9',
      '8.1','8.2','8.3','9.1','10.1','10.2','10.3',
    ]);
    expect(response.body.igcseBookSections[6]).toMatchObject({
      syllabus_code:'0478',chapter_number:7,section_code:'7.7',
      section_title:'Trace tables to document dry runs of algorithms',
    });
    expect(response.body.coursebookSections.some((s:{section_code:string})=>s.section_code==='16.2')).toBe(true);
  });

  it('accepts a scoped IGCSE book section and rejects invalid or 9618-only codes',async()=>{
    const create=vi.fn().mockResolvedValue({id:'session-0478'});
    const input={
      classId:'22222222-2222-4222-8222-222222222222',
      syllabusCode:'0478',title:'IGCSE 7.7 Trace tables',topicIds:[],subtopicIds:[],
      coursebookSectionCodes:[],igcseBookSectionCodes:['7.7'],components:[2],
      questionCount:3,markingMode:'teacher',includeDiagrams:true,excludeSeen:false,
      questionOrder:'balanced',
    };
    const app=appFor({create});
    await request(app).post('/live-exams').send(input).expect(201);
    expect(create).toHaveBeenCalledWith(student,expect.objectContaining({
      syllabusCode:'0478',igcseBookSectionCodes:['7.7'],components:[2],
    }));
    await request(app).post('/live-exams').send({...input,igcseBookSectionCodes:['1.1']}).expect(400);
    await request(app).post('/live-exams').send({...input,igcseBookSectionCodes:['7.10']}).expect(400);
    expect(create).toHaveBeenCalledTimes(1);
  });

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

  it('requires a session version when staff submit an assigned teacher review', async () => {
    const submitReview=vi.fn();
    await request(appFor({submitReview},owner))
      .post('/live-exams/22222222-2222-4222-8222-222222222222/reviews/33333333-3333-4333-8333-333333333333/submit')
      .send({matchedPointIds:[],score:1})
      .expect(400);
    expect(submitReview).not.toHaveBeenCalled();
  });

  it('passes the staff review session version to the service', async () => {
    const submitReview=vi.fn().mockResolvedValue({version:9});
    await request(appFor({submitReview},owner))
      .post('/live-exams/22222222-2222-4222-8222-222222222222/reviews/33333333-3333-4333-8333-333333333333/submit')
      .send({matchedPointIds:[],score:1,expectedVersion:8})
      .expect(200);
    expect(submitReview).toHaveBeenCalledWith(
      owner,
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      {matchedPointIds:[],score:1,levelNumber:undefined,feedback:undefined},
      8,
    );
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

  it('rejects history archive without the authoritative session version', async () => {
    const archiveHistory=vi.fn();
    await request(appFor({archiveHistory}))
      .delete('/live-exams/22222222-2222-4222-8222-222222222222')
      .send({})
      .expect(400);
    expect(archiveHistory).not.toHaveBeenCalled();
  });

  it('routes terminal history deletion through the archive service', async () => {
    const archiveHistory=vi.fn().mockResolvedValue({sessionId:'22222222-2222-4222-8222-222222222222',archived:true,version:7});
    const app=appFor({archiveHistory});
    const sessionId='22222222-2222-4222-8222-222222222222';
    const response=await request(app).delete(`/live-exams/${sessionId}`).send({expectedVersion:6}).expect(200);
    expect(response.body.archived).toBe(true);
    expect(archiveHistory).toHaveBeenCalledWith(student,sessionId,6);
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
