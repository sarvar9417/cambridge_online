import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');

describe('Live Challenge coursebook chapter taxonomy',()=>{
  it('uses chapter sections instead of exposing raw syllabus subtopics as the classroom picker',()=>{
    expect(page).toContain('coursebookSections');
    expect(page).toContain('coursebookSectionCodes');
    expect(page).toContain('<legend>Chapter</legend>');
    expect(page).toContain('<legend>Chapter section</legend>');
    expect(page).not.toContain('<legend>Subtopic</legend>');
  });

  it('sends textbook section codes to both availability and session creation',()=>{
    expect(page).toContain("coursebookSectionCodes:coursebookSectionCodes.join(',')");
    expect(page).toContain('topicIds:[],subtopicIds:[],coursebookSectionCodes');
    expect(page).toContain('!coursebookSectionCodes.length');
  });
});
