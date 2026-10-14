import {describe,it,expect,vi} from 'vitest';
import type {Pool} from 'pg';
import type {PgQuestionsRepository} from '../repositories/questions-repository.js';
import {LiveExamService} from '../services/live-exam-service.js';
import {expandExplicitLiveMarkPoints,type ExplicitScheme} from './live-explicit-mark-points.js';
import {liveMarkSchemeCapabilityReady} from './live-mark-scheme-capability.js';
import {computeScore} from './marking.js';

const FIXTURES={
  pixel:{
    ref:'9618/11/M/J/26 Q5(a)',
    marks:3,
    guidance:[
      '5(a) 1 mark for each point to max 3 3',
      '• The image is made of pixels',
      '• Each pixel has one colour',
      '• Each colour has a unique binary code',
      '• The code for the colour of each pixel is stored in sequence / order',
    ].join('\n'),
  },
  terms:{
    ref:'9618/11/M/J/26 Q5(b)',
    marks:3,
    guidance:[
      '5(b) 1 mark for each correct term 3',
      '• drawing object',
      '• property',
      '• drawing list',
      'A drawing object is an individual element of an image, for example: a line, a square.',
      'A property is an attribute of one part of the image, for example: a line colour, the width of a',
      'line.',
      'A drawing list is all of the elements that are included in the vector graphic.',
    ].join('\n'),
  },
  relations:{
    ref:'9618/11/M/J/26 Q4(a)',
    marks:4,
    guidance:[
      '4(a) 1 mark for each correct point 4',
      '• CUSTOMER BORROW is a one - to - many relationship // 1:M',
      '• TOY_INSTANCE to TOY is a many - to - one relationship // M:1',
      '• Identifying the correct Primary Key and matching Foreign Key in both relationships',
      '• Stating how the keys form the relationship',
    ].join('\n'),
  },
  health:{
    ref:'9618/12/M/J/26 Q6(a)',
    marks:3,
    guidance:[
      '6(a) 1 mark for each correct point to max 3 3',
      '• It only has one function, to monitor health',
      '• All the hardware such as sensors and a microprocessor is dedicated to',
      'the task of monitoring health',
      '• The firmware cannot be easily amended or updated because its function is',
      'preset',
    ].join('\n'),
  },
};
type Fixture=(typeof FIXTURES)[keyof typeof FIXTURES];
function original(source:Fixture):ExplicitScheme{
  return {
    id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    schemeType:'manual_only',maxMarks:source.marks,guidanceMd:source.guidance,
    levels:[],groups:[],points:[{
      id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',code:'M1',
      text:source.guidance,marks:source.marks,accept:[],reject:[],requires:[],
      isBod:false,groupId:null,
    }],
  };
}
function score(s:ExplicitScheme,matches:number[]) {
  const chosen=new Set(matches);
  return computeScore({
    type:s.schemeType as 'all_required'|'any_n_from_m',
    maxMarks:s.maxMarks,
    points:s.points.map(p=>({code:p.code,marks:p.marks,groupId:p.groupId,requires:[]})),
    groups:s.groups.map(g=>({id:g.id,nRequired:g.nRequired,marksPerPoint:g.marksPerPoint,
      maxMarks:g.maxMarks,awardMode:g.awardMode})),
    levels:[],
  },s.points.map((p,i)=>({code:p.code,matched:chosen.has(i),confidence:1}))).score;
}

