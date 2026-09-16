import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_19_FINAL } from './lesson-content-chapter19-final';
import { CHAPTER_19_ALGORITHM_VISUAL_IDS, hasChapter19AlgorithmVisual } from './Chapter19AlgorithmsVisuals';
import type { LessonPresentationBeat } from './lesson-experience-model';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const visualSource=source('Chapter19AlgorithmsVisuals.tsx');
const css=source('chapter19-algorithms-visuals.css');
const facade=source('Chapter14PresentationVisualsV4.tsx');
const beat=(slideId:string):LessonPresentationBeat=>({id:`${slideId}-concept-1`,slideId,kind:'concept',eyebrow:'TEST',title:'Test',sourcePages:[]});

describe('Cambridge 9618 Chapter 19 algorithm classroom visuals',()=>{
  it('targets real source-backed Chapter 19 slides',()=>{
    const slideIds=new Set(CHAPTER_19_FINAL.slides.map(slide=>slide.id));
    expect(CHAPTER_19_ALGORITHM_VISUAL_IDS.length).toBeGreaterThanOrEqual(17);
    for(const id of CHAPTER_19_ALGORITHM_VISUAL_IDS)expect(slideIds.has(id)).toBe(true);
  });

  it('recognises Chapter 19 targets without leaking into adjacent chapters',()=>{
    expect(CHAPTER_19_ALGORITHM_VISUAL_IDS.every(id=>id.startsWith('h19-'))).toBe(true);
    expect(hasChapter19AlgorithmVisual(beat('h19-1921-factorial-trace'))).toBe(true);
    expect(hasChapter19AlgorithmVisual(beat('h18-1826-backprop'))).toBe(false);
    expect(hasChapter19AlgorithmVisual(beat('h20-overview'))).toBe(false);
  });

  it('covers searching sorting ADTs complexity and recursion terminology',()=>{
    for(const term of [
      'LINEAR SEARCH','BINARY SEARCH','O(log n)','O(n)','COMPARE ADJACENT','PUSH','POP','LIFO','ENQUEUE','DEQUEUE','CIRCULAR QUEUE','FIFO',
      'startPointer','heapStartPointer','nullPointer','ROOT','LEAF','GRAPH','EDGE','PATH','CYCLE','DICTIONARY','KEY','VALUE','O(1)','O(n²)',
      'GENERAL CASE','BASE CASE','WINDING','UNWINDING','STACK OVERFLOW','FIBONACCI','RETURN ADDRESSES',
    ])expect(visualSource).toContain(term);
  });

  it('keeps Chapter 19 diagrams additive to the source-backed teaching payload',()=>{
    expect(facade).toContain("import { Chapter19AlgorithmVisual, hasChapter19AlgorithmVisual } from './Chapter19AlgorithmsVisuals';");
    expect(facade).toContain('hasChapter19AlgorithmVisual(beat)');
    expect(facade).toContain('return <Chapter19AlgorithmVisual beat={beat} reveal={reveal}/>;');
    const ownsBody=facade.slice(facade.indexOf('export function presentationVisualOwnsBeatContent'),facade.indexOf('export function Chapter14PresentationVisualV4'));
    expect(ownsBody).not.toContain('hasChapter19AlgorithmVisual');
  });

  it('has projector fit and responsive rules without hiding source content',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px) and (min-width:960px)');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).not.toMatch(/display\s*:\s*none/);
  });
});
