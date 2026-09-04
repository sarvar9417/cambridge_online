import{describe,expect,it}from'vitest';
import{readableBooleanLatex,renderStructuredQuestionContent}from'./structured-question-renderer';
import type{StructuredQuestionContent}from'./structured-question-content';

const source={paperId:'11111111-1111-4111-8111-111111111111',sha256:'a'.repeat(64)};

describe('structured question DOM renderer',()=>{
 it('renders Boolean LaTeX as readable exam notation while preserving canonical LaTeX',()=>{
  expect(readableBooleanLatex('\\overline{A} \\land B \\oplus C')).toBe('A̅ ∧ B ⊕ C');
  const content:StructuredQuestionContent={version:1,source,blocks:[{type:'math',semantics:'boolean_expression',latex:'\\overline{A} \\land B',display:true,source:{page:4}}]};
  const host=document.createElement('div');host.append(renderStructuredQuestionContent(content));
  const math=host.querySelector<HTMLElement>('[data-question-block="math"]');
  expect(math?.textContent).toBe('A̅ ∧ B');
  expect(math?.dataset.latex).toBe('\\overline{A} \\land B');
  expect(math?.dataset.sourcePage).toBe('4');
 });
 it('renders verified assets by stable id and fails visibly when unresolved',()=>{
  const assetId='22222222-2222-4222-8222-222222222222';
  const content:StructuredQuestionContent={version:1,source,blocks:[{type:'asset',kind:'logic_circuit',assetId,altText:'Logic circuit',source:{page:2}}]};
  const ready=document.createElement('div');ready.append(renderStructuredQuestionContent(content,{resolveAsset:id=>id===assetId?'https://signed.example/circuit.png':null}));
  expect(ready.querySelector('img')?.getAttribute('src')).toBe('https://signed.example/circuit.png');
  const missing=document.createElement('div');missing.append(renderStructuredQuestionContent(content));
  expect(missing.querySelector('[data-asset-missing="true"]')?.textContent).toBe('Logic circuit');
 });
});
