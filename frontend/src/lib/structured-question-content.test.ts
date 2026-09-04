// @vitest-environment jsdom
import { describe,expect,it } from 'vitest';
import { isStructuredQuestionContent,type StructuredQuestionContent } from './structured-question-content';
import { renderStructuredQuestionContent } from './structured-question-renderer';

const content:StructuredQuestionContent={
  version:1,
  source:{
    paperId:'11111111-1111-4111-8111-111111111111',
    sha256:'b'.repeat(64),
  },
  blocks:[
    { type:'text',style:'task',text:'Complete the truth table.',source:{page:2} },
    {
      type:'math',semantics:'boolean_expression',latex:'\\overline{A} \\land B',display:true,
      source:{page:2},
    },
    {
      type:'table',kind:'truth_table',headers:['A','B','Output'],
      rows:[['0','0',null],['0','1',null]],editableCells:[[0,2],[1,2]],source:{page:2},
    },
    {
      type:'matching',left:[{id:'a',text:'Compiler'}],right:[{id:'1',text:'Whole program'}],
      source:{page:3},
    },
    {
      type:'asset',kind:'diagram',assetId:'22222222-2222-4222-8222-222222222222',
      altText:'Original source diagram',source:{page:3},
    },
  ],
};

describe('structured question frontend contract',()=>{
  it('recognises the canonical v1 shape',()=>{
    expect(isStructuredQuestionContent(content)).toBe(true);
    expect(isStructuredQuestionContent({ ...content,version:2 })).toBe(false);
  });

  it('renders semantic tables instead of flattening their cells into prose',()=>{
    const host=document.createElement('div');
    host.append(renderStructuredQuestionContent(content));
    const table=host.querySelector('table');
    expect(table?.dataset.tableKind).toBe('truth_table');
    expect(table?.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(table?.querySelectorAll('[data-editable="true"]')).toHaveLength(2);
  });

  it('keeps matching sides as separate semantic lists',()=>{
    const host=document.createElement('div');
    host.append(renderStructuredQuestionContent(content));
    expect(host.querySelector('.structured-question-matching-left')?.textContent).toContain('Compiler');
    expect(host.querySelector('.structured-question-matching-right')?.textContent).toContain('Whole program');
  });

  it('carries latex and source provenance without rewriting the expression',()=>{
    const host=document.createElement('div');
    host.append(renderStructuredQuestionContent(content));
    const math=host.querySelector<HTMLElement>('[data-question-block="math"]');
    expect(math?.dataset.latex).toBe('\\overline{A} \\land B');
    expect(math?.dataset.sourcePage).toBe('2');
  });

  it('resolves source-backed assets through the caller instead of storing URLs in content JSON',()=>{
    const host=document.createElement('div');
    host.append(renderStructuredQuestionContent(content,{
      resolveAsset:(id)=>id==='22222222-2222-4222-8222-222222222222'?'https://example.test/diagram.png':null,
    }));
    expect(host.querySelector('img')?.src).toBe('https://example.test/diagram.png');
    expect(host.querySelector('img')?.alt).toBe('Original source diagram');
  });
});
