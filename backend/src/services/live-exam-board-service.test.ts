import { describe, expect, it, vi } from 'vitest';
import { LiveExamBoardService } from './live-exam-board-service.js';
import type { LiveExamService } from './live-exam-service.js';

const teacher = { id:'11111111-1111-4111-8111-111111111111',role:'teacher' as const,schoolId:'school',fullName:'Teacher' };
const student = { id:'22222222-2222-4222-8222-222222222222',role:'student' as const,schoolId:'school',fullName:'Student' };

function snapshot(status:'lobby'|'question_open'|'marking'|'review'|'finished'='question_open') {
  return {
    session:{
      id:'33333333-3333-4333-8333-333333333333',title:'Chapter 2 Live Challenge',className:'AS',status,version:7,
      joinCode:'123456',currentQuestionIndex:0,questionCount:2,participantCount:2,submittedCount:1,
      reviewCount:2,reviewedCount:0,questionStartedAt:'2026-09-17T03:00:00Z',deadline:null,
      serverNow:'2026-09-17T03:01:00Z',hostName:'Teacher',startedAt:null,finishedAt:null,
      markingMode:'peer',questionTimeLimitS:null,classId:'class-1',createdAt:'2026-09-17T03:00:00Z',updatedAt:'2026-09-17T03:00:00Z',
    },
    questions:[{id:'hidden-question-list'}],
    participants:[{id:'private-participant',fullName:'Private Student'}],
    question:{id:'session-question',sourceQuestionId:'q1',position:0,marks:2,portable:{sourceRef:'9618/12/M/J/26/1(a)'}},
    markScheme:{id:'ms1',schemeType:'all_required',maxMarks:2,guidanceMd:null,points:[],groups:[]},
    ownAnswer:{id:'private-answer',text:'private answer'},
    review:{id:'private-review',answerText:'another private answer'},
    teacherAnswers:[{id:'private-teacher-answer',text:'student text',studentName:'Student'}],
    report:{rows:[{studentName:'Student',answerText:'private'}],earned:1,possible:2},
  } as any;
}

describe('LiveExamBoardService', () => {
  it('rejects students before requesting a staff snapshot', async () => {
    const liveExam={snapshot:vi.fn()} as unknown as LiveExamService;
    await expect(new LiveExamBoardService(liveExam).board(student,'33333333-3333-4333-8333-333333333333'))
      .rejects.toMatchObject({code:'staff_only',status:403});
    expect(liveExam.snapshot).not.toHaveBeenCalled();
  });

  it('projects only learner-safe fields and strips staff/private data', async () => {
    const liveExam={snapshot:vi.fn().mockResolvedValue(snapshot('question_open'))} as unknown as LiveExamService;
    const result=await new LiveExamBoardService(liveExam).board(teacher,'33333333-3333-4333-8333-333333333333');
    expect(result.session.joinCode).toBeNull();
    expect(result.question?.id).toBe('session-question');
    expect(result.markScheme).toBeNull();
    expect(result).not.toHaveProperty('participants');
    expect(result).not.toHaveProperty('teacherAnswers');
    expect(result).not.toHaveProperty('ownAnswer');
    expect(result).not.toHaveProperty('review');
    expect(result).not.toHaveProperty('report');
    expect(result.session).not.toHaveProperty('hostName');
  });

  it('shows the room code only in the lobby', async () => {
    const liveExam={snapshot:vi.fn().mockResolvedValue(snapshot('lobby'))} as unknown as LiveExamService;
    const result=await new LiveExamBoardService(liveExam).board(teacher,'33333333-3333-4333-8333-333333333333');
    expect(result.session.joinCode).toBe('123456');
    expect(result.question).toBeNull();
    expect(result.markScheme).toBeNull();
  });

  it('allows the Mark Scheme only after the reveal boundary', async () => {
    const liveExam={snapshot:vi.fn().mockResolvedValue(snapshot('marking'))} as unknown as LiveExamService;
    const result=await new LiveExamBoardService(liveExam).board(teacher,'33333333-3333-4333-8333-333333333333');
    expect(result.markScheme).toMatchObject({id:'ms1',maxMarks:2});
  });
});
