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
import { createLiveChallengesRouter } from './live-challenges.js';

const challengeId='11111111-1111-4111-8111-111111111111';
const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};

function appFor(options?:{
  reconcile?:ReturnType<typeof vi.fn>;
  events?:ReturnType<typeof vi.fn>;
  state?:ReturnType<typeof vi.fn>;
  submit?:ReturnType<typeof vi.fn>;
}){
  const reconcile=options?.reconcile??vi.fn().mockResolvedValue({challengeId,changed:false,status:'QUESTION_ACTIVE',stateVersion:4});
  const events=options?.events??vi.fn().mockResolvedValue({events:[],nextCursor:'0'});
  const state=options?.state??vi.fn().mockResolvedValue({id:challengeId,status:'QUESTION_ACTIVE',stateVersion:4});
  const submit=options?.submit??vi.fn().mockResolvedValue({id:'answer-1'});
  const app=express();
  app.use(express.json());
  app.use((req,_res,next)=>{req.actor=teacher;next()});
  app.use('/live-challenges',createLiveChallengesRouter(
    {} as LiveChallengeService,
    {state} as unknown as LiveChallengeSessionService,
    {events,submit} as unknown as LiveChallengeAnswerService,
    {} as LiveChallengePeerMarkingService,
    {} as LiveChallengeModerationService,
    {reconcile} as unknown as LiveChallengeTimingService,
  ));
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(error instanceof DomainError){res.status(error.status).json({error:{code:error.code}});return}
    res.status(500).json({error:{code:'internal_error'}});
  });
  return{app,reconcile,events,state,submit};
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

  it('rejects an answer if deadline reconciliation closes the round',async()=>{
    const reconcile=vi.fn().mockResolvedValue({challengeId,changed:true,status:'ANSWERS_LOCKED',stateVersion:5,reason:'timer_expired'});
    const submit=vi.fn();
    const{app}=appFor({reconcile,submit});
    const response=await request(app).post(`/live-challenges/${challengeId}/answer`).send({answerText:'Late answer',expectedStateVersion:4}).expect(409);
    expect(response.body.error.code).toBe('live_challenge_answer_closed');
    expect(submit).not.toHaveBeenCalled();
  });
});
