import { describe,expect,it } from 'vitest';
import { buildLiveChallengePeerAssignments,projectLiveChallengeForStudent } from './services/live-challenge-domain.js';
import { projectLiveChallengeForBoard } from './services/live-challenge-board-projection.js';

const question={id:'question-1',displayRef:'9618/12/M/J/26 Q3(a)',marks:2};
const markScheme={maxMarks:2,points:[{id:'point-1',code:'A1',text:'Mentions decode',marks:1}]};
const round={id:'round-1',number:1,status:'QUESTION_ACTIVE'};
const base={
  id:'challenge-1',title:'CPU Challenge',className:'Grade 10',syllabusCode:'9618',topicTitle:'Processor fundamentals',subtopicTitle:'Control unit',
  stateVersion:7,currentQuestionPosition:1,serverNow:'2026-09-09T18:00:00.000Z',round,question,markScheme,source:{teacherOnly:true},
};

describe('Live Challenge multi-client synchronization contract',()=>{
  it('projects the same canonical question to Board, Student A and Student B while answering',()=>{
    const studentA=projectLiveChallengeForStudent({status:'QUESTION_ACTIVE' as const,question,markScheme});
    const studentB=projectLiveChallengeForStudent({status:'QUESTION_ACTIVE' as const,question,markScheme});
    const board=projectLiveChallengeForBoard({...base,status:'QUESTION_ACTIVE'}, {joinedCount:2,answerCount:0,assignmentCount:0,peerMarkCount:0}, null);

    expect(studentA.question?.id).toBe(question.id);
    expect(studentB.question?.id).toBe(question.id);
    expect((board.question as typeof question)?.id).toBe(question.id);
    expect(studentA.markScheme).toBeNull();
    expect(studentB.markScheme).toBeNull();
    expect(board.markScheme).toBeNull();
  });

  it('reveals the same approved Mark Scheme only after peer marking opens',()=>{
    const studentA=projectLiveChallengeForStudent({status:'PEER_MARKING' as const,question,markScheme});
    const studentB=projectLiveChallengeForStudent({status:'PEER_MARKING' as const,question,markScheme});
    const board=projectLiveChallengeForBoard({...base,status:'PEER_MARKING',round:{...round,status:'PEER_MARKING'}}, {joinedCount:2,answerCount:2,assignmentCount:2,peerMarkCount:0}, null);

    expect(studentA.markScheme).toEqual(markScheme);
    expect(studentB.markScheme).toEqual(markScheme);
    expect(board.markScheme).toEqual(markScheme);
    expect(board.submittedCount).toBe(2);
    expect(board.peerAssignmentCount).toBe(2);
  });

  it('deranges three student answers deterministically without self-marking',()=>{
    const answers=[
      {answerId:'answer-a',studentId:'student-a'},
      {answerId:'answer-b',studentId:'student-b'},
      {answerId:'answer-c',studentId:'student-c'},
    ];
    const first=buildLiveChallengePeerAssignments(answers,'round-1');
    const replay=buildLiveChallengePeerAssignments(answers,'round-1');
    expect(first).toEqual(replay);
    expect(first).toHaveLength(3);
    for(const assignment of first)expect(assignment.markerStudentId).not.toBe(assignment.answerStudentId);
    expect(new Set(first.map(item=>item.answerId)).size).toBe(3);
  });

  it('keeps board output allow-listed rather than leaking teacher source metadata',()=>{
    const board=projectLiveChallengeForBoard({...base,status:'QUESTION_ACTIVE'}, {joinedCount:2,answerCount:1,assignmentCount:0,peerMarkCount:0}, null);
    expect(board).not.toHaveProperty('source');
    expect(board).not.toHaveProperty('answers');
    expect(board).not.toHaveProperty('participants');
    expect(board).not.toHaveProperty('teacherId');
  });
});
