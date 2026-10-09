import { describe,expect,it } from 'vitest';
import { parseStructuredResponse,structuredResponseHasContent,structuredResponseSummary } from './structured-response.js';

describe('structured response payload',()=>{
  it('accepts table, matching and diagram annotations in one versioned payload',()=>{
    const value=parseStructuredResponse({
      version:1,
      tableCells:[{block:1,row:0,column:2,value:'INTEGER'}],
      matches:[{block:2,leftId:'a',rightId:'x'}],
      annotations:[
        {id:'label-1',type:'text',x:0.25,y:0.3,value:'Top'},
        {id:'line-1',type:'line',x1:0.1,y1:0.2,x2:0.8,y2:0.7},
        {id:'stroke-1',type:'stroke',points:[[0.1,0.1],[0.2,0.2]]},
      ],
    });
    expect(structuredResponseHasContent(value)).toBe(true);
    expect(structuredResponseSummary(value)).toContain('INTEGER');
    expect(structuredResponseSummary(value)).toContain('Match a -> x');
    expect(structuredResponseSummary(value)).toContain('Drawn connections: 1');
  });

  it('rejects out-of-bounds coordinates and duplicate answer slots',()=>{
    expect(()=>parseStructuredResponse({
      version:1,tableCells:[],matches:[],
      annotations:[{id:'bad',type:'line',x1:-0.1,y1:0,x2:1,y2:1}],
    })).toThrow();
    expect(()=>parseStructuredResponse({
      version:1,
      tableCells:[
        {block:0,row:0,column:0,value:'A'},
        {block:0,row:0,column:0,value:'B'},
      ],
      matches:[],annotations:[],
    })).toThrow();
  });
});
