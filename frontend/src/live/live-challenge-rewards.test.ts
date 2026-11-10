import { describe, expect, it } from 'vitest';
import { celebrationTier, getRewardSummary, isRewardEntry } from './live-challenge-rewards';

describe('Live Challenge 2.0 non-academic reward rules',()=>{
  it('uses the four validated percentage tiers without changing numeric marks',()=>{
    expect(celebrationTier(9,10)).toBe('gold');
    expect(celebrationTier(8,10)).toBe('spark');
    expect(celebrationTier(5,10)).toBe('steady');
    expect(celebrationTier(3,10)).toBe('support');
    expect(celebrationTier(0,10)).toBe('support');
    expect(celebrationTier(11,10)).toBeNull();
    expect(celebrationTier(0,0)).toBeNull();
    expect(celebrationTier(Number.NaN,10)).toBeNull();
  });

  it('rejects impossible records, rather than inventing grades or badges',()=>{
    expect(isRewardEntry({questionIndex:0,score:0,possible:4})).toBe(true);
    expect(isRewardEntry({questionIndex:0,score:-1,possible:4})).toBe(false);
    expect(isRewardEntry({questionIndex:0,score:5,possible:4})).toBe(false);
    expect(isRewardEntry({questionIndex:-1,score:2,possible:4})).toBe(false);
    expect(isRewardEntry({questionIndex:0,score:3,possible:0})).toBe(false);
  });

  it('counts a strong-answer streak only across consecutive released questions',()=>{
    const first=getRewardSummary([
      {questionIndex:0,score:4,possible:4},
      {questionIndex:1,score:3,possible:4},
      {questionIndex:2,score:4,possible:4},
    ]);
    expect(first.streak).toBe(3);
    expect(first.badges).toContain('on-fire');
    expect(first.badges).toContain('first-perfect');

    const gap=getRewardSummary([
      {questionIndex:0,score:4,possible:4},
      {questionIndex:2,score:4,possible:4},
    ]);
    expect(gap.streak).toBe(1);
    expect(gap.badges).not.toContain('on-fire');
  });

  it('replaces teacher-corrected scores rather than counting duplicates',()=>{
    const correction=getRewardSummary([
      {questionIndex:0,score:4,possible:4},
      {questionIndex:1,score:4,possible:4},
      {questionIndex:2,score:4,possible:4},
      {questionIndex:2,score:1,possible:4},
    ]);
    expect(correction.streak).toBe(0);
    expect(correction.reviewed).toBe(3);
    expect(correction.badges).not.toContain('on-fire');
  });

  it('awards session-only badges, never bonus Cambridge marks',()=>{
    const rows=Array.from({length:5},(_,questionIndex)=>({questionIndex,score:4,possible:4}));
    const result=getRewardSummary(rows);
    expect(result.badges).toEqual(['first-perfect','on-fire','five-questions','high-flyer']);
    expect(result.reviewed).toBe(5);
    expect(result.streak).toBe(5);
    expect(rows.every(row=>row.score===4)).toBe(true);
  });
});
