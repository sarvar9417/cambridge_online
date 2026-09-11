import { describe,expect,it } from 'vitest';
import type { LiveChallengeStudentCard } from '../lib/api';
import { studentCanOpenLiveChallenge } from './StudentLiveChallenges';

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
