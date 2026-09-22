import { describe, expect, it } from 'vitest';
import { generateSmartPaper, type SmartPaperCandidate } from './smart-paper-generator.js';

const pool: SmartPaperCandidate[] = [
  { id:'q1a',rootId:'r1',sourceRef:'9618/11/M/J/25 Q1(a)',marks:2,year:2025,commandWord:'State',primarySubtopic:'1.1',hasDiagram:false },
  { id:'q1b',rootId:'r1',sourceRef:'9618/11/M/J/25 Q1(b)',marks:3,year:2025,commandWord:'Explain',primarySubtopic:'1.1',hasDiagram:false },
  { id:'q2',rootId:'r2',sourceRef:'9618/12/M/J/25 Q2',marks:4,year:2025,commandWord:'Describe',primarySubtopic:'2.1',hasDiagram:false },
  { id:'q3',rootId:'r3',sourceRef:'9618/13/M/J/24 Q3',marks:5,year:2024,commandWord:'Explain',primarySubtopic:'3.1',hasDiagram:true },
  { id:'q4',rootId:'r4',sourceRef:'9618/21/O/N/23 Q4',marks:6,year:2023,commandWord:'Write',primarySubtopic:'4.1',hasDiagram:false },
  { id:'q5',rootId:'r5',sourceRef:'9618/22/O/N/22 Q5',marks:7,year:2022,commandWord:'Evaluate',primarySubtopic:'5.1',hasDiagram:false },
];

describe('generateSmartPaper', () => {
  it('is deterministic for the same seed', () => {
    expect(generateSmartPaper(pool,{targetMarks:14,seed:42}))
      .toEqual(generateSmartPaper(pool,{targetMarks:14,seed:42}));
  });

  it('keeps matching siblings from the same root together', () => {
    const result=generateSmartPaper(pool,{targetMarks:5,seed:7});
    const hasA=result.questionIds.includes('q1a');
    const hasB=result.questionIds.includes('q1b');
    expect(hasA).toBe(hasB);
  });

  it('gets within two marks when the pool permits it', () => {
    const result=generateSmartPaper(pool,{targetMarks:13,seed:11});
    expect(Math.abs(result.totalMarks-13)).toBeLessThanOrEqual(2);
  });

  it('never duplicates a question', () => {
    const result=generateSmartPaper(pool,{targetMarks:25,seed:99});
    expect(new Set(result.questionIds).size).toBe(result.questionIds.length);
  });

  it('returns an explicit warning for an empty pool', () => {
    const result=generateSmartPaper([],{targetMarks:20,seed:1});
    expect(result.questionIds).toEqual([]);
    expect(result.warnings).toContain('insufficient_pool');
  });

  it('respects the maximum question count', () => {
    const result=generateSmartPaper(pool,{targetMarks:100,seed:5,maxQuestions:3});
    expect(result.questionIds.length).toBeLessThanOrEqual(3);
  });
});
