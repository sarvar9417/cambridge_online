import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');

describe('Live Challenge coursebook chapter taxonomy',()=>{
  it('uses chapter sections instead of exposing raw syllabus subtopics as the classroom picker',()=>{
    expect(page).toContain('coursebookSections');
    expect(page).toContain('coursebookSectionCodes');
    expect(page).toContain("?'IGCSE Book Chapter':'Chapter'");
    expect(page).toContain("?'IGCSE Chapter Section':'Chapter section'");
    expect(page).not.toContain('<legend>Subtopic</legend>');
  });

  it('sends textbook section codes to both availability and session creation',()=>{
    expect(page).toContain("coursebookSectionCodes:syllabusCode==='9618'?coursebookSectionCodes.join(','):''");
    expect(page).toContain("coursebookSectionCodes:syllabusCode==='9618'?coursebookSectionCodes:[]");
    expect(page).toContain("igcseBookSectionCodes:syllabusCode==='0478'?selected0478BookSectionCodes.join(','):''");
    expect(page).toContain("igcseBookSectionCodes:syllabusCode==='0478'?selected0478BookSectionCodes:[]");
    expect(page).toContain('const scopeReady=coursebookSections.length>0');
    expect(page).toContain('<option value="all">Barcha boblar / savollar</option>');
    expect(page).not.toContain("syllabusCode==='9618'&&!coursebookSectionCodes.length");
  });
});
