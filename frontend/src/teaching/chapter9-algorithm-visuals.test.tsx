import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_9_FINAL } from './lesson-content-chapter9-final';
import {
  CHAPTER_9_ALGORITHM_VISUAL_IDS,
  hasChapter9AlgorithmVisual,
} from './Chapter9AlgorithmVisuals';
import type { LessonPresentationBeat } from './lesson-experience-model';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const visualSource=source('Chapter9AlgorithmVisuals.tsx');
const css=source('chapter9-algorithm-visuals.css');
const facade=source('Chapter14PresentationVisualsV4.tsx');

const beat=(slideId:string):LessonPresentationBeat=>({
  id:`${slideId}-concept-1`,
  slideId,
  kind:'concept',
  eyebrow:'TEST',
  title:'Test',
  sourcePages:[],
});

describe('Cambridge 9618 Chapter 9 algorithm classroom visuals',()=>{
  it('targets real source-backed slides in the final Chapter 9 route',()=>{
    const slideIds=new Set(CHAPTER_9_FINAL.slides.map(slide=>slide.id));
    expect(CHAPTER_9_ALGORITHM_VISUAL_IDS.length).toBeGreaterThanOrEqual(12);
    for(const id of CHAPTER_9_ALGORITHM_VISUAL_IDS)expect(slideIds.has(id)).toBe(true);
  });

  it('recognises Chapter 9 targets without leaking into other syllabus chapters',()=>{
    expect(CHAPTER_9_ALGORITHM_VISUAL_IDS.every(id=>id.startsWith('h9-'))).toBe(true);
    expect(hasChapter9AlgorithmVisual(beat('h9-911-abstraction'))).toBe(true);
    expect(hasChapter9AlgorithmVisual(beat('h8-815-normalisation-rules'))).toBe(false);
    expect(hasChapter9AlgorithmVisual(beat('ch7-book-00-route'))).toBe(false);
  });

  it('covers source-specific computational thinking and algorithm terminology',()=>{
    for(const term of [
      'ABSTRACTION','PROGRAM','STRUCTURED ENGLISH','FLOWCHART','PSEUDOCODE','INPUT','OUTPUT',
      'IF','CASE','FOR','REPEAT–UNTIL','WHILE','INT(Number)','IDENTIFIER TABLE','STEPWISE',
    ])expect(visualSource).toContain(term);
  });

  it('keeps Chapter 9 diagrams additive to the source-backed teaching payload',()=>{
    expect(facade).toContain("import { Chapter9AlgorithmVisual, hasChapter9AlgorithmVisual } from './Chapter9AlgorithmVisuals';");
    expect(facade).toContain('hasChapter9AlgorithmVisual(beat)');
    expect(facade).toContain('return <Chapter9AlgorithmVisual beat={beat} reveal={reveal}/>;');
    const ownsBody=facade.slice(facade.indexOf('export function presentationVisualOwnsBeatContent'),facade.indexOf('export function Chapter14PresentationVisualV4'));
    expect(ownsBody).not.toContain('hasChapter9AlgorithmVisual');
  });

  it('has classroom fit and responsive rules without hiding source content',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px) and (min-width:960px)');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).not.toMatch(/display\s*:\s*none/);
  });
});