describe('Live MP audit: no automated guesses from OCR rules',()=>{
  it('splits only audited source references with exactly matching source revisions',()=>{
    for(const fixture of Object.values(FIXTURES)){
      const source=original(fixture);
      const normalized=expandExplicitLiveMarkPoints(source,fixture.ref);
      expect(normalized).not.toBe(source);
      expect(normalized.derivedFromGuidance).toBe(true);
      expect(normalized.points.every(p=>p.marks===1)).toBe(true);
      expect(new Set(normalized.points.map(p=>p.id)).size).toBe(normalized.points.length);
      expect(normalized.guidanceMd).toBe(fixture.guidance);
      expect(liveMarkSchemeCapabilityReady(normalized)).toBe(true);
      expect(expandExplicitLiveMarkPoints(source,fixture.ref).points.map(p=>p.id))
        .toEqual(normalized.points.map(p=>p.id));
      expect(expandExplicitLiveMarkPoints(normalized,fixture.ref)).toBe(normalized);
    }
  });

  it('credits independent 3/3 terms and a capped 3/4 pixel rubric',()=>{
    const terms=expandExplicitLiveMarkPoints(original(FIXTURES.terms),FIXTURES.terms.ref);
    expect(terms.schemeType).toBe('all_required');
    expect(terms.points.map(p=>p.text)).toEqual(['drawing object','property','drawing list']);
    expect(score(terms,[0,2])).toBe(2);
    const pixels=expandExplicitLiveMarkPoints(original(FIXTURES.pixel),FIXTURES.pixel.ref);
    expect(pixels.schemeType).toBe('any_n_from_m');
    expect(pixels.points).toHaveLength(4);
    expect(pixels.groups).toMatchObject([{nRequired:3,maxMarks:3,marksPerPoint:1,awardMode:'fixed'}]);
    expect(score(pixels,[0,1])).toBe(2);
    expect(score(pixels,[0,1,2,3])).toBe(3);
  });

  it('reconstitutes two genuine wrapped source points in an audited three-mark answer',()=>{
    const health=expandExplicitLiveMarkPoints(original(FIXTURES.health),FIXTURES.health.ref);
    expect(health.points).toHaveLength(3);
    expect(health.points[1]!.text).toContain('monitoring health');
    expect(health.points[2]!.text).toContain('function is preset');
    expect(score(health,[0,1,2])).toBe(3);
  });

  it('fails closed for altered guidance, different paper, mismatched score and unknown reference',()=>{
    const source=original(FIXTURES.pixel);
    expect(expandExplicitLiveMarkPoints(source,'9618/11/M/J/25 Q5(a)')).toBe(source);
    expect(expandExplicitLiveMarkPoints(source,'0478/21/M/J/26 Q5(a)')).toBe(source);
    expect(expandExplicitLiveMarkPoints(source,'')).toBe(source);
    expect(expandExplicitLiveMarkPoints({...source,guidanceMd:source.guidanceMd+'\nDo not award extra.'},FIXTURES.pixel.ref))
      .not.toHaveProperty('derivedFromGuidance',true);
    expect(expandExplicitLiveMarkPoints({...source,maxMarks:4},FIXTURES.pixel.ref)).toBeDefined();
    expect(expandExplicitLiveMarkPoints({...source,maxMarks:4},FIXTURES.pixel.ref).schemeType).toBe('manual_only');
    const paired=original({
      ref:'9618/11/M/J/26 Q2(b)',marks:4,
      guidance:'1 mark for each benefit and 1 for its explanation\n• Benefit one\n• explanation\n• Benefit two\n• explanation',
    });
    expect(expandExplicitLiveMarkPoints(paired,'9618/11/M/J/26 Q2(b)')).toBe(paired);
  });

  it('preserves source-backed canonical result while using audited frozen MP1-MP3',async()=>{
    const source=original(FIXTURES.terms);
    const query=vi.fn().mockResolvedValue({rows:[{scheme:source,source_ref:FIXTURES.terms.ref}]});
    const service=new LiveExamService({query} as unknown as Pool,{} as PgQuestionsRepository);
    const result=await (service as unknown as {
      markScheme:(questionId:string)=>Promise<ExplicitScheme>;
    }).markScheme('approved-question');
    expect(result.points.map(p=>p.code)).toEqual(['MP1','MP2','MP3']);
    expect(result.schemeType).toBe('all_required');
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0]![0])).toContain('join questions q on q.id=ms.question_id');
    expect(source.points).toHaveLength(1);
    expect(source.schemeType).toBe('manual_only');
  });

  it('does not re-interpret non-manual, group or level rubrics even with audited text',()=>{
    const source=original(FIXTURES.pixel);
    const ownPoints={...source,schemeType:'all_required'};
    expect(expandExplicitLiveMarkPoints(ownPoints,FIXTURES.pixel.ref)).toBe(ownPoints);
    const leveled={...source,levels:[{
      levelNumber:1,minMarks:0,maxMarks:3,descriptorMd:'Best-fit',indicativeContentMd:null,
    }]};
    expect(expandExplicitLiveMarkPoints(leveled,FIXTURES.pixel.ref)).toBe(leveled);
  });
});
