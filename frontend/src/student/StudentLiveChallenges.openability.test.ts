import { describe,expect,it } from 'vitest';
import type { LiveChallengeStudentCard } from '../lib/api';
import { studentCanOpenLiveChallenge,studentCanSubmitLiveChallengeAnswer } from './StudentLiveChallenges';

const statuses:LiveChallengeStudentCard['status'][]=[
  'PUBLISHED','LOBBY','QUESTION_ACTIVE','ANSWERS_LOCKED','PEER_MARKING','ROUND_RESULTS','PAUSED',
];

describe('student Live Challenge openability',()=>{
  it('lets a joined student open every active waiting/runtime state',()=>{
    for(const status of statuses){
      expect(studentCanOpenLiveChallenge({status,participantStatus:'JOINED'})).toBe(true);
    }
  });

  it('never opens a challenge state before the student has joined',()=>{
    for(const status of statuses){
      expect(studentCanOpenLiveChallenge({status,participantStatus:null})).toBe(false);
      expect(studentCanOpenLiveChallenge({status,participantStatus:'LEFT'})).toBe(false);
      expect(studentCanOpenLiveChallenge({status,participantStatus:'REMOVED'})).toBe(false);
    }
  });
});

describe('student Live Challenge source-complete answer gating',()=>{
  it('allows an active unanswered question only when structured source content is ready',()=>{
    expect(studentCanSubmitLiveChallengeAnswer({status:'QUESTION_ACTIVE',hasAnswer:false,hasQuestion:true,structuredPresent:true,structuredReady:true})).toBe(true);
    expect(studentCanSubmitLiveChallengeAnswer({status:'QUESTION_ACTIVE',hasAnswer:false,hasQuestion:true,structuredPresent:true,structuredReady:false})).toBe(false);
  });

  it('keeps legacy fallback answerable but blocks closed or already-answered rounds',()=>{
    expect(studentCanSubmitLiveChallengeAnswer({status:'QUESTION_ACTIVE',hasAnswer:false,hasQuestion:true,structuredPresent:false,structuredReady:false})).toBe(true);
    expect(studentCanSubmitLiveChallengeAnswer({status:'ANSWERS_LOCKED',hasAnswer:false,hasQuestion:true,structuredPresent:true,structuredReady:true})).toBe(false);
    expect(studentCanSubmitLiveChallengeAnswer({status:'QUESTION_ACTIVE',hasAnswer:true,hasQuestion:true,structuredPresent:true,structuredReady:true})).toBe(false);
    expect(studentCanSubmitLiveChallengeAnswer({status:'QUESTION_ACTIVE',hasAnswer:false,hasQuestion:false,structuredPresent:false,structuredReady:false})).toBe(false);
  });
});