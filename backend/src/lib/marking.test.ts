import{describe,expect,it}from'vitest';
import{computeScore,type Scheme}from'./marking.js';

const base=(type:Scheme['type']='all_required'):Scheme=>({
  type,maxMarks:3,
  points:['MP1','MP2','MP3'].map(code=>({code,marks:1,groupId:null,requires:[]})),
  groups:[],levels:[]
});
const m=(...codes:string[])=>codes.map(code=>({code,matched:true,confidence:1}));

describe('computeScore',()=>{
  it('all_required: 3 dan 2 tasi → 2',()=>expect(computeScore(base(),m('MP1','MP2')).score).toBe(2));
  it('any_3_from_5: 4 tasi mos → 3',()=>{
    const s=base('any_n_from_m');
    s.points=['MP1','MP2','MP3','MP4','MP5'].map(code=>({code,marks:1,groupId:'g',requires:[]}));
    s.groups=[{id:'g',nRequired:3,marksPerPoint:1,maxMarks:3}];
    expect(computeScore(s,m('MP1','MP2','MP3','MP4')).score).toBe(3);
  });
  it('any_3_from_5: 2 tasi → 2',()=>{
    const s=base('any_n_from_m');
    s.points.forEach(p=>p.groupId='g');
    s.groups=[{id:'g',nRequired:3,marksPerPoint:1,maxMarks:3}];
    expect(computeScore(s,m('MP1','MP2')).score).toBe(2);
  });
  it('graduated point_marks takes highest matched threshold',()=>{
    const s=base('any_n_from_m');
    s.maxMarks=3;
    s.points=[
      {code:'T1',marks:1,groupId:'g',requires:[]},
      {code:'T2',marks:2,groupId:'g',requires:[]},
      {code:'T3',marks:3,groupId:'g',requires:[]}
    ];
    s.groups=[{id:'g',nRequired:1,marksPerPoint:1,maxMarks:3,awardMode:'point_marks'}];
    expect(computeScore(s,m('T1','T2')).score).toBe(2);
    expect(computeScore(s,m('T1','T2','T3')).score).toBe(3);
  });
  it('graduated point_marks respects nRequired and group max',()=>{
    const s=base('any_n_from_m');
    s.maxMarks=4;
    s.points=[
      {code:'A',marks:3,groupId:'g',requires:[]},
      {code:'B',marks:2,groupId:'g',requires:[]},
      {code:'C',marks:1,groupId:'g',requires:[]}
    ];
    s.groups=[{id:'g',nRequired:2,marksPerPoint:1,maxMarks:4,awardMode:'point_marks'}];
    expect(computeScore(s,m('A','B','C')).score).toBe(4);
  });
  it('requires dependency cancels point',()=>{
    const s=base();s.points=[{code:'MP2',marks:1,groupId:null,requires:['MP1']}];
    expect(computeScore(s,m('MP2')).score).toBe(0);
  });
  it('chained requires stabilizes',()=>{
    const s=base();s.points[1]!.requires=['MP1'];s.points[2]!.requires=['MP2'];
    expect(computeScore(s,m('MP2','MP3')).score).toBe(0);
  });
  it('two groups have separate caps',()=>{
    const s=base('any_n_from_m');s.maxMarks=2;
    s.points=[{code:'A',marks:1,groupId:'a',requires:[]},{code:'B',marks:1,groupId:'a',requires:[]},{code:'C',marks:1,groupId:'b',requires:[]}];
    s.groups=[{id:'a',nRequired:1,marksPerPoint:1,maxMarks:1},{id:'b',nRequired:1,marksPerPoint:1,maxMarks:1}];
    expect(computeScore(s,m('A','B','C')).score).toBe(2);
  });
  it('group and ungrouped points combine',()=>{
    const s=base('any_n_from_m');s.points[0]!.groupId='g';s.points[1]!.groupId='g';
    s.groups=[{id:'g',nRequired:1,marksPerPoint:1,maxMarks:1}];
    expect(computeScore(s,m('MP1','MP2','MP3')).score).toBe(2);
  });
  it('exact match false is zero',()=>expect(computeScore(base('exact_match'),m('MP1')).score).toBe(0));
  it('levels needs teacher',()=>expect(computeScore(base('levels_of_response'),m()).score).toBeNull());
  it('never exceeds max marks',()=>{const s=base();s.maxMarks=1;expect(computeScore(s,m('MP1','MP2','MP3')).score).toBe(1)});
  it('empty input is zero',()=>expect(computeScore(base(),[]).score).toBe(0));
  it('unknown code creates finding',()=>expect(computeScore(base(),m('MP9')).findings).toContain('unknown_mark_point:MP9'));
});
