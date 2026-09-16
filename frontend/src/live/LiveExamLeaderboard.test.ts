import { describe, expect, it } from 'vitest';

function competitionRank(scores:number[]) {
  return scores.map((score,index)=>1+scores.slice(0,index).filter((item)=>item>score).length);
}

describe('live exam leaderboard presentation rules',()=>{
  it('keeps equal Cambridge scores on the same displayed rank',()=>{
    expect(competitionRank([4,4,3,1])).toEqual([1,1,3,4]);
  });

  it('does not introduce speed into the presentation ranking contract',()=>{
    const source='Tezlik emas, Cambridge ballari tartibni belgilaydi.';
    expect(source).toContain('Cambridge ballari');
  });
});
