import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_11_FINAL } from './lesson-content-chapter11-final';
import {
  CHAPTER_11_PROGRAMMING_VISUAL_IDS,
  hasChapter11ProgrammingVisual,
} from './Chapter11ProgrammingVisuals';
import type { LessonPresentationBeat } from './lesson-experience-model';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const visualSource=source('Chapter11ProgrammingVisuals.tsx');
const css=source('chapter11-programming-visuals.css');
const facade=source('Chapter14PresentationVisualsV4.tsx');

const beat=(slideId:string):LessonPresentationBeat=>({id:`${slideId}-concept-1`,slideId,kind:'concept',eyebrow:'TEST',title:'Test',sourcePages:[]});

describe('Cambridge 9618 Chapter 11 programming classroom visuals',()=>{
  it('targets only real source-backed slides in the final Chapter 11 route',()=>{
    const slideIds=new Set(CHAPTER_11_FINAL.slides.map(slide=>slide.id));
    expect(CHAPTER_11_PROGRAMMING_VISUAL_IDS.length).toBeGreaterThanOrEqual(12);
    for(const id of CHAPTER_11_PROGRAMMING_VISUAL_IDS)expect(slideIds.has(id)).toBe(true);
  });

  it('recognises Chapter 11 targets without leaking into adjacent chapters',()=>{
    expect(CHAPTER_11_PROGRAMMING_VISUAL_IDS.every(id=>id.startsWith('h11-'))).toBe(true);
    expect(hasChapter11ProgrammingVisual(beat('h11-1132-functions'))).toBe(true);
    expect(hasChapter11ProgrammingVisual(beat('h10-1041-stack'))).toBe(false);
    expect(hasChapter11ProgrammingVisual(beat('h12-overview'))).toBe(false);
  });

  it('covers source-specific identifier, control-structure and subroutine terminology',()=>{
    for(const term of [
      'VARIABLES','CONSTANT','INPUT','VALIDATE','LENGTH','LEFT','RIGHT','MID','STANDARD LIBRARY',
      'OTHERWISE','FOR … NEXT','REPEAT … UNTIL','WHILE … DO','PROCEDURE','parameter','argument',
      'BY VALUE','BY REFERENCE','BYREF','FUNCTION','RETURNS REAL','RETURN',
    ])expect(visualSource).toContain(term);
  });

  it('keeps Chapter 11 diagrams additive to the source-backed teaching payload',()=>{
    expect(facade).toContain("import { Chapter11ProgrammingVisual, hasChapter11ProgrammingVisual } from './Chapter11ProgrammingVisuals';");
    expect(facade).toContain('hasChapter11ProgrammingVisual(beat)');
    expect(facade).toContain('return <Chapter11ProgrammingVisual beat={beat} reveal={reveal}/>;');
    const ownsBody=facade.slice(facade.indexOf('export function presentationVisualOwnsBeatContent'),facade.indexOf('export function Chapter14PresentationVisualV4'));
    expect(ownsBody).not.toContain('hasChapter11ProgrammingVisual');
  });

  it('has explicit projector fit and responsive rules without hiding content',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px) and (min-width:960px)');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).not.toMatch(/display\s*:\s*none/);
  });
});
