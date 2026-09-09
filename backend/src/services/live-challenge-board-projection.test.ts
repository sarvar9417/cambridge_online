import { describe,expect,it } from 'vitest';
import { projectLiveChallengeForBoard } from './live-challenge-board-projection.js';

const base={
  id:'challenge-1',title:'CPU Live',className:'11-A',syllabusCode:'9618',topicTitle:'Processors',subtopicTitle:'CPU',
  status:'QUESTION_ACTIVE',stateVersion:8,currentQuestionPosition:1,serverNow:'2026-09-09T17:00:00Z',
  round:{id:'round-1',number:1,status:'QUESTION_ACTIVE',timeLimitSeconds:null},
  question:{id:'q-1',displayRef:'9618/12 Q3',stemMd:'State two functions.',marks:2},
  markScheme:{maxMarks:2,points:[{id:'p1',text:'decode'}]},
  source:{sourcePaperId:'secret-paper',qpSha256:'secret-sha'},
};
const metrics={joinedCount:20,answerCount:7,assignmentCount:0,peerMarkCount:0};

describe('projectLiveChallengeForBoard',()=>{
  it('shows the canonical active question but not source identity or mark scheme',()=>{
    const board=projectLiveChallengeForBoard(base,metrics,null);
    expect(board.question).toEqual(base.question);
    expect(board.markScheme).toBeNull();
    expect(board).not.toHaveProperty('source');
    expect(JSON.stringify(board)).not.toContain('secret-paper');
    expect(board).toMatchObject({joinedCount:20,submittedCount:7});
  });

  it('shows join code only in pre-start states',()=>{
    const lobby={joinCode:'ABC234',participantCount:10};
    expect(projectLiveChallengeForBoard({...base,status:'LOBBY',question:null},metrics,lobby)).toMatchObject({joinCode:'ABC234',question:null,markScheme:null});
    expect(projectLiveChallengeForBoard({...base,status:'QUESTION_ACTIVE'},metrics,lobby).joinCode).toBeNull();
  });

  it('reveals the approved scheme only when peer marking has opened',()=>{
    expect(projectLiveChallengeForBoard({...base,status:'ANSWERS_LOCKED'},metrics,null).markScheme).toBeNull();
    expect(projectLiveChallengeForBoard({...base,status:'PEER_MARKING'},metrics,null).markScheme).toEqual(base.markScheme);
    expect(projectLiveChallengeForBoard({...base,status:'ROUND_RESULTS'},metrics,null).markScheme).toEqual(base.markScheme);
  });
});
