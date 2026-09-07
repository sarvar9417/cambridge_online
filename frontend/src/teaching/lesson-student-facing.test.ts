import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { LESSON_CHAPTERS, type LessonRichBlock, type LessonSlide } from './lesson-content-source-complete';
import { studentFacingSlide, studentFacingText, TEACHER_DIRECTIVE_PATTERN } from './lesson-student-facing';

function richText(block:LessonRichBlock):string[]{
  if(block.kind==='paragraph')return[block.text];
  if(block.kind==='bullets')return block.items;
  if(block.kind==='steps')return[block.title??'',...block.items];
  if(block.kind==='callout')return[block.title,block.text];
  if(block.kind==='comparison')return[block.leftTitle,block.rightTitle,...block.rows.flat()];
  if(block.kind==='source-note')return[block.title,block.sourceLabel,block.sourceText,block.examSafeLabel,block.examSafeText];
  if(block.kind==='table')return[block.table.caption??'',...block.table.headers,...block.table.rows.flat()];
  return[];
}

function directiveFields(slide:LessonSlide){
  return [
    slide.lead,
    slide.teacherPrompt??'',
    slide.activity?.title??'',
    slide.activity?.prompt??'',
    ...(slide.richBlocks??[]).flatMap(richText),
  ].filter(Boolean);
}

describe('student-facing lesson projection',()=>{
  it('turns common teacher directions into direct learner prompts without changing the academic proposition',()=>{
    expect(studentFacingText('Ask learners to convert 00110101₂ to denary.')).toBe('Convert 00110101₂ to denary.');
    expect(studentFacingText('Ask for examples of hardware states that can be treated as two-state decisions.')).toBe('Give examples of hardware states that can be treated as two-state decisions.');
    expect(studentFacingText('Ask why hardware designers prefer reusing adder circuitry.')).toBe('Why hardware designers prefer reusing adder circuitry?');
    expect(studentFacingText('Start with one question: “What tells the computer how to interpret those bits?”')).toBe('What tells the computer how to interpret those bits?');
    expect(studentFacingText('Use this as a five-minute retrieval check before teaching the chapter.')).toBe('Before we start, check what you already know.');
  });

  it('projects every active lesson away from teacher-directed classroom language',()=>{
    const chapters=[...LESSON_CHAPTERS,CHAPTER_7];
    const violations:string[]=[];
    for(const chapter of chapters){
      for(const sourceSlide of chapter.slides){
        const slide=studentFacingSlide(sourceSlide as LessonSlide);
        for(const text of directiveFields(slide)){
          if(TEACHER_DIRECTIVE_PATTERN.test(text))violations.push(`${chapter.number}:${slide.id}:${text}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps source provenance while presenting source notes as learner-facing exam notes',()=>{
    const source=LESSON_CHAPTERS.flatMap(chapter=>chapter.slides).find(slide=>slide.richBlocks?.some(block=>block.kind==='source-note')) as LessonSlide|undefined;
    expect(source).toBeTruthy();
    const projected=studentFacingSlide(source!);
    expect(projected.sourcePages).toEqual(source!.sourcePages);
    expect(projected.sourceElements).toEqual(source!.sourceElements);
    const note=projected.richBlocks?.find(block=>block.kind==='source-note');
    expect(note?.kind).toBe('source-note');
    if(note?.kind==='source-note'){
      expect(note.sourceLabel).toBe('Coursebook wording');
      expect(note.examSafeLabel).toBe('Exam-ready wording');
    }
  });

  it('locks the presenter against the old teacher-guide and corpus-dashboard labels',()=>{
    const source=readFileSync(new URL('./LessonStudioV2.tsx',import.meta.url),'utf8');
    expect(source).toContain('CAMBRIDGE PAST-PAPER PRACTICE');
    expect(source).toContain('THINK / EXPLAIN');
    expect(source).toContain('YOUR TURN');
    expect(source).toContain('MODEL ANSWER');
    expect(source).toContain('lesson-exam-technical');
    expect(source).not.toContain('EXACT LO MATCH');
    expect(source).not.toContain('CLASS ACTIVITY');
    expect(source).not.toContain('SOURCE FIDELITY');
    expect(source).not.toContain('slides · {chapter.coverage}');
  });
});
