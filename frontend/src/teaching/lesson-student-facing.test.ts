import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { LESSON_CHAPTERS, type LessonRichBlock, type LessonSlide } from './lesson-content-source-complete';
import {
  AUTHORING_META_PATTERN,
  studentFacingSlide,
  studentFacingText,
  TEACHER_DIRECTIVE_PATTERN,
} from './lesson-student-facing';

function richText(block:LessonRichBlock):string[]{
  if(block.kind==='paragraph')return[block.text];
  if(block.kind==='bullets')return block.items;
  if(block.kind==='steps')return[block.title??'',...block.items];
  if(block.kind==='callout')return[block.title,block.text];
  if(block.kind==='comparison')return[block.leftTitle,block.rightTitle,...block.rows.flat()];
  if(block.kind==='source-note')return[]; // attribution is intentional inside the learner-facing Exam note.
  if(block.kind==='table')return[block.table.caption??'',...block.table.headers,...block.table.rows.flat()];
  return[];
}

function primaryLearnerFields(slide:LessonSlide){
  return [
    slide.eyebrow,
    slide.title,
    slide.lead,
    slide.teacherPrompt??'',
    slide.activity?.title??'',
    slide.activity?.prompt??'',
    ...(slide.bullets??[]),
    ...(slide.keyTerms??[]).map(item=>item.definition),
    ...(slide.richBlocks??[]).flatMap(richText),
  ].filter((value):value is string=>Boolean(value));
}

describe('student-facing lesson projection',()=>{
  it('turns common teacher directions into direct learner prompts without changing the academic proposition',()=>{
    expect(studentFacingText('Ask learners to convert 00110101₂ to denary.')).toBe('Convert 00110101₂ to denary.');
    expect(studentFacingText('Ask for examples of hardware states that can be treated as two-state decisions.')).toBe('Give examples of hardware states that can be treated as two-state decisions.');
    expect(studentFacingText('Ask why hardware designers prefer reusing adder circuitry.')).toBe('Why hardware designers prefer reusing adder circuitry?');
    expect(studentFacingText('Start with one question: “What tells the computer how to interpret those bits?”')).toBe('What tells the computer how to interpret those bits?');
    expect(studentFacingText('Use this as a five-minute retrieval check before teaching the chapter.')).toBe('Before we start, check what you already know.');
    expect(studentFacingText('Hodder begins by checking whether learners can select primitive types and define a record.')).toBe('Before you start, check that you can select primitive types and define a record.');
    expect(studentFacingText('Hodder teaches two denary-to-binary routes: weighted columns and repeated division by 2.')).toBe('Learn two denary-to-binary routes: weighted columns and repeated division by 2.');
  });

  it('projects every active lesson away from teacher-directed and authoring-meta language',()=>{
    const chapters=[...LESSON_CHAPTERS,CHAPTER_7];
    const violations:string[]=[];
    for(const chapter of chapters){
      for(const sourceSlide of chapter.slides){
        const slide=studentFacingSlide(sourceSlide as LessonSlide);
        for(const text of primaryLearnerFields(slide)){
          if(TEACHER_DIRECTIVE_PATTERN.test(text)||AUTHORING_META_PATTERN.test(text)){
            violations.push(`${chapter.number}:${slide.id}:${text}`);
          }
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
    const source=readFileSync(join(process.cwd(),'src/teaching/LessonStudioV2.tsx'),'utf8');
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

  it('keeps the learner task visible, the answer gated, and the canonical Cambridge workspace installed',()=>{
    const studio=readFileSync(join(process.cwd(),'src/teaching/LessonStudioV2.tsx'),'utf8');
    const entry=readFileSync(join(process.cwd(),'src/teaching/LessonStudio.tsx'),'utf8');
    const css=readFileSync(join(process.cwd(),'src/teaching/lesson-student-facing.css'),'utf8');
    const chapter7=readFileSync(join(process.cwd(),'src/teaching/Chapter7SlideBody.tsx'),'utf8');

    expect(studio).toContain('<p>{activity.prompt}</p>');
    expect(studio).toContain("revealed&&<div className=\"lesson-student-model-answer\"");
    expect(studio).toContain('1 · Attempt independently');
    expect(studio).toContain('3 · Check the mark scheme');
    expect(entry).toContain("import './lesson-exam-workspace-v3';");
    expect(entry).toContain("import './lesson-question-workspace-controls';");
    expect(css).toContain('.lesson-exam-technical');
    expect(css).toContain('.lesson-toolbar .lesson-teacher-evidence');
    expect(chapter7).toContain('THINK / EXPLAIN');
    expect(chapter7).toContain('YOUR TURN');
    expect(chapter7).toContain('MODEL ANSWER');
    expect(chapter7).not.toContain('<span>INSTRUCTION</span>');
  });
});
