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
    expect(content.blocks).toHaveLength(5);
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

  it('renders source-faithful grouped headers with colspan and rowspan',()=>{
    const grouped:StructuredQuestionContent={
      version:1,source:content.source,blocks:[{
        type:'table',kind:'selection_grid',headers:['Instruction address','ACC','365','366','367','368','IX','Output'],
        headerRows:[
          [{text:'Instruction address',column:0,rowSpan:2},{text:'ACC',column:1,rowSpan:2},{text:'Memory address',column:2,colSpan:4},{text:'IX',column:6,rowSpan:2},{text:'Output',column:7,rowSpan:2}],
          [{text:'365',column:2},{text:'366',column:3},{text:'367',column:4},{text:'368',column:5}],
        ],
        rows:[[null,null,'1','3','65','66','0',null]],editableCells:[[0,0],[0,1],[0,7]],source:{page:9},
      }],
    };
    expect(isStructuredQuestionContent(grouped)).toBe(true);
    const host=document.createElement('div');host.append(renderStructuredQuestionContent(grouped));
    const head=host.querySelector('thead');
    expect(head?.querySelectorAll('tr')).toHaveLength(2);
    expect(head?.querySelector('th[colspan="4"]')?.textContent).toBe('Memory address');
    expect(head?.querySelectorAll('th[rowspan="2"]')).toHaveLength(4);
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

  it('accepts source-faithful table assets when geometry must be preserved',()=>{
    expect(isStructuredQuestionContent({
      version:1,
      source:content.source,
      blocks:[{
        type:'asset',kind:'table',assetId:'33333333-3333-4333-8333-333333333333',
        altText:'Merged-header source table',source:{page:7},
      }],
    })).toBe(true);
  });
});
