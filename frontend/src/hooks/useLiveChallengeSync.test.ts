import { describe,expect,it } from 'vitest';
import { liveChallengeRetryDelay,shouldContinueLiveChallengeEventDrain } from './useLiveChallengeSync';

describe('Live Challenge realtime recovery contract',()=>{
  it('continues draining only full event pages',()=>{
    expect(shouldContinueLiveChallengeEventDrain(100,1)).toBe(true);
    expect(shouldContinueLiveChallengeEventDrain(99,1)).toBe(false);
    expect(shouldContinueLiveChallengeEventDrain(0,1)).toBe(false);
  });

  it('bounds one poll so a large backlog cannot monopolise the client',()=>{
    expect(shouldContinueLiveChallengeEventDrain(100,4)).toBe(true);
    expect(shouldContinueLiveChallengeEventDrain(100,5)).toBe(false);
    expect(shouldContinueLiveChallengeEventDrain(100,2,2)).toBe(false);
  });

  it('backs off repeated recovery failures without retrying forever more slowly',()=>{
    expect(liveChallengeRetryDelay(900,0)).toBe(0);
    expect(liveChallengeRetryDelay(900,1)).toBe(1800);
    expect(liveChallengeRetryDelay(900,2)).toBe(3600);
    expect(liveChallengeRetryDelay(900,3)).toBe(7200);
    expect(liveChallengeRetryDelay(900,4)).toBe(14400);
    expect(liveChallengeRetryDelay(900,5)).toBe(14400);
    expect(liveChallengeRetryDelay(1000,8)).toBe(15000);
  });
});
