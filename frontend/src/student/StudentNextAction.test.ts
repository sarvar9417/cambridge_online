import { describe, expect, it } from 'vitest';
import type { Assignment, Flashcard, MasteryItem, ResultItem } from '../lib/api';
import { nextStudentAction } from './StudentNextAction';

const future=new Date(Date.now()+7*86_400_000).toISOString();
const dueSoon=new Date(Date.now()+2*60*60_000).toISOString();
const assignment=(over:Partial<Assignment>={}):Assignment=>({id:'a',classId:'c',title:'Homework',mode:'online',className:'11-A',totalMarks:20,opensAt:null,dueAt:future,timeLimitMin:null,publishedAt:null,submissionStatus:'not_started',classSize:20,submittedCount:0,pendingGrading:0,...over});
const mastery=(over:Partial<MasteryItem>={}):MasteryItem=>({subtopic_id:'s',code:'1.1',title:'Data representation',score:.5,attempts:2,marksEarned:5,marksPossible:10,practiceReady:true,practiceQuestionCount:5,...over});
const result=(over:Partial<ResultItem>={}):ResultItem=>({id:'r',title:'Test',className:'11-A',studentName:'Student',totalScore:10,totalMax:20,percentage:50,grade:null,releasedAt:new Date().toISOString(),...over});
const card:Flashcard={flashcard_id:'f',front_md:'A',back_md:'B',hint_md:null};

describe('student next action',()=>{
  it('finishes in-progress work before everything else',()=>expect(nextStudentAction([assignment({submissionStatus:'in_progress'})],[result()],[mastery()],[card]).kind).toBe('assignment'));
  it('prioritises urgent assignment before revision',()=>expect(nextStudentAction([assignment({dueAt:dueSoon})],[],[mastery()],[card]).kind).toBe('assignment'));
  it('reviews due flashcards before optional mastery practice',()=>expect(nextStudentAction([],[],[mastery()],[card]).kind).toBe('flashcards'));
  it('uses only a source-backed ready weak topic for practice',()=>expect(nextStudentAction([],[],[mastery()],[]).kind).toBe('practice'));
  it('never recommends an incomplete practice pool',()=>expect(nextStudentAction([],[],[mastery({practiceReady:false,practiceQuestionCount:3})],[]).kind).toBe('lessons'));
});
