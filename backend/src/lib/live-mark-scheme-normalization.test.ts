import { describe, expect, it } from 'vitest';
import { normalizeCollapsedLiveMarkScheme, type LiveMarkSchemeForNormalization } from './live-mark-scheme-normalization.js';

function collapsed(guidanceMd:string,maxMarks:number):LiveMarkSchemeForNormalization {
  return {
    id:'11111111-1111-4111-8111-111111111111',
    schemeType:'manual_only',
    maxMarks,
    guidanceMd,
    points:[{
      id:'22222222-2222-4222-8222-222222222222',
      code:'M1',
      text:guidanceMd,
      marks:maxMarks,
      accept:[],
      reject:[],
      requires:[],
      isBod:false,
      groupId:null,
    }],
    groups:[],
  };
}

describe('normalizeCollapsedLiveMarkScheme',()=>{
  it('splits explicit Cambridge MP rows and preserves an overall cap',()=>{
    const scheme=collapsed(`4(b) One mark per mark point, max six 6
MP1 At least one appropriate working loop
MP2 First inputs of numbers all stored in array Numbers
MP3 Correct second input made for each number
MP4 Working selection statement to compare inputs
MP5 If numbers do not match, output both values
MP6 New input stored in current array location
MP7 Final output confirming completion
For example:`,6);

    const result=normalizeCollapsedLiveMarkScheme(scheme);
    expect(result.schemeType).toBe('any_n_from_m');
    expect(result.points).toHaveLength(7);
    expect(result.points.map((point)=>point.code)).toEqual(['MP1','MP2','MP3','MP4','MP5','MP6','MP7']);
    expect(result.points.every((point)=>point.marks===1)).toBe(true);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({nRequired:6,marksPerPoint:1,maxMarks:6,awardMode:'fixed'});
    expect(result.points.every((point)=>point.groupId===result.groups[0]!.id)).toBe(true);
  });

  it('turns an any-n bullet list into separate one-mark points',()=>{
    const scheme=collapsed(`2(a) Any three from: 3
• Displays a web page
• Stores bookmarks
• Records history
• Allows multiple tabs
Question Answer Marks`,3);

    const result=normalizeCollapsedLiveMarkScheme(scheme);
    expect(result.schemeType).toBe('any_n_from_m');
    expect(result.points).toHaveLength(4);
    expect(result.groups[0]).toMatchObject({nRequired:3,maxMarks:3});
    expect(result.points.map((point)=>point.text)).toEqual([
      'Displays a web page',
      'Stores bookmarks',
      'Records history',
      'Allows multiple tabs',
    ]);
  });

  it('keeps Cambridge continuation bullets dependent on the previous point',()=>{
    const scheme=collapsed(`3(a) Three from: 3
• The address is copied to MAR
• … for the data that is required
• The data is copied to MDR`,3);

    const result=normalizeCollapsedLiveMarkScheme(scheme);
    expect(result.schemeType).toBe('all_required');
    expect(result.points).toHaveLength(3);
    expect(result.points[1]!.requires).toEqual(['MP1']);
  });

  it('supports separate capped sections instead of flattening their marks',()=>{
    const scheme=collapsed(`4 One mark per mark point for coding, max three 6
• Write the program code
• Use pseudocode from the design
• Document code with comments
• Use procedures or functions
One mark per mark point for testing, max three
• Test the whole program
• Use test data with known outcomes
• Debug errors
• Use normal and abnormal data`,6);

    const result=normalizeCollapsedLiveMarkScheme(scheme);
    expect(result.schemeType).toBe('any_n_from_m');
    expect(result.points).toHaveLength(8);
    expect(result.groups).toHaveLength(2);
    expect(result.groups.map((group)=>group.maxMarks)).toEqual([3,3]);
    expect(result.groups.map((group)=>group.nRequired)).toEqual([3,3]);
    expect(new Set(result.points.slice(0,4).map((point)=>point.groupId))).toEqual(new Set([result.groups[0]!.id]));
    expect(new Set(result.points.slice(4).map((point)=>point.groupId))).toEqual(new Set([result.groups[1]!.id]));
  });

  it('splits repeated "one mark for" clauses when the boundary is explicit',()=>{
    const scheme=collapsed('1(b) One mark for working, One mark for file size',2);
    const result=normalizeCollapsedLiveMarkScheme(scheme);
    expect(result.schemeType).toBe('all_required');
    expect(result.points).toHaveLength(2);
    expect(result.points.map((point)=>point.code)).toEqual(['MP1','MP2']);
    expect(result.points.every((point)=>point.marks===1)).toBe(true);
  });

  it('splits numeric 1-mark-each bullet rubrics used by 9618 without the fake multi-mark M1',()=>{
    const scheme=collapsed(`7(a)(i) 1 mark for each correct point to max 2 2
• Efficient allocation of resources to processes
• Moving processes between states
• Allocating time slices to processes
• Scheduling processes`,2);
    const result=normalizeCollapsedLiveMarkScheme(scheme);
    expect(result.schemeType).toBe('any_n_from_m');
    expect(result.points).toHaveLength(4);
    expect(result.points.every((point)=>point.marks===1)).toBe(true);
    expect(result.groups[0]).toMatchObject({nRequired:2,maxMarks:2});
  });

  it('keeps paired benefit/expansion rubrics manual while exposing atomic checkboxes',()=>{
    const scheme=collapsed(`2(b) 1 mark for each benefit and 1 mark for an appropriate expansion to max 4 (2 x 2) 4
• Amend the code in real time
• and see the changes immediately instead of recompiling
• Stops as soon as an error is encountered
• so the position of the error can be easily seen
• Incomplete code can be tested
• so the program does not need to be complete`,4);
    const result=normalizeCollapsedLiveMarkScheme(scheme);
    expect(result.schemeType).toBe('manual_only');
    expect(result.points).toHaveLength(6);
    expect(result.points.every((point)=>point.marks===1)).toBe(true);
    expect(result.groups[0]).toMatchObject({nRequired:4,maxMarks:4});
  });

  it('splits explicit MP rows following a Cambridge Mark as follows block',()=>{
    const scheme=collapsed(`Example solution:
Mark as follows:
MP1 Function header and parameter
MP2 Declaration of local variables
MP3 Correct calculation
MP4 Return of calculated value`,4);
    const result=normalizeCollapsedLiveMarkScheme(scheme);
    expect(result.schemeType).toBe('all_required');
    expect(result.points.map((point)=>point.code)).toEqual(['MP1','MP2','MP3','MP4']);
    expect(result.points.every((point)=>point.marks===1)).toBe(true);
  });

  it('fails safe for an ambiguous manual rubric instead of exposing one fake multi-mark MP',()=>{
    const scheme=collapsed('Award up to four marks using the complete official rubric shown here.',4);
    const result=normalizeCollapsedLiveMarkScheme(scheme);
    expect(result.schemeType).toBe('manual_only');
    expect(result.points).toEqual([]);
    expect(result.groups).toEqual([]);
    expect(result.guidanceMd).toContain('Award up to four marks');
  });

  it('removes a synthetic one-mark placeholder from an ambiguous multi-mark manual rubric',()=>{
    const scheme=collapsed('Apply the published four-mark source rubric.',4);
    scheme.points[0]!.marks=1;
    const result=normalizeCollapsedLiveMarkScheme(scheme);
    expect(result.schemeType).toBe('manual_only');
    expect(result.points).toEqual([]);
    expect(result.guidanceMd).toContain('four-mark source rubric');
  });

  it('does not rewrite an already atomic mark scheme',()=>{
    const scheme:LiveMarkSchemeForNormalization={
      ...collapsed('Atomic source',2),
      schemeType:'all_required',
      points:[
        {...collapsed('Atomic source',2).points[0]!,id:'33333333-3333-4333-8333-333333333333',code:'MP1',text:'First criterion',marks:1},
        {...collapsed('Atomic source',2).points[0]!,id:'44444444-4444-4444-8444-444444444444',code:'MP2',text:'Second criterion',marks:1},
      ],
    };
    expect(normalizeCollapsedLiveMarkScheme(scheme)).toBe(scheme);
  });
});
