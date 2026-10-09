import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';

const editor=readFileSync(resolve(process.cwd(),'src/student/StructuredResponseEditor.tsx'),'utf8');
const attempt=readFileSync(resolve(process.cwd(),'src/student/StudentAttemptWorkspace.tsx'),'utf8');
const live=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');
const bank=readFileSync(resolve(process.cwd(),'src/QuestionBankPage.tsx'),'utf8');

describe('source-faithful structured response workspace',()=>{
  it('supports direct cells, matching, labels, connecting lines and freehand drawing',()=>{
    expect(editor).toContain('editableCells');
    expect(editor).toContain('<select');
    expect(editor).toContain("type:'text'");
    expect(editor).toContain("type:'line'");
    expect(editor).toContain("type:'stroke'");
    expect(editor).toContain('getBoundingClientRect');
    expect(editor).toContain('/rect.width');
    expect(editor).toContain('/rect.height');
  });

  it('replaces ambiguous textareas only when a structured response surface is available',()=>{
    expect(attempt).toContain('structuredResponseInteractive');
    expect(attempt).toContain('<StructuredResponseEditor');
    expect(attempt).toContain('structuredResponses[question.id]');
    expect(live).toContain('structuredResponseInteractive');
    expect(live).toContain('<StructuredResponseEditor');
    expect(live).toContain('structuredResponse:latestStructuredResponse.current');
  });

  it('lets teachers test the same interaction from Question Bank preview',()=>{
    expect(bank).toContain('StructuredResponsePreview');
    expect(bank).toContain('Interaktiv javob');
    expect(bank).toContain('portable.responseAssets');
  });
});
