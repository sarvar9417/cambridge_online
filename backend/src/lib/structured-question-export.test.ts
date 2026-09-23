import { describe,expect,it } from 'vitest';
import { renderStructuredQuestionHtml,structuredQuestionPrintCss } from './structured-question-export.js';

const source={
  paperId:'11111111-1111-4111-8111-111111111111',
  sha256:'a'.repeat(64),
};
const location={page:4,bbox:[1,2,300,400] as [number,number,number,number]};

describe('structured question HTML export',()=>{
  it('keeps Cambridge code blocks unboxed in print/export CSS',()=>{
    expect(structuredQuestionPrintCss).toContain('.sq-code{white-space:pre-wrap;border:0');
    expect(structuredQuestionPrintCss).toContain('background:transparent');
    expect(structuredQuestionPrintCss).not.toContain('.sq-code{white-space:pre-wrap;border:1px');
  });

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

  it('exports grouped Cambridge headers with colspan and rowspan',()=>{
    const html=renderStructuredQuestionHtml({version:1,source,blocks:[{
      type:'table',kind:'selection_grid',headers:['Instruction address','ACC','365','366','367','368','IX','Output'],
      headerRows:[
        [{text:'Instruction address',column:0,rowSpan:2},{text:'ACC',column:1,rowSpan:2},{text:'Memory address',column:2,colSpan:4},{text:'IX',column:6,rowSpan:2},{text:'Output',column:7,rowSpan:2}],
        [{text:'365',column:2},{text:'366',column:3},{text:'367',column:4},{text:'368',column:5}],
      ],
      rows:[[null,null,'1','3','65','66','0',null]],editableCells:[[0,0],[0,1],[0,7]],source:location,
    }]});
    expect(html).toContain('colspan="4"');
    expect(html).toContain('rowspan="2"');
    expect(html).toContain('Memory address');
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

  it('exports a source-faithful table SVG as an asset instead of flattening merged geometry',()=>{
    const assetId='33333333-3333-4333-8333-333333333333';
    const html=renderStructuredQuestionHtml({
      version:1,source,blocks:[{
        type:'asset',kind:'table',assetId,altText:'Merged Cambridge instruction table',source:location,
      }],
    },{assets:[{id:assetId,dataUri:'data:image/svg+xml;base64,PHN2Zy8+'}]});
    expect(html).toContain('sq-table');
    expect(html).toContain('data-block="asset"');
    expect(html).toContain('data-asset-id="33333333-3333-4333-8333-333333333333"');
    expect(html).toContain('data:image/svg+xml;base64,PHN2Zy8+');
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
