import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const api=readFileSync(resolve(process.cwd(),'src','lib','api.ts'),'utf8');
const runtime=readFileSync(resolve(process.cwd(),'src','live','LiveExamRuntime.tsx'),'utf8');

describe('Live Challenge frontend state-machine cutover',()=>{
  it('attaches cached authoritative versions to teacher state transitions',()=>{
    expect(api).toContain('LIVE_CONTROL_PATH');
    expect(api).toContain('expectedVersion:cached.version');
    expect(api).toContain('liveSnapshotCache.delete(snapshotKey)');
  });

  it('keeps answer lock separate from Mark Scheme reveal even when one teacher button drives both',()=>{
    expect(api).toContain("`${snapshotKey}/answers/lock`");
    expect(api).toContain("`${snapshotKey}/mark-scheme/reveal`");
    expect(api).toContain("status==='question_open'");
  });

  it('requires reasoned CAS teacher override and explicit peer recovery',()=>{
    expect(api).toContain('LIVE_MODERATION_PATH');
    expect(api).toContain("'live_override_reason_required'");
    expect(api).toContain("'live_peer_assignment_impossible'");
    expect(api).toContain("`${snapshotKey}/marking/switch-to-teacher`");
  });

  it('surfaces the converged lifecycle and pause controls in the classroom UI',()=>{
    expect(api).toContain("'answers_locked'");
    expect(api).toContain("'paused'");
    expect(runtime).toContain("session.status==='answers_locked'");
    expect(runtime).toContain("session.status==='paused'");
    expect(runtime).toContain("act('/pause')");
    expect(runtime).toContain("act('/resume')");
    expect(runtime).toContain("act('/open-room')");
  });
});
