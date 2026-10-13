import { describe, expect, it } from 'vitest';
import {
  moveLiveQuestionTimeOverride,
  serializeLiveQuestionTimeOverrides,
  setLiveQuestionTimeOverride,
} from './live-question-timing';

describe('Live question timing profiles',()=>{
  it('adds, clears and keeps explicit unlimited timing',()=>{
    const first=setLiveQuestionTimeOverride({},'q1',120);
    expect(first).toEqual({q1:120});
    expect(setLiveQuestionTimeOverride(first,'q2',null)).toEqual({q1:120,q2:null});
    expect(setLiveQuestionTimeOverride(first,'q1',undefined)).toEqual({});
  });

  it('serializes only selected valid question overrides',()=>{
    expect(serializeLiveQuestionTimeOverrides(
      ['q1','q2'],
      {q1:60,q2:null,q3:120,q4:10},
    )).toEqual({q1:60,q2:null});
  });

  it('moves timing with a replaced manual question',()=>{
    expect(moveLiveQuestionTimeOverride({old:180,other:null},'old','new'))
      .toEqual({new:180,other:null});
  });
});
