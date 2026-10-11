import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const editor=readFileSync(resolve(process.cwd(),'src/student/StructuredResponseEditor.tsx'),'utf8');
const assignment=readFileSync(resolve(process.cwd(),'src/student/StudentAttemptWorkspace.tsx'),'utf8');
const live=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');
const bank=readFileSync(resolve(process.cwd(),'src/QuestionBankPage.tsx'),'utf8');

describe('structured Cambridge response UI contract',()=>{
  it('has dedicated controls for tables, matching, stack and drawing responses',()=>{
    expect(editor).toContain("block.type==='table'");
    expect(editor).toContain("block.type==='matching'");
    expect(editor).toContain("block.type==='stack'");
    expect(editor).toContain("block.kind==='drawing'");
    expect(editor).toContain('onPointerDown={start}');
    expect(editor).toContain("block.mode==='multiple'");
  });

  it('uses the same editor in assignments and Live Challenge instead of forcing a textarea',()=>{
    expect(assignment).toContain('<StructuredResponseEditor');
    expect(assignment).toContain('hasStructuredResponseControls');
    expect(live).toContain('<StructuredResponseEditor');
    expect(live).toContain('latestStructuredAnswer');
    expect(live).toContain('responsePayload:latestStructuredAnswer.current');
  });

  it('previews the learner response scaffold in Question Bank',()=>{
    expect(bank).toContain('<StructuredResponsePreview');
    expect(bank).toContain('Student javob shakli');
    expect(bank).toContain('structuredQuestionAssetsReady');
  });
});
