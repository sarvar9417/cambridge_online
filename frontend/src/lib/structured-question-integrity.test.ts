import { describe, expect, it } from 'vitest';
import { inspectStructuredQuestionIntegrity } from './structured-question-integrity';
import type { StructuredQuestionContent } from './structured-question-content';

const source={paperId:'11111111-1111-4111-8111-111111111111',sha256:'a'.repeat(64)};

function content(blocks:StructuredQuestionContent['blocks']):StructuredQuestionContent {
  return {version:1,source,blocks};
}

describe('structured question presentation integrity',()=>{
  it('blocks numbered statement tables that were flattened into prose',()=>{
    const findings=inspectStructuredQuestionIntegrity(content([{
      type:'text',style:'paragraph',source:{page:1},
      text:'The table has six statements. Statement number Statement 1 The Program Counter stores the next instruction. 2 The Arithmetic and Logic Unit performs mathematical operations. 3 The Control Unit sends signals. 4 The Memory Data Register transfers data. 5 The MAR stores an address. 6 The Accumulator stores the result.',
    }]));
    expect(findings.map((finding)=>finding.code)).toContain('flattened_table_in_text');
  });

  it('does not treat ordinary numbered prose as a table',()=>{
    const findings=inspectStructuredQuestionIntegrity(content([{
      type:'text',style:'task',source:{page:1},
      text:'Give two reasons why cache memory can improve performance. Your answer should refer to stages 1, 2 and 3 of the process where appropriate.',
    }]));
    expect(findings).toEqual([]);
  });

  it('blocks duplicated semantic tables inside prose',()=>{
    const findings=inspectStructuredQuestionIntegrity(content([
      {
        type:'text',style:'paragraph',source:{page:1},
        text:'Register Purpose PC Holds the address of the next instruction MAR Holds a memory address MDR Holds data being transferred.',
      },
      {
        type:'table',kind:'table',headers:['Register','Purpose'],rows:[
          ['PC','Holds the address of the next instruction'],
          ['MAR','Holds a memory address'],
          ['MDR','Holds data being transferred'],
        ],editableCells:[],source:{page:1},
      },
    ]));
    expect(findings.map((finding)=>finding.code)).toContain('duplicate_table_text');
  });
});
