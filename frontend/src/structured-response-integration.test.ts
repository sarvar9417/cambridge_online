import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const attempt=readFileSync(resolve(process.cwd(),'src/student/StudentAttemptWorkspace.tsx'),'utf8');
const live=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');
const bank=readFileSync(resolve(process.cwd(),'src/QuestionBankPage.tsx'),'utf8');

describe('structured response integration',()=>{
  it('uses the interactive response workspace in student assignments',()=>{
    expect(attempt).toContain('StructuredResponseEditor');
    expect(attempt).toContain('structuredResponseRequired');
    expect(attempt).toContain("Qo‘shimcha izoh (ixtiyoriy)");
  });

  it('uses the same response workspace in Live Challenge',()=>{
    expect(live).toContain('StructuredResponseEditor');
    expect(live).toContain('response:latestStructuredResponse.current');
    expect(live).toContain('structuredResponseSummary');
  });

  it('renders canonical structured content in Question Bank preview',()=>{
    expect(bank).toContain('materializePortableSourceAssets');
    expect(bank).toContain('StructuredQuestionView');
    expect(bank).toContain('Source-backed preview');
  });
});
