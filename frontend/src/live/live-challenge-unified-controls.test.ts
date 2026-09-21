import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const builder=readFileSync(resolve(process.cwd(),'src/live/LiveChallengeBuilder.tsx'),'utf8');
const runtime=readFileSync(resolve(process.cwd(),'src/live/LiveExamRuntime.tsx'),'utf8');
const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');

describe('unified Live Challenge classroom controls',()=>{
  it('keeps classroom settings in the canonical draft builder',()=>{
    expect(builder).toContain('allowLateJoin');
    expect(builder).toContain('autoCloseWhenAllSubmitted');
    expect(builder).toContain('teacherOverrideEnabled');
    expect(builder).toContain('questionOrder');
    expect(builder).toContain('timingMode');
    expect(builder).toContain('displayNameMode');
  });

  it('keeps teacher lifecycle controls in the version-aware runtime',()=>{
    expect(runtime).toContain("act('/pause')");
    expect(runtime).toContain("act('/resume')");
    expect(runtime).toContain('expectedVersion:snapshot.session.version');
    expect(runtime).toContain("session.status==='paused'");
  });

  it('uses the modular builder/runtime page instead of restoring the interim monolith',()=>{
    expect(page).toContain('LiveChallengeBuilder');
    expect(page).toContain('LiveExamRuntime');
    expect(page).not.toContain('name="leaderboardMode"');
  });
});
