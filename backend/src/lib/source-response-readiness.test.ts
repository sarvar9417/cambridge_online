import { describe,expect,it } from 'vitest';
import {
  portableResponseInteractionIntegrity,
  questionResponseInteractionIntegritySql,
  responseInteractionRequired,
} from './source-response-readiness.js';

const source={paperId:'11111111-1111-4111-8111-111111111111',sha256:'a'.repeat(64)};

describe('source response interaction readiness',()=>{
  it('detects genuine Cambridge response tasks but ignores ordinary prose/code completion',()=>{
    expect(responseInteractionRequired({version:1,source,blocks:[
      {type:'text',style:'task',text:'Show the changing contents of the stack as the RPN expression is evaluated.',source:{page:1}},
    ]})).toBe(true);
    expect(responseInteractionRequired({version:1,source,blocks:[
      {type:'text',style:'task',text:'Complete the following table.',source:{page:1}},
    ]})).toBe(true);
    expect(responseInteractionRequired({version:1,source,blocks:[
      {type:'text',style:'task',text:'Complete the pseudocode for the function.',source:{page:1}},
    ]})).toBe(false);
    expect(responseInteractionRequired({version:1,source,blocks:[
      {type:'text',style:'task',text:'Copy and paste the program code into the evidence document.',source:{page:1}},
    ]})).toBe(false);
  });

  it('accepts semantic editable tables or a renderable source response asset',()=>{
    const table={version:1,source,blocks:[
      {type:'text',style:'task',text:'Complete the following table.',source:{page:1}},
      {type:'table',kind:'data',headers:['A','B'],rows:[[null,'x']],editableCells:[[0,0]],source:{page:1}},
    ]};
    expect(portableResponseInteractionIntegrity(table,[])).toBe(true);
    const visualOnly={version:1,source,blocks:[
      {type:'text',style:'task',text:'Show the changing contents of the stack as the RPN expression is evaluated.',source:{page:1}},
    ]};
    expect(portableResponseInteractionIntegrity(visualOnly,[{
      id:'asset',kind:'table',url:'https://signed.example/stack.png',contentMd:null,
    }])).toBe(true);
    expect(portableResponseInteractionIntegrity(visualOnly,[])).toBe(false);
  });

  it('emits an SQL integrity predicate usable in cached and dynamic Live selection',()=>{
    const sql=questionResponseInteractionIntegritySql('q');
    expect(sql).toContain("response_cue->>'style'='task'");
    expect(sql).toContain("response_block->>'type'='matching'");
    expect(sql).toContain("response_asset.question_id=q.id");
  });
});
