import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repository=readFileSync(resolve(process.cwd(),'src/repositories/questions-repository.ts'),'utf8');
const questionsRoute=readFileSync(resolve(process.cwd(),'src/routes/questions.ts'),'utf8');
const selectionsRoute=readFileSync(resolve(process.cwd(),'src/routes/selections.ts'),'utf8');
const generator=readFileSync(resolve(process.cwd(),'src/services/selection-generator-service.ts'),'utf8');

describe('Question Bank coursebook taxonomy integration',()=>{
  it('filters Question Bank results using the shared coursebook bridge',()=>{
    expect(repository).toContain('coursebookSectionCodes?: string[]');
    expect(repository).toContain('liveCoursebookQuestionFilter(values,filters.coursebookSectionCodes');
    expect(repository).toContain('coursebookSectionsForEvidence');
    expect(repository).toContain('coursebookSections');
    expect(questionsRoute).toContain('coursebookSectionCodes: coursebookSectionList');
  });

  it('keeps auto-paper generation on the same taxonomy contract',()=>{
    expect(selectionsRoute).toContain('coursebookSectionCodes: z.array');
    expect(generator).toContain('coursebookSectionCodes?: string[]');
    expect(generator).toContain('liveCoursebookQuestionFilter(values,input.coursebookSectionCodes');
  });

  it('keeps official syllabus evidence available while exposing coursebook labels',()=>{
    expect(repository).toContain("'topicNumber',topic.number");
    expect(repository).toContain("'subtopicCode',st.code");
    expect(repository).toContain("'text',lo.text");
    expect(repository).toContain("lo_syllabus.code='9618'");
  });
});
