import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';

const source=(path:string)=>readFileSync(resolve(process.cwd(),'src',path),'utf8');
const entry=source('live/LiveExamPage.tsx');
const api=source('lib/api.ts');
const board=source('live/LiveChallengeBoard.tsx');
const student=source('live/LiveChallengeStudentLanding.tsx');
const analytics=source('live/LiveChallengeAnalyticsPanel.tsx');

describe('Live Challenge final frontend experience',()=>{
  it('routes staff projector mode to the learner-safe board instead of the private runtime snapshot',()=>{
    expect(entry).toContain("projector&&sessionId&&user.role!=='student'");
    expect(entry).toContain('<LiveChallengeBoard sessionId={sessionId}/>');
    expect(board).toContain('`/live-exams/${sessionId}/board`');
    expect(board).not.toContain('LiveExamSnapshot');
    expect(board).not.toContain('teacherAnswers');
  });

  it('uses the enrolled student feed and history as the canonical student landing',()=>{
    expect(entry).toContain("!sessionId&&user.role==='student'");
    expect(entry).toContain('<LiveChallengeStudentLanding/>');
    expect(student).toContain("'/live-exams/student-feed'");
    expect(student).toContain('feed.history');
    expect(student).toContain("'/live-exams/join'");
  });

  it('requires audited CAS teacher overrides and an explicit peer fallback reason',()=>{
    expect(api).toContain('LIVE_MODERATION_PATH');
    expect(api).toContain('expectedVersion');
    expect(api).toContain("'live_override_reason_required'");
    expect(api).toContain("'live_peer_assignment_impossible'");
    expect(api).toContain("`${snapshotKey}/marking/switch-to-teacher`");
    expect(api).toContain('askReason(');
  });

  it('exposes finished marks-first academic analytics to staff',()=>{
    expect(entry).toContain("route.params.get('analytics')");
    expect(entry).toContain('<LiveChallengeAnalyticsPanel sessionId={analyticsId}/>');
    expect(analytics).toContain('strongest');
    expect(analytics).toContain('weakest');
    expect(analytics).toContain('commonlyMissedMarkPoints');
    expect(analytics).toContain('speed va rank hisobga olinmaydi');
  });
});
