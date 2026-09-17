import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const api=readFileSync(resolve(process.cwd(),'src','lib','api.ts'),'utf8');
const page=readFileSync(resolve(process.cwd(),'src','live','LiveExamPage.tsx'),'utf8');

describe('Live Challenge frontend state-machine cutover',()=>{
  it('attaches cached authoritative versions to teacher state transitions',()=>{
    expect(api).toContain('LIVE_CONTROL_PATH');
    expect(api).toContain('expectedVersion:cached.version');
    expect(api).toContain('liveSnapshotCache.delete(snapshotKey)');
  });

  it('keeps answer lock separate from Mark Scheme reveal even when one teacher button drives both',()=>{
    expect(api).toContain("`${snapshotKey}/answers/lock`");
    expect(api).toContain("`${snapshotKey}/mark-scheme/reveal`");
    expect(api).toContain("if(status==='question_open')");
  });

  it('surfaces the converged lifecycle and pause controls in the classroom UI',()=>{
    expect(api).toContain("'answers_locked'");
    expect(api).toContain("'paused'");
    expect(page).toContain("session.status==='answers_locked'");
    expect(page).toContain("session.status==='paused'");
    expect(page).toContain("act('/pause')");
    expect(page).toContain("act('/resume')");
    expect(page).toContain("act('/open-room')");
  });
});
