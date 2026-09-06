import{describe,expect,it}from'vitest';
import{readableBooleanLatex,readableMathLatex,renderStructuredQuestionContent}from'./structured-question-renderer';
import type{StructuredQuestionContent}from'./structured-question-content';

const source={paperId:'11111111-1111-4111-8111-111111111111',sha256:'a'.repeat(64)};

describe('structured question DOM renderer',()=>{
 it('renders Boolean LaTeX as readable exam notation while preserving canonical LaTeX',()=>{
  expect(readableBooleanLatex('\\overline{A} \\land B \\oplus C')).toBe('A̅ ∧ B ⊕ C');
  expect(readableBooleanLatex('Z \\mathrm{is}\\,1\\,\\mathrm{if} A \\mathrm{NAND} B')).toBe('Z is 1 if A NAND B');
  const content:StructuredQuestionContent={version:1,source,blocks:[{type:'math',semantics:'boolean_expression',latex:'\\overline{A} \\land B',display:true,source:{page:4}}]};
  const host=document.createElement('div');host.append(renderStructuredQuestionContent(content));
  const math=host.querySelector<HTMLElement>('[data-question-block="math"]');
  expect(math?.textContent).toBe('A̅ ∧ B');
  expect(math?.dataset.latex).toBe('\\overline{A} \\land B');
  expect(math?.dataset.sourcePage).toBe('4');
 });
 it('does not expose raw LaTeX control words for ordinary math',()=>{
  expect(readableMathLatex('\\frac{5}{8} \\times 2^{3}')).toBe('(5)/(8) × 2^3');
 });
 it('renders verified assets by stable id and fails visibly when unresolved',()=>{
  const assetId='22222222-2222-4222-8222-222222222222';
  const content:StructuredQuestionContent={version:1,source,blocks:[{type:'asset',kind:'logic_circuit',assetId,altText:'Logic circuit',source:{page:2}}]};
  const ready=document.createElement('div');ready.append(renderStructuredQuestionContent(content,{resolveAsset:id=>id===assetId?'https://signed.example/circuit.png':null}));
  const image=ready.querySelector('img');
  expect(image?.getAttribute('src')).toBe('https://signed.example/circuit.png');
  expect(image?.getAttribute('role')).toBe('button');
  expect(image?.tabIndex).toBe(0);
  const missing=document.createElement('div');missing.append(renderStructuredQuestionContent(content));
  expect(missing.querySelector('[data-asset-missing="true"]')?.textContent).toBe('Logic circuit');
 });
 it('renders a Karnaugh map with source-order Gray-code axes and editable cells',()=>{
  const content:StructuredQuestionContent={version:1,source,blocks:[{
   type:'table',kind:'k_map',headers:['','00','01','11','10'],
   rows:[['00',null,null,null,null],['01',null,null,null,null],['11',null,null,null,null],['10',null,null,null,null]],
   editableCells:Array.from({length:4},(_,r)=>Array.from({length:4},(__,c)=>[r,c+1] as [number,number])).flat(),source:{page:7},
  }]};
  const host=document.createElement('div');host.append(renderStructuredQuestionContent(content));
  const table=host.querySelector<HTMLTableElement>('[data-table-kind="k_map"]');
  expect(table?.querySelector('.structured-question-k-map-axis')?.textContent).toBe('ABCD');
  expect(table?.querySelectorAll('tbody th')).toHaveLength(4);
  expect(table?.querySelectorAll('td[data-editable="true"]')).toHaveLength(16);
 });
 it('renders trace tables as semantic source-backed grids',()=>{
  const content:StructuredQuestionContent={version:1,source,blocks:[{
   type:'table',kind:'trace_table',headers:['Instruction address','ACC','80','81'],
   rows:[[null,null,'10','8'],[null,null,null,null]],editableCells:[[0,0],[0,1],[1,0],[1,1],[1,2],[1,3]],source:{page:15},
  }]};
  const host=document.createElement('div');host.append(renderStructuredQuestionContent(content));
  expect(host.querySelector('[data-table-kind="trace_table"]')?.textContent).toContain('Instruction address');
  expect(host.querySelectorAll('td[data-editable="true"]')).toHaveLength(6);
 });
});
