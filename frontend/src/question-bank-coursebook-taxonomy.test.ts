import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page=readFileSync(resolve(process.cwd(),'src/QuestionBankPage.tsx'),'utf8');

describe('Question Bank coursebook taxonomy',()=>{
  it('uses Chapter / Chapter section for 9618 instead of exposing raw syllabus subtopics',()=>{
    expect(page).toContain('coursebookSections');
    expect(page).toContain('coursebookSectionCodes');
    expect(page).toContain('<CheckGroup label="Chapter"');
    expect(page).toContain('<CheckGroup label="Chapter section"');
    expect(page).toContain("syllabusCode==='9618'");
  });

  it('sends coursebook sections to search and auto-paper generation',()=>{
    expect(page).toContain("value.append('coursebookSectionCodes', item)");
    expect(page).toContain("coursebookSectionCodes: syllabusCode==='9618'&&coursebookSectionCodes.length");
    expect(page).toContain("topicIds: syllabusCode==='9618' ? undefined");
    expect(page).toContain("subtopicIds: syllabusCode==='9618' ? undefined");
  });

  it('shows coursebook labels on question cards while retaining syllabus taxonomy as metadata',()=>{
    expect(page).toContain('part.coursebookSections?.length');
    expect(page).toContain('Cambridge syllabus:');
    expect(page).toContain('part.subtopics.map');
  });
});
