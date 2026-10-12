import { describe,expect,it } from 'vitest';
import type { StructuredQuestionContent } from './structured-question-content';
import {
  emptyStructuredResponse,
  parseStructuredResponse,
  serializeStructuredResponse,
  structuredResponseHasValue,
  structuredResponseMode,
  structuredResponseSummary,
} from './structured-response';

const source={paperId:'11111111-1111-4111-8111-111111111111',sha256:'a'.repeat(64)};
const base=(blocks:StructuredQuestionContent['blocks']):StructuredQuestionContent=>({version:1,source,blocks});

describe('structured response contract',()=>{
  it('round-trips table, matching, drawing and stack data through answer_text',()=>{
    const response=emptyStructuredResponse();
    response.tables['table:0:1:2']='1';
    response.matches['match:1:a']='b';
    response.drawings['drawing:0']=[{points:[{x:.1,y:.2},{x:.4,y:.5}]}];
    response.stack={steps:[['A','B'],['A','C']]};
    const encoded=serializeStructuredResponse(response);
    expect(parseStructuredResponse(encoded)).toEqual(response);
    expect(structuredResponseHasValue(parseStructuredResponse(encoded))).toBe(true);
    const summary=structuredResponseSummary(encoded);
    expect(summary).toContain('Jadval javoblari');
    expect(summary).toContain('Moslashtirish');
    expect(summary).toContain('Diagrammaga');
    expect(summary).toContain('Stack holatlari');
  });

  it('does not mark an empty structured response as answered',()=>{
    const encoded=serializeStructuredResponse(emptyStructuredResponse());
    expect(structuredResponseHasValue(parseStructuredResponse(encoded))).toBe(false);
  });

  it('chooses a response workspace from canonical source structure rather than answerKind alone',()=>{
    expect(structuredResponseMode(base([{
      type:'table',kind:'table',headers:['x'],rows:[[null]],editableCells:[[0,0]],source:{page:1},
    }]),'text','Complete the table.')).toBe('table');

    expect(structuredResponseMode(base([{
      type:'matching',left:[{id:'a',text:'A'}],right:[{id:'b',text:'B'}],source:{page:1},
    }]),'text','Match the items.')).toBe('matching');

    expect(structuredResponseMode(base([{
      type:'answer_area',kind:'drawing',lines:null,source:{page:1},
    }]),'diagram','Complete the diagram.')).toBe('drawing');

    expect(structuredResponseMode(base([{
      type:'text',style:'task',text:'Show the changing contents of the stack.',source:{page:1},
    }]),'text','Show the changing contents of the stack as the RPN expression is evaluated.')).toBe('stack');
  });
});
