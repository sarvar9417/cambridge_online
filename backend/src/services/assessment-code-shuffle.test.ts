import { describe,it,expect } from 'vitest';
import { canonicalChoice, perStudentOrder, studentOptionOrder, visibleChoice } from './assessment-code-shuffle.js';

describe('PIN test per-student shuffling',()=>{
  const guestA='a'.repeat(64),guestB='b'.repeat(64);
  const questions=Array.from({length:20},(_,i)=>({id:'id-'+i,label:'Q'+i}));
  it('keeps a stable permutation across refresh and never drops or duplicates questions',()=>{
    const one=perStudentOrder(questions,guestA,1,'question',q=>q.id);
    const refresh=perStudentOrder(questions,guestA,1,'question',q=>q.id);
    expect(one).toEqual(refresh);
    expect(one.map(q=>q.id)).not.toEqual(questions.map(q=>q.id));
    expect(new Set(one.map(q=>q.id)).size).toBe(questions.length);
    expect(one.map(q=>q.id).sort()).toEqual(questions.map(q=>q.id).sort());
  });
  it('gives different attempts independently seeded sequences',()=>{
    const a=perStudentOrder(questions,guestA,1,'question',q=>q.id);
    const b=perStudentOrder(questions,guestB,1,'question',q=>q.id);
    expect(a.map(q=>q.id)).not.toEqual(b.map(q=>q.id));
  });
  it('shuffles A-D, preserves exact options and inverts saved choices',()=>{
    const actual=[0,1,2,3];
    const order=studentOptionOrder('question-1',guestA,1,4);
    expect(order).not.toEqual(actual);
    expect([...order].sort()).toEqual(actual);
    for(let displayed=0;displayed<4;displayed++){
      const original=canonicalChoice(displayed,order);
      expect(visibleChoice(original,order)).toBe(displayed);
    }
    expect(visibleChoice(null,order)).toBeNull();
    expect(studentOptionOrder('question-1',guestA,1,4)).toEqual(order);
  });
  it('does not alter existing attempts created before shuffle migration',()=>{
    expect(perStudentOrder(questions,guestA,0,'question',q=>q.id)).toEqual(questions);
    expect(studentOptionOrder('question-1',guestA,0,4)).toEqual([0,1,2,3]);
    expect(visibleChoice(2,[0,1,2,3])).toBe(2);
  });
  it('rejects invalid answers instead of mapping to another option',()=>{
    expect(()=>canonicalChoice(-1,[0,1,2,3])).toThrow();
    expect(()=>canonicalChoice(4,[0,1,2,3])).toThrow();
  });
});
