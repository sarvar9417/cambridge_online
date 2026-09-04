import { describe, expect, it } from 'vitest';
import type { ResultDetail } from '../lib/api';
import { remediationTargets } from './StudentResults';

const detail=(over:Partial<ResultDetail>={}):ResultDetail=>({gradingId:'g',appealStatus:null,displayRef:'Q1',stemMd:'Stem',marks:4,answerText:'Answer',finalScore:2,feedback:null,points:[],practiceTargets:[{subtopicId:'s1',code:'1.1',title:'Data'}],...over});

describe('result remediation targets',()=>{
  it('aggregates lost marks for the same current syllabus subtopic',()=>{
    const targets=remediationTargets([
      detail({gradingId:'g1',marks:4,finalScore:1}),
      detail({gradingId:'g2',marks:3,finalScore:2}),
    ]);
    expect(targets).toEqual([{subtopicId:'s1',code:'1.1',title:'Data',lostMarks:4,questions:2}]);
  });

  it('ignores full-mark questions and questions without a reviewed target',()=>{
    expect(remediationTargets([
      detail({finalScore:4}),
      detail({gradingId:'g2',practiceTargets:[]}),
    ])).toEqual([]);
  });

  it('orders the biggest loss first',()=>{
    const targets=remediationTargets([
      detail({gradingId:'g1',marks:5,finalScore:0,practiceTargets:[{subtopicId:'s2',code:'2.1',title:'Networks'}]}),
      detail({gradingId:'g2',marks:2,finalScore:1}),
    ]);
    expect(targets.map((target)=>target.subtopicId)).toEqual(['s2','s1']);
  });
});
