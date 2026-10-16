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
    expect(page).toContain('name="peerCalibrationPercent"');
    expect(page).toContain('name="peerDisagreementThreshold"');
  });

  it('surfaces opt-in peer calibration and disagreement quality review',()=>{
    expect(page).toContain('Teacher calibration');
    expect(page).toContain('PEER QUALITY');
    expect(page).toContain('snapshot.peerQualityQueue');
    expect(page).toContain("answer.reviewPurpose==='calibration'");
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
    expect(page).toContain('levelNumber,expectedVersion:snapshot.session.version');
  });

  it('never submits peer/self reviews as if the teacher were the assigned reviewer',()=>{
    expect(page).toContain("answer.reviewKind==='teacher'");
    expect(page).toContain("const canOverride=snapshot.session.markingMode==='teacher'||snapshot.session.settings.teacherOverrideEnabled");
    expect(page).toContain("teacherOwnsReview?'Bahoni tasdiqlash':canOverride?'Bahoni yangilash':'Teacher override o‘chirilgan'");
  });

  it('uses the same diagram and seen-question filters in manual pool discovery and room creation',()=>{
    expect(page).toContain('includeDiagrams:String(includeDiagrams)');
    expect(page).toContain('excludeSeen:String(excludeSeen)');
    expect(page).toContain("markingMode:user.role==='student'?(practiceMode==='group'?'peer':'self'):rehearsalMode?'teacher':data.get('markingMode'),includeDiagrams,excludeSeen");
    expect(page).toContain('setIncludeDiagrams(event.target.checked);clearManualPool()');
    expect(page).toContain('setExcludeSeen(event.target.checked);clearManualPool()');
  });

  it('submits learner practice settings that agree with hidden staff-only controls',()=>{
    expect(page).toContain("displayNameMode:user.role==='student'?'anonymous_alias':data.get('displayNameMode')");
    expect(page).toContain("markingMode:user.role==='student'?(practiceMode==='group'?'peer':'self'):rehearsalMode?'teacher':data.get('markingMode')");
    expect(page).toContain("peerCalibrationPercent:user.role==='student'||rehearsalMode?0:Number(data.get('peerCalibrationPercent')??0)");
    expect(page).toContain("teacherOverrideEnabled:user.role!=='student'&&data.get('teacherOverrideEnabled')==='on'");
    expect(page).toContain("practiceMode:user.role==='student'?practiceMode:undefined");
  });

  it('keeps rehearsal a staff-only non-participatory builder mode',()=>{
    expect(page).toContain('name="rehearsalMode"');
    expect(page).toContain("rehearsalMode:user.role!=='student'&&rehearsalMode");
    expect(page).toContain('Rehearsal / Demo — o‘quvchisiz sinab ko‘rish');
    expect(page).toContain('session.settings.rehearsalMode');
    expect(page).toContain('live-rehearsal-card');
    expect(page).toContain("!rehearsal&&['question_open','marking','review'].includes(session.status)");
  });

  it('invalidates stale manual pools, pages the source-ready pool, and reuses create idempotency on retry',()=>{
    expect(page).toContain('setQuestionPool([]);setSelectedQuestionIds([]);setSelectionPreview(null)');
    expect(page).toContain('const [eligibleTotal,setEligibleTotal]=useState<number|null>(null)');
    expect(page).toContain('const [poolTotal,setPoolTotal]=useState<number|null>(null)');
    expect(page).toContain('const pageSize=20');
    expect(page).toContain('offset:String(Math.max(0,offset))');
    expect(page).not.toContain('if(current.length>=20)return current');
    expect(page).not.toContain('selectedQuestionIds.length}/20 ta savol');
    expect(page).toContain("const createAttempt=useRef<{body:string;key:string}|null>(null)");
    expect(page).toContain('createAttempt.current?.body===body?createAttempt.current.key:randomId()');
    expect(page).toContain("headers:{'Idempotency-Key':key},body");
  });
});
