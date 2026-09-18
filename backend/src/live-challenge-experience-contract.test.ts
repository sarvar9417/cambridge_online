import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const app=source('src/app.ts');
const board=source('src/services/live-exam-board-projection.ts');
const leaderboard=source('../frontend/src/live/LiveExamLeaderboard.tsx');
const feed=source('src/services/live-exam-student-feed-service.ts');
const analytics=source('src/services/live-exam-analytics-service.ts');
const evidence=source('src/database/migrations/0170_live_exam_learning_evidence.sql');

describe('Cambridge Live Challenge classroom experience contract',()=>{
  it('mounts student feed and academic analytics before the generic snapshot router',()=>{
    const feedMount=app.indexOf('createLiveExamStudentFeedRouter(new LiveExamStudentFeedService(pool))');
    const analyticsMount=app.indexOf('createLiveExamAnalyticsRouter(new LiveExamAnalyticsService(pool))');
    const generic=app.indexOf('createLiveExamsRouter(new LiveExamService');
    expect(feedMount).toBeGreaterThan(-1);
    expect(analyticsMount).toBeGreaterThan(-1);
    expect(generic).toBeGreaterThan(feedMount);
    expect(generic).toBeGreaterThan(analyticsMount);
  });

  it('keeps the shared board free of raw structured source identifiers and raw Mark Scheme rows',()=>{
    expect(board).toContain('structuredBlocks: projectStructuredBlocks');
    expect(board).toContain('contentJson: null');
    expect(board).toContain('markScheme = scheme ?');
    expect(board).not.toContain('markScheme: source.markScheme ?? null');
    expect(board).toContain("key:`${prefix}${index+1}`");
    expect(leaderboard).toContain("variant==='projector'?'?audience=board':''");
    expect(leaderboard).toContain('studentId?:string');
  });

  it('discovers only enrolled non-draft challenges without exposing join codes',()=>{
    expect(feed).toContain("e.student_id=$1 and e.left_at is null");
    expect(feed).toContain("les.status<>'draft'");
    expect(feed).toContain("les.status in ('published','lobby')");
    expect(feed).not.toContain('select les.join_code');
    expect(feed).not.toContain('joinCode:');
  });

  it('builds final analytics from marks-first learning evidence and excludes speed',()=>{
    expect(analytics).toContain('live_exam_learning_evidence');
    expect(analytics).toContain('a.moderated_by is null');
    expect(analytics).toContain('marksOnly:true');
    expect(analytics).toContain('speedIncluded:false');
    expect(evidence).toContain('marks_earned');
    expect(evidence).toContain('marks_possible');
    expect(evidence).not.toContain('speed_bonus');
  });
});
