import { describe, expect, it } from 'vitest';
import type { StructuredQuestionContent } from './structured-question-content';
import {
  humanizeStoredAnswer,
  parseStoredAnswer,
  serializeStructuredAnswer,
  setStructuredField,
  structuredAnswerHasContent,
  structuredResponsePlan,
} from './structured-answer';

const tableContent:StructuredQuestionContent={
  version:1,
  source:{paperId:'paper',sha256:'abc'},
  blocks:[{
    type:'table',kind:'table',headers:['Term','Description'],
    rows:[['Pixel',null],['Header',null]],
    editableCells:[[0,1],[1,1]],
    source:{page:1},
  }],
};

describe('structured answer envelope',()=>{
  it('round-trips table cells without turning the answer into opaque UI text',()=>{
    let answer=parseStoredAnswer('');
    answer=setStructuredField(answer,'table.0.0.1','smallest picture element');
    const stored=serializeStructuredAnswer(answer);
    expect(stored).toContain('CAMPATH_RESPONSE_V1:');
    expect(parseStoredAnswer(stored).fields['table.0.0.1']).toBe('smallest picture element');
    expect(humanizeStoredAnswer(stored)).toContain('Jadval: qator 1, ustun 2 = smallest picture element');
    expect(structuredAnswerHasContent(stored)).toBe(true);
  });

  it('detects semantic tables as inline response surfaces',()=>{
    expect(structuredResponsePlan(tableContent,'table','Complete the table.')).toMatchObject({
      mode:'inline',
      inlineKinds:['table'],
    });
  });

  it('routes stack-state questions to the dedicated stack workspace',()=>{
    expect(structuredResponsePlan(null,'table','Show the changing contents of the stack while evaluating the RPN expression.').mode)
      .toBe('stack');
  });

  it('routes drawing answer areas to the diagram workspace',()=>{
    const content:StructuredQuestionContent={
      version:1,source:{paperId:'paper',sha256:'abc'},
      blocks:[{type:'answer_area',kind:'drawing',lines:null,source:{page:1}}],
    };
    expect(structuredResponsePlan(content,'text','Complete the diagram.').mode).toBe('diagram');
  });
});
