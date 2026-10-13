import { describe,expect,it } from 'vitest';
import { releasedPointFeedback, type ReleasedMarkScheme } from './live-point-feedback.js';

const scheme=(schemeType='all_required',maxMarks=2):ReleasedMarkScheme=>({
  schemeType,maxMarks,
  points:[
    {id:'p1',code:'M1',text:'Correct fact',marks:1,groupId:null,requires:[]},
    {id:'p2',code:'M2',text:'Correct explanation',marks:1,groupId:null,requires:[]},
  ],
  groups:[],
});
const review=(ids:string[])=>({matchedPointIds:ids,recordedCount:2});

describe('released student Mark Point feedback',()=>{
  it('shows credited and missed criteria from the authoritative review',()=>{
    expect(releasedPointFeedback(scheme(),1,false,review(['p1']))).toEqual({
      status:'available',points:[
        {id:'p1',code:'M1',text:'Correct fact',marks:1,matched:true,credited:true},
        {id:'p2',code:'M2',text:'Correct explanation',marks:1,matched:false,credited:false},
      ],
    });
  });
  it('does not equate a matched exact-match fragment with an awarded mark',()=>{
    const s=scheme('exact_match',2);
    expect(releasedPointFeedback(s,0,false,review(['p1']))).toMatchObject({
      status:'available',points:[{matched:true,credited:false},{matched:false,credited:false}],
    });
  });
  it('honours capped any-n groups when identifying credited points',()=>{
    const s=scheme('any_n_from_m',1);
    s.points[0]!.groupId='g';s.points[1]!.groupId='g';
    s.groups=[{id:'g',nRequired:1,marksPerPoint:1,maxMarks:1,awardMode:'fixed'}];
    expect(releasedPointFeedback(s,1,false,review(['p1','p2']))).toMatchObject({
      status:'available',points:[{matched:true,credited:true},{matched:true,credited:false}],
    });
  });
  it('hides stale review flags after teacher moderation, even for matching score',()=>{
    expect(releasedPointFeedback(scheme(),1,true,review(['p1']))).toEqual({
      status:'unavailable',reason:'teacher_override',
    });
  });
  it('does not claim point awards for manual schemes or incomplete evidence',()=>{
    expect(releasedPointFeedback(scheme('manual_only'),1,false,review(['p1']))).toEqual({
      status:'unavailable',reason:'manual_scoring',
    });
    expect(releasedPointFeedback(scheme(),1,false,{matchedPointIds:['p1'],recordedCount:1})).toEqual({
      status:'unavailable',reason:'not_recorded',
    });
    expect(releasedPointFeedback(scheme(),0,false,review(['p1']))).toEqual({
      status:'unavailable',reason:'not_recorded',
    });
  });
  it('respects mark-point prerequisites before crediting',()=>{
    const s=scheme();s.points[1]!.requires=['M1'];
    expect(releasedPointFeedback(s,0,false,review(['p2']))).toMatchObject({
      status:'available',points:[{credited:false},{matched:false,credited:false}],
    });
  });
});
