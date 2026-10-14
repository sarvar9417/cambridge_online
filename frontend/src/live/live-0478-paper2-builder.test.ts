import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';

const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');

describe('0478 Paper 2 teacher and student live builder',()=>{
  it('offers distinct 9618 and 0478 choices with 0478 Paper 2 only',()=>{
    expect(page).toContain('0478 — IGCSE Computer Science (Paper 2)');
    expect(page).toContain("(syllabusCode==='0478'?[2]:[1,2,3,4])");
    expect(page).toContain('0478 Paper 2 — Syllabus topics (7–10)');
    expect(page).toContain('syllabusCode,topicIds:[]');
  });
  it('never sends 9618 chapters as 0478 filters',()=>{
    expect(page).toContain("syllabusCode==='9618'?coursebookSectionCodes:[]");
    expect(page).toContain("syllabusCode==='0478'?selected0478SubtopicIds:[]");
    expect(page).toContain("syllabusCode==='0478'?selected0478SubtopicIds.join(','):''");
    expect(page).toContain('setSelected0478SubtopicIds([])');
  });
  it('allows 0478 Paper 2 full pool when no subtopics are ticked',()=>{
    expect(page).toContain("syllabusCode==='9618'&&!coursebookSectionCodes.length");
    expect(page).toContain('Hech biri belgilanmasa barcha Live-ready Paper 2');
  });
  it('keeps the normal student and staff feature flows',()=>{
    expect(page).toContain("practiceMode:user.role==='student'?practiceMode:undefined");
    expect(page).toContain("api<{id:string}>('/live-exams'");
    expect(page).toContain("api<SelectionPreview>('/live-exams/selection-preview'");
    expect(page).toContain("'/live-exams/sections'");
  });
});
