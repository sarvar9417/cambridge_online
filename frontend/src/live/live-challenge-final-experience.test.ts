import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';

const source=(path:string)=>readFileSync(resolve(process.cwd(),'src',path),'utf8');
const entry=source('live/LiveExamPage.tsx');
const api=source('lib/api.ts');
const runtime=source('live/LiveExamRuntime.tsx');
const board=source('live/LiveChallengeBoard.tsx');
const student=source('live/LiveChallengeStudentLanding.tsx');
const participation=source('live/LiveChallengeParticipationControls.tsx');
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

  it('makes answer lock, Mark Scheme reveal and peer fallback explicit teacher steps',()=>{
    expect(runtime).toContain("act('/answers/lock')");
    expect(runtime).toContain("act('/mark-scheme/reveal')");
    expect(runtime).toContain("act('/marking/switch-to-teacher',{reason:fallbackReason.trim()})");
    expect(runtime).toContain('Teacher marking’ga o‘tish sababi');
  });

  it('requires audited CAS teacher overrides in the visible moderation UI and API',()=>{
    expect(runtime).toContain('Override sababi');
    expect(runtime).toContain('reason:reason.trim()');
    expect(runtime).toContain('expectedVersion:snapshot.session.version');
    expect(api).toContain('LIVE_MODERATION_PATH');
    expect(api).toContain("'live_override_reason_required'");
  });

  it('exposes lobby-only leave and participant-removal controls',()=>{
    expect(entry).toContain('<LiveChallengeParticipationControls user={user} sessionId={sessionId}/>');
    expect(participation).toContain("session.status!=='lobby'");
    expect(participation).toContain("`/live-exams/${sessionId}/leave`");
    expect(participation).toContain('expectedVersion:session.version');
  });

  it('exposes finished marks-first academic analytics to staff',()=>{
    expect(entry).toContain("route.params.get('analytics')");
    expect(entry).toContain('<LiveChallengeAnalyticsPanel sessionId={analyticsId}/>');
    expect(runtime).toContain('<LiveChallengeAnalyticsPanel sessionId={session.id}/>');
    expect(analytics).toContain('strongest');
    expect(analytics).toContain('weakest');
    expect(analytics).toContain('commonlyMissedMarkPoints');
    expect(analytics).toContain('speed va rank hisobga olinmaydi');
  });
  it('reflects the teacher-override policy in the runtime instead of relying on an API rejection',()=>{
    expect(source).toContain('snapshot.session.teacherOverrideEnabled');
    expect(source).toContain('Teacher override bu challenge uchun o‘chirilgan.');
    expect(source).toContain("snapshot.session.teacherOverrideEnabled?'Audit bilan bahoni yangilash':'Override o‘chirilgan'");
  });
});
