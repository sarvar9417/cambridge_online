import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');

describe('unified Live Challenge classroom controls',()=>{
  it('exposes the classroom settings on the canonical Live Exam creator',()=>{
    expect(page).toContain('name="allowLateJoin"');
    expect(page).toContain('name="autoCloseWhenAllSubmitted"');
    expect(page).toContain('name="teacherOverrideEnabled"');
    expect(page).toContain('name="leaderboardMode"');
  });

  it('runs new challenges through draft, selection, publish and lobby open',()=>{
    expect(page).toContain("'/live-exams/drafts'");
    expect(page).toContain('/questions/auto');
    expect(page).toContain('/publish');
    expect(page).toContain('/open');
    expect(page).toContain("draft:'Draft'");
    expect(page).toContain("published:'Nashr qilingan'");
  });

  it('gives the teacher pause/resume and lobby removal controls',()=>{
    expect(page).toContain("session.pausedAt?'/resume':'/pause'");
    expect(page).toContain('expectedVersion:session.version');
    expect(page).toContain('/participants/${studentId}/remove');
  });

  it('blocks student work and projector disclosure while paused',()=>{
    expect(page).toContain("if(session.pausedAt)return");
    expect(page).toContain("!session.pausedAt?<>");
    expect(page).toContain('CHALLENGE PAUZADA');
  });
});
