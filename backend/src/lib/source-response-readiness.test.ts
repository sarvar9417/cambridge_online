import { describe,expect,it } from 'vitest';
import { inspectResponseReadiness,questionOnlineResponseIntegritySql } from './source-response-readiness.js';

const source={paperId:'11111111-1111-4111-8111-111111111111',sha256:'a'.repeat(64)};

describe('online structured response readiness',()=>{
  it('blocks a table-completion cue without editable source cells',()=>{
    expect(inspectResponseReadiness({
      stem:'Complete the trace table for the algorithm.',
      contentJson:{version:1,source,blocks:[{type:'text',style:'task',text:'Complete the trace table.',source:{page:1}}]},
    })).toEqual(['missing_editable_table']);
  });

  it('accepts a table-completion cue when canonical editable cells exist',()=>{
    expect(inspectResponseReadiness({
      stem:'Complete the truth table.',
      contentJson:{version:1,source,blocks:[{
        type:'table',kind:'truth_table',headers:['A','X'],rows:[['0',null]],editableCells:[[0,1]],source:{page:1},
      }]},
    })).toEqual([]);
  });

  it('routes changing-stack tasks to the dedicated stack workspace instead of demanding a table block',()=>{
    expect(inspectResponseReadiness({
      stem:'Show the changing contents of the stack as the RPN expression is evaluated.',
      contentJson:{version:1,source,blocks:[{type:'text',style:'task',text:'Show the changing contents of the stack.',source:{page:1}}]},
    })).toEqual([]);
  });

  it('blocks matching/linking prompts until source relationships are represented structurally',()=>{
    expect(inspectResponseReadiness({
      stem:'Draw a line to match each term to its description.',
      contentJson:{version:1,source,blocks:[{type:'text',style:'task',text:'Draw a line to match each term to its description.',source:{page:1}}]},
    })).toEqual(['missing_matching_structure']);
  });

  it('emits a SQL gate that checks both editable table cells and matching blocks',()=>{
    const sql=questionOnlineResponseIntegritySql('q');
    expect(sql).toContain("response_block->>'type'='table'");
    expect(sql).toContain("response_block->'editableCells'");
    expect(sql).toContain("response_block->>'type'='matching'");
    expect(sql).toContain('q.content_version=1');
  });
});
