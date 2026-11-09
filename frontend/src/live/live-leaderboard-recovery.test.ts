import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=readFileSync(resolve(process.cwd(),'src/live/LiveExamLeaderboard.tsx'),'utf8');

describe('Live leaderboard network recovery and privacy',()=>{
  it('reports failed refreshes even if a prior standings snapshot is still cached',()=>{
    expect(source).toContain("{error?<p className=\"live-leaderboard-error\" role=\"alert\">Reyting vaqtincha yangilanmayapti:");
    expect(source).toContain("if(!cancelled){setSummary(result);setError('')}");
  });

  it('refetches using the correct teacher or projector source when variant changes',()=>{
    expect(source).toContain("variant==='projector'?'?projector=true':''");
    expect(source).toContain('},[sessionId,version,variant]);');
  });
});
