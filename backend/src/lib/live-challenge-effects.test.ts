import {describe,it,expect} from 'vitest';
import {DEFAULT_LIVE_EFFECTS,normalizeLiveEffects} from './live-challenge-effects.js';

describe('live classroom celebration policy',()=>{
  it('supports old sessions without a new migration',()=>{
    expect(normalizeLiveEffects(null)).toEqual(DEFAULT_LIVE_EFFECTS);
    expect(normalizeLiveEffects(undefined)).toEqual(DEFAULT_LIVE_EFFECTS);
    expect(normalizeLiveEffects('bad')).toEqual(DEFAULT_LIVE_EFFECTS);
  });
  it('rejects malformed values without enabling unrequested audio',()=>{
    expect(normalizeLiveEffects({animations:'yes',sound:'yes',intensity:'extreme',publicCelebrations:1}))
      .toEqual(DEFAULT_LIVE_EFFECTS);
  });
  it('respects an explicit teacher-wide mute, reduced animation and quiet audience',()=>{
    expect(normalizeLiveEffects({animations:false,sound:true,intensity:'calm',publicCelebrations:false}))
      .toEqual({animations:false,sound:true,intensity:'calm',publicCelebrations:false});
  });
});
