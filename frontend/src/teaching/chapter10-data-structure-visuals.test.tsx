import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_10_FINAL } from './lesson-content-chapter10-final';
import {
  CHAPTER_10_DATA_STRUCTURE_VISUAL_IDS,
  hasChapter10DataStructureVisual,
} from './Chapter10DataStructureVisuals';
import type { LessonPresentationBeat } from './lesson-experience-model';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const visualSource=source('Chapter10DataStructureVisuals.tsx');
const css=source('chapter10-data-structure-visuals.css');
const facade=source('Chapter14PresentationVisualsV4.tsx');

const beat=(slideId:string):LessonPresentationBeat=>({
  id:`${slideId}-concept-1`, slideId, kind:'concept', eyebrow:'TEST', title:'Test', sourcePages:[],
});

describe('Cambridge 9618 Chapter 10 data-structure classroom visuals',()=>{
  it('targets only real source-backed slides in the final Chapter 10 route',()=>{
    const slideIds=new Set(CHAPTER_10_FINAL.slides.map(slide=>slide.id));
    expect(CHAPTER_10_DATA_STRUCTURE_VISUAL_IDS.length).toBeGreaterThanOrEqual(12);
    for(const id of CHAPTER_10_DATA_STRUCTURE_VISUAL_IDS)expect(slideIds.has(id)).toBe(true);
  });

  it('recognises Chapter 10 targets without leaking into nearby chapters',()=>{
    expect(CHAPTER_10_DATA_STRUCTURE_VISUAL_IDS.every(id=>id.startsWith('h10-'))).toBe(true);
    expect(hasChapter10DataStructureVisual(beat('h10-1041-stack'))).toBe(true);
    expect(hasChapter10DataStructureVisual(beat('h9-911-abstraction'))).toBe(false);
    expect(hasChapter10DataStructureVisual(beat('h11-overview'))).toBe(false);
  });

  it('covers source-specific array, search, sort, file and ADT terminology',()=>{
    for(const term of [
      'BOOLEAN','CHAR','INTEGER','REAL','STRING','TbookRecord','ARRAY[0:8] OF INTEGER',
      'found ← FALSE','SWAP','OPEN file FOR WRITE','READFILE','WRITEFILE','EOF(file)',
      'topPointer','frontPointer','rearPointer','startPointer','heapPointer','LIFO','FIFO',
    ])expect(visualSource).toContain(term);
  });

  it('keeps Chapter 10 diagrams additive to source-backed lesson detail',()=>{
    expect(facade).toContain("import { Chapter10DataStructureVisual, hasChapter10DataStructureVisual } from './Chapter10DataStructureVisuals';");
    expect(facade).toContain('hasChapter10DataStructureVisual(beat)');
    expect(facade).toContain('return <Chapter10DataStructureVisual beat={beat} reveal={reveal}/>;');
    const ownsBody=facade.slice(facade.indexOf('export function presentationVisualOwnsBeatContent'),facade.indexOf('export function Chapter14PresentationVisualV4'));
    expect(ownsBody).not.toContain('hasChapter10DataStructureVisual');
  });

  it('has explicit projector fit and responsive rules without hiding content',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px) and (min-width:960px)');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).not.toMatch(/display\s*:\s*none/);
  });
});
