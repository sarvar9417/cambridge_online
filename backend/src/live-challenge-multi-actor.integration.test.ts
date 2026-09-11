import express from 'express';
import request from 'supertest';
import { describe,expect,it,vi } from 'vitest';
import type { LiveChallengeService } from './services/live-challenge-service.js';
import type { LiveChallengeSessionService } from './services/live-challenge-session-service.js';
import type { LiveChallengeAnswerService } from './services/live-challenge-answer-service.js';
import type { LiveChallengePeerMarkingService } from './services/live-challenge-peer-marking-service.js';
import type { LiveChallengeModerationService } from './services/live-challenge-moderation-service.js';
import type { LiveChallengeTimingService } from './services/live-challenge-timing-service.js';
import { createLiveChallengesRouter } from './routes/live-challenges.js';

const challengeId='11111111-1111-4111-8111-111111111111';
const classId='22222222-2222-4222-8222-222222222222';
const questionId='33333333-3333-4333-8333-333333333333';
const roundId='44444444-4444-4444-8444-444444444444';
const answerA='55555555-5555-4555-8555-555555555555';
const answerB='66666666-6666-4666-8666-666666666666';
const assignmentA='77777777-7777-4777-8777-777777777777';
const assignmentB='88888888-8888-4888-8888-888888888888';
const pointId='99999999-9999-4999-8999-999999999999';
const schoolId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const teacher={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',role:'teacher' as const,schoolId,fullName:'Teacher One'};
const studentA={id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',role:'student' as const,schoolId,fullName:'Student A'};
const studentB={id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',role:'student' as const,schoolId,fullName:'Student B'};

describe('Live Challenge multi-actor release contract',()=>{
  it('keeps teacher, two students and board on one authoritative Cambridge round through peer marking and finish',async()=>{
    const joined=new Set<string>();
    const answers=new Map<string,string>();
    const marks=new Map<string,number>();
    let status='PUBLISHED';
    let stateVersion=1;
    let analyticsFinalized=false;

    const question={
      id:questionId,displayRef:'9618/12/M/J/26 Q3(a)',stemMd:'Explain the purpose of the control unit.',contextMd:'',
      commandWord:'Explain',marks:2,answerKind:'text',answerText:'',contentJson:null,contentVersion:null,assetUrls:{},
    };
    const markScheme={maxMarks:2,points:[{id:pointId,code:'A1',text:'Controls and coordinates processor operations.',marks:2}]};

    const lobby=vi.fn(async()=>({
      id:challengeId,title:'CPU Live Challenge',classId,className:'Grade 10 CS',syllabusCode:'9618',topicTitle:'Processor fundamentals',subtopicTitle:'Control unit',
      status,joinCode:'C7K9Q2',stateVersion,participantCount:joined.size,
      participants:[...joined].map(id=>({studentId:id,fullName:id===studentA.id?studentA.fullName:studentB.fullName,status:'JOINED',joinedAt:'2026-09-09T18:00:00Z',lastSeenAt:'2026-09-09T18:00:00Z'})),
    }));
    const openLobby=vi.fn(async()=>{status='LOBBY';stateVersion+=1;return{status,stateVersion}});
    const join=vi.fn(async(actor:{id:string},code:string)=>{
      expect(code).toBe('C7K9Q2');joined.add(actor.id);return{id:challengeId,title:'CPU Live Challenge',classId,className:'Grade 10 CS',status,teacherName:teacher.fullName,joinedCount:joined.size,joined:true};
    });
    const start=vi.fn(async()=>{expect(joined.size).toBe(2);status='QUESTION_ACTIVE';stateVersion+=1;return{id:challengeId,status,stateVersion,roundId,roundNumber:1}});
    const state=vi.fn(async(actor:{role:string})=>({
      id:challengeId,title:'CPU Live Challenge',classId,className:'Grade 10 CS',syllabusCode:'9618',topicTitle:'Processor fundamentals',subtopicTitle:'Control unit',
      status,stateVersion,currentQuestionPosition:1,serverNow:'2026-09-09T18:01:00Z',
      round:{id:roundId,number:1,status,startedAt:'2026-09-09T18:01:00Z',lockedAt:status==='QUESTION_ACTIVE'?null:'2026-09-09T18:02:00Z',markingStartedAt:status==='PEER_MARKING'||status==='ROUND_RESULTS'||status==='FINISHED'?'2026-09-09T18:03:00Z':null,resultsReleasedAt:status==='ROUND_RESULTS'||status==='FINISHED'?'2026-09-09T18:04:00Z':null,timeLimitSeconds:null},
      question:status==='PUBLISHED'||status==='LOBBY'?null:question,
      markScheme:actor.role==='student'&&status!=='PEER_MARKING'&&status!=='ROUND_RESULTS'&&status!=='FINISHED'?null:(status==='PEER_MARKING'||status==='ROUND_RESULTS'||status==='FINISHED'?markScheme:null),
      source:null,
    }));

    const own=vi.fn(async(actor:{id:string})=>({challengeId,status,stateVersion,roundId,roundNumber:1,roundStatus:status,answer:answers.has(actor.id)?{id:actor.id===studentA.id?answerA:answerB,text:answers.get(actor.id),submittedAt:'2026-09-09T18:01:30Z',lockedAt:status==='QUESTION_ACTIVE'?null:'2026-09-09T18:02:00Z',submissionDurationMs:30000}:null}));
    const submit=vi.fn(async(actor:{id:string},_id:string,submittedRoundId:string,text:string)=>{
      expect(status).toBe('QUESTION_ACTIVE');expect(submittedRoundId).toBe(roundId);answers.set(actor.id,text);
      return{id:actor.id===studentA.id?answerA:answerB,immutable:true,idempotent:false};
    });
    const lock=vi.fn(async()=>{expect(answers.size).toBe(2);status='ANSWERS_LOCKED';stateVersion+=1;return{id:challengeId,status,stateVersion,roundId,submissionCount:2}});
    const metrics=vi.fn(async()=>({challengeId,status,stateVersion,roundId,roundNumber:1,roundStatus:status,joinedCount:2,answerCount:answers.size,assignmentCount:status==='PEER_MARKING'?2:0,peerMarkCount:marks.size}));
    const events=vi.fn(async()=>({challengeId,stateVersion,cursor:'0',events:[]}));
    const scoreboard=vi.fn(async()=>{
      const entries=[
        {rank:1,displayName:'Student B',score:marks.get(studentA.id)??0,maxMarks:2,percentage:((marks.get(studentA.id)??0)/2)*100},
        {rank:2,displayName:'Student A',score:marks.get(studentB.id)??0,maxMarks:2,percentage:((marks.get(studentB.id)??0)/2)*100},
      ].sort((a,b)=>b.score-a.score).map((entry,index)=>({...entry,rank:index+1}));
      return{challengeId,status,stateVersion,releasedRounds:status==='ROUND_RESULTS'||status==='FINISHED'?1:0,maxMarks:2,classAveragePercentage:entries.reduce((sum,item)=>sum+item.percentage,0)/entries.length,leaderboardMode:'marks',entries};
    });

    const peerStart=vi.fn(async()=>{status='PEER_MARKING';stateVersion+=1;return{id:challengeId,status,stateVersion,roundId,assignmentCount:2,teacherModerationRequired:false}});
    const assignment=vi.fn(async(actor:{id:string})=>{
      const isA=actor.id===studentA.id;
      return{challengeId,status,stateVersion,roundId,roundNumber:1,assignment:{
        id:isA?assignmentA:assignmentB,status:marks.has(actor.id)?'SUBMITTED':'ASSIGNED',questionRef:question.displayRef,
        answerText:answers.get(isA?studentB.id:studentA.id),maxMarks:2,markScheme,
        submittedMark:marks.has(actor.id)?{awardedMarks:marks.get(actor.id),markPointIds:[pointId],feedbackText:null,submittedAt:'2026-09-09T18:03:30Z'}:null,
      }};
    });
    const peerSubmit=vi.fn(async(actor:{id:string},_id:string,input:{peerAssignmentId:string;awardedMarks:number})=>{
      expect(input.peerAssignmentId).toBe(actor.id===studentA.id?assignmentA:assignmentB);
      marks.set(actor.id,input.awardedMarks);
      return{peerAssignmentId:input.peerAssignmentId,awardedMarks:input.awardedMarks,immutable:true,idempotent:false};
    });
    const release=vi.fn(async()=>{expect(marks.size).toBe(2);status='ROUND_RESULTS';stateVersion+=1;return{id:challengeId,status,stateVersion,roundId,markCount:2,overrideCount:0,resolvedCount:2,masteryApplied:true}});
    const advance=vi.fn(async()=>{status='FINISHED';stateVersion+=1;return{id:challengeId,status,stateVersion,roundNumber:1,finished:true}});
    const finalizeAnalytics=vi.fn(async()=>{analyticsFinalized=true;return{challengeId,recorded:true,masteryRows:0,releasedRounds:1}});
    const studentResult=vi.fn(async(actor:{id:string})=>{
      const score=actor.id===studentA.id?(marks.get(studentB.id)??0):(marks.get(studentA.id)??0);
      return{challengeId,status:'FINISHED',studentId:actor.id,totalScore:score,totalMax:2,percentage:score/2*100,rounds:[{roundNumber:1,questionRef:question.displayRef,score,maxMarks:2}]};
    });
    const reconcile=vi.fn(async()=>({challengeId,changed:false,status,stateVersion}));

    const app=express();
    app.use(express.json());
    app.use((req,_res,next)=>{
      const actor=req.get('x-test-actor');
      req.actor=actor==='a'?studentA:actor==='b'?studentB:teacher;
      next();
    });
    app.use('/live-challenges',createLiveChallengesRouter(
      {} as unknown as LiveChallengeService,
      {lobby,openLobby,join,start,state} as unknown as LiveChallengeSessionService,
      {own,submit,lock,metrics,events,scoreboard} as unknown as LiveChallengeAnswerService,
      {start:peerStart,assignment,submit:peerSubmit,release,advance} as unknown as LiveChallengePeerMarkingService,
      {finalizeAnalytics,studentResult} as unknown as LiveChallengeModerationService,
      {reconcile} as unknown as LiveChallengeTimingService,
    ));

    await request(app).post(`/live-challenges/${challengeId}/lobby/open`).send({expectedStateVersion:1}).expect(200);
    await request(app).post('/live-challenges/join').set('x-test-actor','a').send({code:'C7K9Q2'}).expect(200);
    await request(app).post('/live-challenges/join').set('x-test-actor','b').send({code:'C7K9Q2'}).expect(200);
    const waiting=await request(app).get(`/live-challenges/${challengeId}/lobby`).expect(200);
    expect(waiting.body.data.participantCount).toBe(2);

    await request(app).post(`/live-challenges/${challengeId}/start`).send({expectedStateVersion:2}).expect(200);
    const teacherState=await request(app).get(`/live-challenges/${challengeId}/state`).expect(200);
    const aState=await request(app).get(`/live-challenges/${challengeId}/state`).set('x-test-actor','a').expect(200);
    const board=await request(app).get(`/live-challenges/${challengeId}/board`).expect(200);
    expect(teacherState.body.data.question.id).toBe(questionId);
    expect(aState.body.data.question.id).toBe(questionId);
    expect(board.body.data.question.id).toBe(questionId);
    expect(aState.body.data.markScheme).toBeNull();
    expect(JSON.stringify(board.body.data)).not.toContain('answerText');

    await request(app).post(`/live-challenges/${challengeId}/answer`).set('x-test-actor','a').send({roundId,answerText:'The CU controls processor operations.',expectedStateVersion:3}).expect(201);
    await request(app).post(`/live-challenges/${challengeId}/answer`).set('x-test-actor','b').send({roundId,answerText:'It coordinates the CPU components.',expectedStateVersion:3}).expect(201);
    await request(app).post(`/live-challenges/${challengeId}/answers/lock`).send({expectedStateVersion:3}).expect(200);

    await request(app).post(`/live-challenges/${challengeId}/peer-marking/start`).send({expectedStateVersion:4}).expect(200);
    const aAssignment=await request(app).get(`/live-challenges/${challengeId}/peer-marking/assignment`).set('x-test-actor','a').expect(200);
    const bAssignment=await request(app).get(`/live-challenges/${challengeId}/peer-marking/assignment`).set('x-test-actor','b').expect(200);
    expect(aAssignment.body.data.assignment.answerText).toBe('It coordinates the CPU components.');
    expect(bAssignment.body.data.assignment.answerText).toBe('The CU controls processor operations.');
    expect(aAssignment.body.data.assignment.markScheme.points[0].id).toBe(pointId);
    expect(JSON.stringify(aAssignment.body.data)).not.toContain(studentB.id);
    expect(JSON.stringify(bAssignment.body.data)).not.toContain(studentA.id);

    await request(app).post(`/live-challenges/${challengeId}/peer-marking/submit`).set('x-test-actor','a').send({peerAssignmentId:assignmentA,awardedMarks:1,markPointIds:[pointId],feedbackText:null}).expect(201);
    await request(app).post(`/live-challenges/${challengeId}/peer-marking/submit`).set('x-test-actor','b').send({peerAssignmentId:assignmentB,awardedMarks:2,markPointIds:[pointId],feedbackText:null}).expect(201);
    await request(app).post(`/live-challenges/${challengeId}/peer-marking/release`).send({expectedStateVersion:5}).expect(200);

    const releasedBoard=await request(app).get(`/live-challenges/${challengeId}/board`).expect(200);
    expect(releasedBoard.body.data.scoreboard).toBeTruthy();
    expect(releasedBoard.body.data.scoreboard.entries).toMatchObject([
      {rank:1,displayName:'Student A',score:2,maxMarks:2,percentage:100},
      {rank:2,displayName:'Student B',score:1,maxMarks:2,percentage:50},
    ]);
    expect(releasedBoard.body.data.scoreboard.scoreDistribution).toEqual([
      {band:'0-24',count:0},{band:'25-49',count:0},{band:'50-74',count:1},{band:'75-100',count:1},
    ]);
    expect(releasedBoard.body.data.status).toBe('ROUND_RESULTS');

    const finished=await request(app).post(`/live-challenges/${challengeId}/next`).send({expectedStateVersion:6}).expect(200);
    expect(finished.body.data.finished).toBe(true);
    expect(analyticsFinalized).toBe(true);

    const aResult=await request(app).get(`/live-challenges/${challengeId}/result`).set('x-test-actor','a').expect(200);
    expect(aResult.body.data).toMatchObject({status:'FINISHED',studentId:studentA.id,totalScore:2,totalMax:2,percentage:100});

    expect(join).toHaveBeenCalledTimes(2);
    expect(start).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledTimes(2);
    expect(lock).toHaveBeenCalledOnce();
    expect(peerStart).toHaveBeenCalledOnce();
    expect(peerSubmit).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledOnce();
    expect(advance).toHaveBeenCalledOnce();
    expect(finalizeAnalytics).toHaveBeenCalledOnce();
  });
});
