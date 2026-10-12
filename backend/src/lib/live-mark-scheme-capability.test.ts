import { describe, expect, it } from 'vitest';
import { liveMarkSchemeCapabilityReady, liveMarkSchemeCapabilitySql } from './live-mark-scheme-capability.js';

const point=(overrides:Partial<{id:string;code:string;text:string;marks:number;requires:unknown;groupId:string|null}>={})=>({
  id:'10000000-0000-4000-8000-000000000001',
  code:'M1',
  text:'Award one mark.',
  marks:1,
  requires:[],
  groupId:null,
  ...overrides,
});

const base=(schemeType:string)=>({
  schemeType,
  maxMarks:1,
  guidanceMd:null,
  levels:[] as Array<{levelNumber:number;minMarks:number;maxMarks:number;descriptorMd:string;indicativeContentMd?:string|null}>,
  points:[] as ReturnType<typeof point>[],
  groups:[] as Array<{id:string;nRequired:number;marksPerPoint:number;maxMarks:number;awardMode?:'fixed'|'point_marks'}>,
});

describe('Live mark-scheme capability gate',()=>{
  it('accepts every supported scheme type only with the rubric data its renderer/scorer needs',()=>{
    expect(liveMarkSchemeCapabilityReady({...base('all_required'),points:[point()]})).toBe(true);
    expect(liveMarkSchemeCapabilityReady({...base('exact_match'),points:[point()]})).toBe(true);
    expect(liveMarkSchemeCapabilityReady({
      ...base('any_n_from_m'),
      points:[point({groupId:'20000000-0000-4000-8000-000000000001'})],
      groups:[{id:'20000000-0000-4000-8000-000000000001',nRequired:1,marksPerPoint:1,maxMarks:1,awardMode:'fixed'}],
    })).toBe(true);
    expect(liveMarkSchemeCapabilityReady({
      ...base('levels_of_response'),
      levels:[{levelNumber:1,minMarks:0,maxMarks:1,descriptorMd:'Level descriptor'}],
    })).toBe(true);
    expect(liveMarkSchemeCapabilityReady({...base('code_output'),guidanceMd:'Judge the produced output.'})).toBe(true);
    expect(liveMarkSchemeCapabilityReady({...base('manual_only'),guidanceMd:'Teacher applies the published rubric.'})).toBe(true);
  });

  it('fails closed for incomplete manual, code-output and levels rubrics',()=>{
    expect(liveMarkSchemeCapabilityReady(base('manual_only'))).toBe(false);
    expect(liveMarkSchemeCapabilityReady(base('code_output'))).toBe(false);
    expect(liveMarkSchemeCapabilityReady({
      ...base('levels_of_response'),
      maxMarks:4,
      levels:[{levelNumber:1,minMarks:1,maxMarks:2,descriptorMd:'Partial only'}],
    })).toBe(false);
    expect(liveMarkSchemeCapabilityReady({
      ...base('levels_of_response'),
      levels:[{levelNumber:1,minMarks:0,maxMarks:1,descriptorMd:'   '}],
    })).toBe(false);
  });

  it('rejects broken group and prerequisite semantics before a Live snapshot is created',()=>{
    expect(liveMarkSchemeCapabilityReady({
      ...base('any_n_from_m'),
      points:[point({groupId:'20000000-0000-4000-8000-000000000001'})],
      groups:[{id:'20000000-0000-4000-8000-000000000001',nRequired:2,marksPerPoint:1,maxMarks:1}],
    })).toBe(false);

    expect(liveMarkSchemeCapabilityReady({
      ...base('all_required'),
      points:[point({requires:['M2']})],
    })).toBe(false);

    expect(liveMarkSchemeCapabilityReady({
      ...base('all_required'),
      points:[
        point(),
        point({id:'10000000-0000-4000-8000-000000000002',code:'M2',requires:['M2']}),
      ],
    })).toBe(false);
  });

  it('provides a SQL prefilter for cached and dynamic candidate selection',()=>{
    const sql=liveMarkSchemeCapabilitySql('rubric');
    expect(sql).toContain("rubric.scheme_type::text");
    expect(sql).toContain("when 'any_n_from_m'");
    expect(sql).toContain('mark_scheme_groups');
    expect(sql).toContain("when 'levels_of_response'");
    expect(sql).toContain('max(capability_level.max_marks)');
    expect(sql).toContain("when 'manual_only'");
    expect(()=>liveMarkSchemeCapabilitySql('bad alias!')).not.toThrow();
    expect(()=>liveMarkSchemeCapabilitySql('!!!')).toThrow('invalid SQL alias');
  });
});
