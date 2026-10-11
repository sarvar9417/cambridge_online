import { describe, expect, it } from 'vitest';
import type { StructuredQuestionContent } from './structured-question-content';
import {
  emptyStructuredResponse,
  normalizeStructuredResponse,
  structuredResponseHasValue,
  structuredResponseRequired,
  structuredResponseSummary,
} from './structured-response';

const content:StructuredQuestionContent={
  version:1,
  source:{paperId:'11111111-1111-4111-8111-111111111111',sha256:'a'.repeat(64)},
  blocks:[
    {type:'text',style:'task',text:'Complete the table.',source:{page:2}},
    {
      type:'table',kind:'table',headers:['Item','Value'],
      rows:[['A',null],['B',null]],editableCells:[[0,1],[1,1]],source:{page:2},
    },
    {
      type:'matching',
      left:[{id:'l1',text:'TCP'},{id:'l2',text:'IP'}],
      right:[{id:'r1',text:'Transport'},{id:'r2',text:'Internet'}],
      source:{page:2},
    },
    {type:'answer_area',kind:'drawing',lines:null,source:{page:2}},
  ],
};

describe('structured response model',()=>{
  it('detects interactive source-backed questions',()=>{
    expect(structuredResponseRequired(content)).toBe(true);
  });

  it('keeps table matching and diagram data versioned',()=>{
    const response={
      version:1 as const,
      tables:{'1':{'0:1':'12','1:1':'34'}},
      matching:{'2':{l1:'r1',l2:'r2'}},
      annotations:{'3':[{id:'n1',x:.2,y:.4,text:'TOS'}]},
      lines:{'3':[{id:'p1',x1:.1,y1:.2,x2:.8,y2:.7}]},
    };
    expect(structuredResponseHasValue(response)).toBe(true);
    expect(structuredResponseSummary(content,response)).toContain('R1C2: 12');
    expect(structuredResponseSummary(content,response)).toContain('TCP → Transport');
    expect(structuredResponseSummary(content,response)).toContain('Label: TOS');
    expect(structuredResponseSummary(content,response)).toContain('Connections drawn: 1');
    expect(normalizeStructuredResponse(response)).toEqual(response);
  });

  it('fails safely to an empty v1 response for malformed local data',()=>{
    expect(normalizeStructuredResponse({version:2})).toEqual(emptyStructuredResponse());
  });
});
