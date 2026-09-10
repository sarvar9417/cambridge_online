import express from 'express';
import request from 'supertest';
import { describe,expect,it,vi } from 'vitest';
import { DomainError } from '../services/assignments-service.js';
import type { LiveChallengeService } from '../services/live-challenge-service.js';
import type { LiveChallengeSessionService } from '../services/live-challenge-session-service.js';
import type { LiveChallengeAnswerService } from '../services/live-challenge-answer-service.js';
import type { LiveChallengePeerMarkingService } from '../services/live-challenge-peer-marking-service.js';
import type { LiveChallengeModerationService } from '../services/live-challenge-moderation-service.js';
import type { LiveChallengeTimingService } from '../services/live-challenge-timing-service.js';
import { createLiveChallengesRouter,withLiveChallengeScoreDistribution } from './live-challenges.js';

const challengeId='11111111-1111-4111-8111-111111111111';
const roundId='22222222-2222-4222-8222-222222222222';
const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};

function appFor(options?:{
  reconcile?:ReturnType<typeof vi.fn>;
  events?:ReturnType<typeof vi.fn>;
  state?:ReturnType<typeof vi.fn>;
  submit?:ReturnType<typeof vi.fn>;
  scoreboard?:ReturnType<typeof vi.fn>;
  analyticsSummary?:ReturnType<typeof vi.fn>;
}){
  const reconcile=options?.reconcile??vi.fn().mockResolvedValue({challengeId,changed:false,status:'QUESTION_ACTIVE',stateVersion:4});
  const events=options?.events??vi.fn().mockResolvedValue({events:[],nextCursor:'0'});
  const state=options?.state??vi.fn().mockResolvedValue({id:challengeId,status:'QUESTION_ACTIVE',stateVersion:4});
  const submit=options?.submit??vi.fn().mockResolvedValue({id:'answer-1',idempotent:false});
  const scoreboard=options?.scoreboard??vi.fn().mockResolvedValue({
    challengeId,status:'ROUND_RESULTS',stateVersion:4,releasedRounds:1,maxMarks:4,classAveragePercentage:50,
    entries:[{rank:1,displayName:'Student 1',score:2,maxMarks:4,percentage:50}],
  });
  const analyticsSummary=options?.analyticsSummary??vi.fn().mockResolvedValue({
    challengeId,status:'ROUND_RESULTS',stateVersion:4,releasedRounds:1,classAveragePercentage:50,
    questions:[],learningObjectives:[],strongestLearningObjectives:[],weakestLearningObjectives:[],missedMarkPoints:[],
  });
  const app=express();
  app.use(express.json());
  app.use((req,_res,next)=>{req.actor=teacher;next()});
  app.use('/live-challenges',createLiveChallengesRouter(
    {} as unknown as LiveChallengeService,
    {state} as unknown as LiveChallengeSessionService,
    {events,submit,scoreboard} as unknown as LiveChallengeAnswerService,
    {} as unknown as LiveChallengePeerMarkingService,
    {analyticsSummary} as unknown as LiveChallengeModerationService,
    {reconcile} as unknown as LiveChallengeTimingService,
  ));
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(error instanceof DomainError){res.status(error.status).json({error:{code:error.code}});return}
    res.status(500).json({error:{code:'internal_error'}});
  });
  return{app,reconcile,events,state,submit,scoreboard,analyticsSummary};
}

describe('Live Challenge route timing contract',()=>{
  it('keeps high-frequency event polling free of deadline reconciliation transactions',async()=>{
    const{app,reconcile,events}=appFor();
    await request(app).get(`/live-challenges/${challengeId}/events?after=0`).expect(200);
    expect(events).toHaveBeenCalledWith(teacher,challengeId,'0');
    expect(reconcile).not.toHaveBeenCalled();
  });

  it('reconciles the persistent deadline before returning current state',async()=>{
    const{app,reconcile,state}=appFor();
    await request(app).get(`/live-challenges/${challengeId}/state`).expect(200);
    expect(reconcile).toHaveBeenCalledWith(teacher,challengeId);
    expect(reconcile.mock.invocationCallOrder[0]).toBeLessThan(state.mock.invocationCallOrder[0]!);
  });

  it('still delegates an answer retry after reconciliation closes the round so the service can return the immutable original',async()=>{
    const reconcile=vi.fn().mockResolvedValue({challengeId,changed:true,status:'ANSWERS_LOCKED',stateVersion:5,reason:'timer_expired'});
    const submit=vi.fn().mockResolvedValue({id:'answer-1',idempotent:true});
    const{app}=appFor({reconcile,submit});
    await request(app).post(`/live-challenges/${challengeId}/answer`).send({roundId,answerText:'Late answer',expectedStateVersion:4}).expect(200);
    expect(reconcile).toHaveBeenCalledWith(teacher,challengeId);
    expect(submit).toHaveBeenCalledWith(teacher,challengeId,roundId,'Late answer',4);
  });
});

describe('Live Challenge results insight contract',()=>{
  it('builds a bounded class score distribution without exposing extra student identity',()=>{
    const result=withLiveChallengeScoreDistribution({entries:[
      {percentage:0},{percentage:24.9},{percentage:25},{percentage:49.9},
      {percentage:50},{percentage:74.9},{percentage:75},{percentage:100},
    ]});
    expect(result.scoreDistribution).toEqual([
      {band:'0-24',count:2},
      {band:'25-49',count:2},
      {band:'50-74',count:2},
      {band:'75-100',count:2},
    ]);
  });

  it('adds score distribution to the staff scoreboard response',async()=>{
    const scoreboard=vi.fn().mockResolvedValue({
      challengeId,status:'ROUND_RESULTS',stateVersion:8,releasedRounds:2,maxMarks:10,classAveragePercentage:50,
      entries:[
        {rank:1,displayName:'Student 1',score:9,maxMarks:10,percentage:90},
        {rank:2,displayName:'Student 2',score:6,maxMarks:10,percentage:60},
        {rank:3,displayName:'Student 3',score:4,maxMarks:10,percentage:40},
        {rank:4,displayName:'Student 4',score:2,maxMarks:10,percentage:20},
      ],
    });
    const{app}=appFor({scoreboard});
    const response=await request(app).get(`/live-challenges/${challengeId}/scoreboard`).expect(200);
    expect(response.body.data.scoreDistribution).toEqual([
      {band:'0-24',count:1},
      {band:'25-49',count:1},
      {band:'50-74',count:1},
      {band:'75-100',count:1},
    ]);
    expect(scoreboard).toHaveBeenCalledWith(teacher,challengeId);
  });

  it('routes teacher learning analytics without adding board or timing side effects',async()=>{
    const analyticsSummary=vi.fn().mockResolvedValue({
      challengeId,status:'FINISHED',stateVersion:22,releasedRounds:3,classAveragePercentage:68.4,
      questions:[{roundId:'r1',roundNumber:1,questionRef:'Q1',averagePercentage:70}],
      learningObjectives:[],strongestLearningObjectives:[],weakestLearningObjectives:[],missedMarkPoints:[],
    });
    const{app,reconcile}=appFor({analyticsSummary});
    const response=await request(app).get(`/live-challenges/${challengeId}/analytics`).expect(200);
    expect(response.body.data).toMatchObject({challengeId,status:'FINISHED',releasedRounds:3,classAveragePercentage:68.4});
    expect(analyticsSummary).toHaveBeenCalledWith(teacher,challengeId);
    expect(reconcile).not.toHaveBeenCalled();
  });
});
