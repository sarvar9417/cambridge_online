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

  it('lets the teacher correct scores from the review screen before advancing',()=>{
    expect(page).toContain('BAHONI TUZATISH');
    expect(page).toContain("session.markingMode==='teacher'||session.settings.teacherOverrideEnabled");
    expect(page).toContain('TeacherAnswerMarker');
    expect(page).toContain('/answers/${answer.id}/moderate');
    expect(page).toContain('expectedVersion:snapshot.session.version');
  });

  it('uses the same diagram and seen-question filters in manual pool discovery and room creation',()=>{
    expect(page).toContain('includeDiagrams:String(includeDiagrams)');
    expect(page).toContain('excludeSeen:String(excludeSeen)');
    expect(page).toContain('markingMode:data.get(\'markingMode\'),includeDiagrams,excludeSeen');
    expect(page).toContain('setIncludeDiagrams(event.target.checked);setQuestionPool([]);setSelectedQuestionIds([])');
    expect(page).toContain('setExcludeSeen(event.target.checked);setQuestionPool([]);setSelectedQuestionIds([])');
  });
});
