import { describe,expect,it } from 'vitest';
import {
  assignPeerReviewersWithHistory,
  peerScoreDisagreement,
  selectPeerCalibrationAnswers,
} from './peer-marking-quality.js';

const answers=[
  {answerId:'a1',studentId:'s1'},
  {answerId:'a2',studentId:'s2'},
  {answerId:'a3',studentId:'s3'},
  {answerId:'a4',studentId:'s4'},
];

describe('peer marking quality',()=>{
  it('keeps deterministic derangement semantics',()=>{
    const first=assignPeerReviewersWithHistory(answers,'round');
    const second=assignPeerReviewersWithHistory([...answers].reverse(),'round');
    expect(first).toEqual(second);
    expect(first.every((item)=>item.reviewerId!==item.studentId)).toBe(true);
  });

  it('chooses a lower-repeat rotation when recent directed pairs exist',()=>{
    const baseline=assignPeerReviewersWithHistory(answers,'round');
    const history=baseline.map((item)=>({
      answerStudentId:item.studentId,
      reviewerId:item.reviewerId,
      count:20,
    }));
    const next=assignPeerReviewersWithHistory(answers,'round',history);
    expect(next.every((item)=>item.reviewerId!==item.studentId)).toBe(true);
    expect(next.some((item)=>baseline.find((old)=>old.studentId===item.studentId)?.reviewerId!==item.reviewerId)).toBe(true);
    const repeated=next.reduce((sum,item)=>sum+(history.some((old)=>old.answerStudentId===item.studentId&&old.reviewerId===item.reviewerId)?1:0),0);
    expect(repeated).toBeLessThan(answers.length);
  });

  it('keeps unavoidable reciprocal pairing for two learners and self fallback for one',()=>{
    const pair=assignPeerReviewersWithHistory(answers.slice(0,2),'two',[
      {answerStudentId:'s1',reviewerId:'s2',count:99},
      {answerStudentId:'s2',reviewerId:'s1',count:99},
    ]);
    expect(pair.every((item)=>item.reviewerId!==item.studentId)).toBe(true);
    expect(assignPeerReviewersWithHistory(answers.slice(0,1),'one')).toEqual([
      {answerId:'a1',studentId:'s1',reviewerId:'s1',kind:'self'},
    ]);
  });

  it('selects a deterministic bounded calibration sample',()=>{
    expect(selectPeerCalibrationAnswers(assignPeerReviewersWithHistory(answers,'round'),'round',0)).toEqual([]);
    const sample=selectPeerCalibrationAnswers(assignPeerReviewersWithHistory(answers,'round'),'round',25);
    expect(sample).toHaveLength(1);
    expect(selectPeerCalibrationAnswers(assignPeerReviewersWithHistory(answers,'round'),'round',25)).toEqual(sample);
    expect(selectPeerCalibrationAnswers(assignPeerReviewersWithHistory(answers,'round'),'round',100)).toHaveLength(4);
  });

  it('measures score disagreement in Cambridge marks',()=>{
    expect(peerScoreDisagreement(4,2.5)).toBe(1.5);
  });
});
