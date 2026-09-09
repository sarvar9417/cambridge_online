import { describe,expect,it } from 'vitest';
import { shouldContinueLiveChallengeEventDrain } from './useLiveChallengeSync';

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
});
