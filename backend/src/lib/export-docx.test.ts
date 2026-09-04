import { describe,expect,it } from 'vitest';
import { buildDocx } from './export-docx.js';

const source={paperId:'11111111-1111-4111-8111-111111111111',sha256:'d'.repeat(64)};
const location={page:6};

describe('DOCX export',()=>{
  it('builds an editable OpenXML package with question metadata',()=>{
    const file=buildDocx('Testing worksheet',[{displayRef:'Q1',sourceRef:'9618/12/M/J/23 Q4(a)',stem:'Explain the test.',marks:3,answerLines:2}]);
    expect(file.subarray(0,2).toString()).toBe('PK');
    const text=file.toString('utf8');
    expect(text).toContain('[Content_Types].xml');
    expect(text).toContain('word/document.xml');
    expect(text).toContain('Testing worksheet');
    expect(text).toContain('9618/12/M/J/23 Q4(a)');
    expect(text).toContain('Explain the test.');
    expect(text).toContain('Name:');
  });

  it('renders markdown tables as real Word tables and pseudocode as editable text',()=>{
    const file=buildDocx('T',[{displayRef:'Q1',stem:'Complete.',marks:2,contextBlocks:[{assets:[
      {kind:'table',contentMd:'| id | name |\n| --- | --- |\n| 1 | Ada |'},
      {kind:'pseudocode',contentMd:'FOR i ← 1 TO 3\n  OUTPUT i\nNEXT i'},
    ]}]}]);
    const text=file.toString('utf8');
    expect(text).toContain('<w:tbl>');
    expect(text).toContain('Ada');
    expect(text).toContain('FOR i');
    expect(text).toContain('Courier New');
  });

  it('embeds SVG diagrams as Word media with DrawingML relationships',()=>{
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect width="200" height="100"/></svg>';
    const file=buildDocx('T',[{displayRef:'Q1',stem:'Use diagram.',marks:2,contextBlocks:[{assets:[{kind:'diagram',altText:'Logic diagram',contentMd:svg}]}]}]);
    const text=file.toString('utf8');
    expect(text).toContain('word/media/diagram-1.svg');
    expect(text).toContain('image/svg+xml');
    expect(text).toContain('rIdImage1');
    expect(text).toContain('<w:drawing>');
    expect(text).toContain('<asvg:svgBlip');
    expect(text).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
  });

  it('prefers a canonical truth table over its flattened legacy stem',()=>{
    const text=buildDocx('T',[{
      displayRef:'Q1',stem:'Complete table A B Output',marks:2,
      contentJson:{version:1,source,blocks:[{
        type:'table',kind:'truth_table',headers:['A','B','Output'],
        rows:[['0','0',null],['0','1',null]],editableCells:[[0,2],[1,2]],source:location,
      }]},
    }]).toString('utf8');
    expect(text).toContain('<w:tbl>');
    expect(text).toContain('Output');
    expect(text).not.toContain('Complete table A B Output');
  });

  it('writes Boolean expressions as editable Word math content',()=>{
    const text=buildDocx('T',[{
      displayRef:'Q1',stem:'Flattened Boolean expression',marks:1,
      contentJson:{version:1,source,blocks:[{
        type:'math',semantics:'boolean_expression',latex:'\\overline{A} \\land B',display:true,source:location,
      }]},
    }]).toString('utf8');
    expect(text).toContain('xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"');
    expect(text).toContain('<m:oMath>');
    expect(text).toContain('∧ B');
    expect(text).not.toContain('Flattened Boolean expression');
  });

  it('embeds a canonical source asset by stable asset id',()=>{
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><path d="M0 30h100"/></svg>';
    const assetId='22222222-2222-4222-8222-222222222222';
    const text=buildDocx('T',[{
      displayRef:'Q1',stem:'Flattened diagram',marks:2,
      contentJson:{version:1,source,blocks:[{type:'asset',kind:'logic_circuit',assetId,altText:'Logic circuit',source:location}]},
      contextBlocks:[{assets:[{id:assetId,kind:'diagram',contentMd:svg,altText:'Logic circuit'}]}],
    }]).toString('utf8');
    expect(text).toContain('word/media/diagram-');
    expect(text).toContain('<w:drawing>');
  });

  it('supports mark-scheme-only output',()=>{
    const text=buildDocx('MS',[{displayRef:'Q2',sourceRef:'old Q2',stem:'Question',marks:2,points:[{code:'MP1',text:'First point',marks:1},{code:'MP2',text:'Second point',marks:1}]}],'mark_scheme').toString('utf8');
    expect(text).toContain('Mark Scheme');
    expect(text).toContain('MP1');
    expect(text).toContain('Second point');
    expect(text).not.toContain('Question</w:t>');
  });

  it('fails closed for a missing storage-only visual',()=>{
    expect(()=>buildDocx('T',[{displayRef:'Q1',stem:'Use diagram',marks:2,contextBlocks:[{assets:[{kind:'diagram',storagePath:'supabase://question-assets/q1.png',altText:'Diagram'}]}]}])).toThrow('export_asset_unavailable');
  });

  it('fails closed when canonical content references an unresolved asset id',()=>{
    expect(()=>buildDocx('T',[{
      displayRef:'Q1',stem:'Diagram',marks:1,
      contentJson:{version:1,source,blocks:[{type:'asset',kind:'diagram',assetId:'22222222-2222-4222-8222-222222222222',altText:'Required diagram',source:location}]},
    }])).toThrow('export_structured_asset_unavailable');
  });
});
