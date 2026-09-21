import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const builder=read('src/routes/live-exam-builder.ts');
const participation=read('src/routes/live-exam-participation.ts');
const control=read('src/routes/live-exam-control.ts');
const controlService=read('src/services/live-exam-control-service.ts');
const runtime=read('src/routes/live-exams.ts');
const moderation=read('src/routes/live-exam-moderation.ts');
const feed=read('src/services/live-exam-student-feed-service.ts');
const board=read('src/services/live-exam-board-projection.ts');
const analytics=read('src/services/live-exam-analytics-service.ts');
const evidence=read('src/database/migrations/0170_live_exam_learning_evidence.sql');
const peerIntegrity=read('src/database/migrations/0168_live_exam_peer_integrity.sql');
const realtime=read('src/services/live-exam-realtime-service.ts');

describe('Cambridge Live Challenge repository release-flow gate',()=>{
  it('covers the canonical teacher create-to-finish sequence',()=>{
    expect(builder).toContain("router.post('/drafts'");
    expect(builder).toContain("router.put('/:id/questions'");
    expect(builder).toContain("router.post('/:id/questions/auto'");
    expect(builder).toContain("router.post('/:id/publish'");
    expect(control).toContain("router.post('/:id/open-room'");
    expect(control).toContain("router.post('/:id/start'");
    expect(control).toContain("router.post('/:id/answers/lock'");
    expect(control).toContain("router.post('/:id/mark-scheme/reveal'");
    expect(control).toContain("router.post('/:id/marking/complete'");
    expect(control).toContain("router.post('/:id/next'");
  });

  it('covers the student answer/marking surfaces and audited moderation',()=>{
    expect(participation).toContain("router.post('/join'");
    expect(runtime).not.toContain("router.post('/join'");
    expect(runtime).toContain("router.put('/:id/answer'");
    expect(runtime).toContain("router.post('/:id/answer/submit'");
    expect(runtime).toContain("router.post('/:id/reviews/:reviewId/submit'");
    expect(read('src/services/live-exam-service.ts')).toContain('dependencyWork');
    expect(read('../frontend/src/live/LiveExamRuntime.tsx')).toContain('Oldingi ish kerak');
    expect(moderation).toContain("router.put('/:id/answers/:answerId/moderate'");
    expect(moderation).toContain('expectedVersion');
    expect(moderation).toContain('reason:');
  });

  it('keeps classroom safety invariants fail-closed',()=>{
    expect(peerIntegrity).toContain('live_peer_assignment_impossible');
    expect(peerIntegrity).toContain('NEW.reviewer_id = answer_student_id');
    expect(control).toContain('expectedVersion');
    expect(controlService).toContain("set status='answers_locked'");
    expect(controlService).toContain("session.status !== 'answers_locked'");
    expect(board).not.toContain('teacherAnswers');
    expect(board).not.toContain('ownAnswer');
    expect(feed).not.toContain('joinCode:');
  });

  it('covers participation, pause/reconnect and stale-tab protections',()=>{
    expect(participation).toContain("router.post('/:id/leave'");
    expect(participation).toContain("router.post('/:id/participants/:participantId/remove'");
    expect(control).toContain("router.post('/:id/pause'");
    expect(control).toContain("router.post('/:id/resume'");
    expect(realtime).toContain('currentVersion');
    expect(realtime).toContain('changed');
  });

  it('finishes with idempotent marks-only evidence, history and analytics',()=>{
    expect(evidence).toContain('UNIQUE (answer_id, learning_objective_id)');
    expect(evidence).toContain('ON CONFLICT (answer_id,learning_objective_id) DO NOTHING');
    expect(evidence).toContain("NEW.status <> 'finished'");
    expect(feed).toContain('history:items.filter');
    expect(analytics).toContain('live_exam_learning_evidence');
    expect(analytics).toContain('marksOnly:true');
    expect(analytics).toContain('speedIncluded:false');
  });
});
