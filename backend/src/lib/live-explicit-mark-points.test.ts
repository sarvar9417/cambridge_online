import {describe,it,expect} from 'vitest';
import { expandExplicitLiveMarkPoints, type ExplicitScheme } from './live-explicit-mark-points.js';
import { liveMarkSchemeCapabilityReady } from './live-mark-scheme-capability.js';
import {computeScore} from './marking.js';

function original(guidanceMd:string,maxMarks:number):ExplicitScheme{
 return {
  id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',schemeType:'manual_only',maxMarks,guidanceMd,
  levels:[],groups:[],points:[{
   id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',code:'M1',
   text:guidanceMd,marks:maxMarks,accept:[],reject:[],requires:[],isBod:false,groupId:null,
  }],
 };
}
function assess(s:ExplicitScheme,matches:number[]){
 const selected=new Set(matches);
 return computeScore({
  type:s.schemeType as 'all_required'|'any_n_from_m',
  maxMarks:s.maxMarks,
  points:s.points.map(p=>({code:p.code,marks:p.marks,groupId:p.groupId,requires:[]})),
  groups:s.groups.map(g=>({id:g.id,nRequired:g.nRequired,marksPerPoint:g.marksPerPoint,
    maxMarks:g.maxMarks,awardMode:g.awardMode})),
  levels:[],
 },s.points.map((p,i)=>({code:p.code,matched:selected.has(i),confidence:1}))).score;
}

describe('source-backed Live MP decomposition',()=>{
 it('separates three independent source terms into three stable one-mark points',()=>{
  const source=original([
   '5(b) 1 mark for each correct term 3',
   '• drawing object',
   '• property',
   '• drawing list',
   'An individual drawing object is part of an image.',
  ].join('\n'),3);
  const a=expandExplicitLiveMarkPoints(source);
  expect(a.schemeType).toBe('all_required');
  expect(a.points.map(p=>({code:p.code,text:p.text,marks:p.marks}))).toEqual([
   {code:'MP1',text:'drawing object',marks:1},
   {code:'MP2',text:'property',marks:1},
   {code:'MP3',text:'drawing list',marks:1},
  ]);
  expect(new Set(a.points.map(p=>p.id)).size).toBe(3);
  expect(a.points.every(p=>/^[0-9a-f-]{36}$/.test(p.id))).toBe(true);
  expect(a.points.map(p=>p.id)).toEqual(expandExplicitLiveMarkPoints(source).points.map(p=>p.id));
  expect(a.guidanceMd).toBe(source.guidanceMd);
  expect(liveMarkSchemeCapabilityReady(a)).toBe(true);
  expect(assess(a,[0,2])).toBe(2);
 });

 it('supports 3-of-4 independent source points with a scoring cap',()=>{
  const source=original([
   '5(a) 1 mark for each point to max 3 3',
   '• The image is made of pixels',
   '• Each pixel has one colour',
   '• Each colour has a unique binary code',
   '• The binary colour code is stored in sequence',
  ].join('\n'),3);
  const a=expandExplicitLiveMarkPoints(source);
  expect(a.schemeType).toBe('any_n_from_m');
  expect(a.points).toHaveLength(4);
  expect(a.points.every(p=>p.marks===1&&p.groupId===a.groups[0]?.id)).toBe(true);
  expect(a.groups).toMatchObject([{nRequired:3,marksPerPoint:1,maxMarks:3,awardMode:'fixed'}]);
  expect(liveMarkSchemeCapabilityReady(a)).toBe(true);
  expect(assess(a,[0,1])).toBe(2);
  expect(assess(a,[0,1,2,3])).toBe(3);
 });

 it('preserves original manual rubrics for mixed benefit+explanation paired marks',()=>{
  const source=original([
   '2(b) 1 mark for each benefit and 1 mark for an appropriate expansion to max 4 (2 x 2)',
   '• Detects an error at runtime',
   '• and shows where it happened',
   '• Immediate execution',
   '• with no compile stage',
  ].join('\n'),4);
  expect(expandExplicitLiveMarkPoints(source)).toBe(source);
 });

 it('never invents points for calculations, SQL statements, levels or source options',()=>{
  for(const content of [
   'ACC results: AND 31 -> 10011010; XOR B01001111 -> 11010101; OR #30 -> 10011110.',
   '1 mark for each correct statement. Award maximum 2 marks if statements are in wrong order\n• Correct table\n• SET clause\n• WHERE clause',
   'No mark for choice. 1 mark for each point to max 3; justification must match. No mix and match.\n• bitmap\n• vector\n• quality',
  ]) {
    const scheme=original(content,3);
    expect(expandExplicitLiveMarkPoints(scheme)).toBe(scheme);
  }
  const level={...original('1 mark for each point\n• Point one\n• Point two',2),
   schemeType:'levels_of_response',levels:[{id:'id',levelNumber:1,minMarks:0,maxMarks:2,descriptorMd:'Example',indicativeContentMd:null}]};
  expect(expandExplicitLiveMarkPoints(level)).toBe(level);
 });

 it('leaves pre-existing distinct MP rubrics and already-expanded session snapshots unchanged',()=>{
  const source=original('1 mark for each correct point\n• Point one\n• Point two',2);
  const once=expandExplicitLiveMarkPoints(source);
  expect(expandExplicitLiveMarkPoints(once)).toBe(once);
  const multiple={...source,schemeType:'all_required',points:[
   {...source.points[0]!,marks:1}, {...source.points[0]!,id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',code:'M2',marks:1},
  ]};
  expect(expandExplicitLiveMarkPoints(multiple)).toBe(multiple);
 });
});
