import { describe,expect,it } from 'vitest';
import { renderStructuredQuestionHtml } from './structured-question-export.js';

const source={
  paperId:'11111111-1111-4111-8111-111111111111',
  sha256:'a'.repeat(64),
};
const location={page:4,bbox:[1,2,300,400] as [number,number,number,number]};

describe('structured question HTML export',()=>{
  it('renders truth tables as real tables with answer cells',()=>{
    const html=renderStructuredQuestionHtml({
      version:1,source,blocks:[{
        type:'table',kind:'truth_table',headers:['A','B','Output'],
        rows:[['0','0',null],['0','1',null]],editableCells:[[0,2],[1,2]],source:location,
      }],
    });
    expect(html).toContain('<table');
    expect(html).toContain('data-table-kind="truth_table"');
    expect(html.match(/data-answer-cell="true"/g)).toHaveLength(2);
    expect(html).toContain('data-source-page="4"');
  });

  it('keeps matching columns semantically separate',()=>{
    const html=renderStructuredQuestionHtml({
      version:1,source,blocks:[{
        type:'matching',
        left:[{id:'a',text:'Compiler'},{id:'b',text:'Interpreter'}],
        right:[{id:'1',text:'Whole program'},{id:'2',text:'One statement'}],
        source:location,
      }],
    });
    expect(html).toContain('sq-matching-left');
    expect(html).toContain('sq-matching-right');
    expect(html).toContain('Compiler');
    expect(html).toContain('Whole program');
  });

  it('renders common Boolean LaTeX without flattening NOT/AND semantics',()=>{
    const latex='\\overline{A} \\land B';
    const html=renderStructuredQuestionHtml({
      version:1,source,blocks:[{
        type:'math',semantics:'boolean_expression',latex,display:true,source:location,
      }],
    });
    expect(html).toContain('data-latex="\\overline{A} \\land B"');
    expect(html).toContain('<span class="sq-overline">A</span> ∧ B');
  });

  it('uses an explicit source-backed asset resolver for diagrams',()=>{
    const assetId='22222222-2222-4222-8222-222222222222';
    const html=renderStructuredQuestionHtml({
      version:1,source,blocks:[{
        type:'asset',kind:'logic_circuit',assetId,altText:'Logic circuit',source:location,
      }],
    },{assets:[{id:assetId,dataUri:'data:image/png;base64,AAAA'}]});
    expect(html).toContain('data-asset-id="22222222-2222-4222-8222-222222222222"');
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).toContain('alt="Logic circuit"');
  });

  it('does not silently drop an unresolved source visual',()=>{
    const html=renderStructuredQuestionHtml({
      version:1,source,blocks:[{
        type:'asset',kind:'diagram',assetId:'22222222-2222-4222-8222-222222222222',
        altText:'Required source diagram',source:location,
      }],
    });
    expect(html).toContain('sq-asset-missing');
    expect(html).toContain('Required source diagram');
  });
});
