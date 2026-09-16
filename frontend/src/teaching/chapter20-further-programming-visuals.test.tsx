import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_20_FINAL } from './lesson-content-chapter20-final';
import { CHAPTER_20_FURTHER_PROGRAMMING_VISUAL_IDS, hasChapter20FurtherProgrammingVisual } from './Chapter20FurtherProgrammingVisuals';
import type { LessonPresentationBeat } from './lesson-experience-model';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const visualSource=source('Chapter20FurtherProgrammingVisuals.tsx');
const css=source('chapter20-further-programming-visuals.css');
const facade=source('Chapter14PresentationVisualsV4.tsx');
const beat=(slideId:string):LessonPresentationBeat=>({id:`${slideId}-concept-1`,slideId,kind:'concept',eyebrow:'TEST',title:'Test',sourcePages:[]});

describe('Cambridge 9618 Chapter 20 further-programming classroom visuals',()=>{
  it('targets real source-backed Chapter 20 slides',()=>{
    const slideIds=new Set(CHAPTER_20_FINAL.slides.map(slide=>slide.id));
    expect(CHAPTER_20_FURTHER_PROGRAMMING_VISUAL_IDS.length).toBeGreaterThanOrEqual(21);
    for(const id of CHAPTER_20_FURTHER_PROGRAMMING_VISUAL_IDS)expect(slideIds.has(id)).toBe(true);
  });

  it('recognises Chapter 20 targets without leaking into prior chapters',()=>{
    expect(CHAPTER_20_FURTHER_PROGRAMMING_VISUAL_IDS.every(id=>id.startsWith('h20-'))).toBe(true);
    expect(hasChapter20FurtherProgrammingVisual(beat('h20-2013-inheritance'))).toBe(true);
    expect(hasChapter20FurtherProgrammingVisual(beat('h19-1921-recursion-basics'))).toBe(false);
  });

  it('covers paradigms OOP Prolog files and exception-handling terminology',()=>{
    for(const term of [
      'MACHINE / ASSEMBLY','STATE','CONTROL FLOW','CLASS','OBJECT','ENCAPSULATION','DATA HIDING','INHERITANCE','POLYMORPHISM','OVERLOADING','CONTAINMENT',
      'CONSTRUCTOR','GETTER / SETTER','DESTRUCTOR','PROLOG','KNOWLEDGE BASE','FACTS','QUERY','RULE','SERIAL','SEQUENTIAL','RANDOM','PUTRECORD','GETRECORD','HASH','SEEK',
      'TRY','EXCEPTION','HANDLER','PYTHON','VB.NET','JAVA',
    ])expect(visualSource).toContain(term);
  });

  it('keeps Chapter 20 diagrams additive to the source-backed teaching payload',()=>{
    expect(facade).toContain("import { Chapter20FurtherProgrammingVisual, hasChapter20FurtherProgrammingVisual } from './Chapter20FurtherProgrammingVisuals';");
    expect(facade).toContain('hasChapter20FurtherProgrammingVisual(beat)');
    expect(facade).toContain('return <Chapter20FurtherProgrammingVisual beat={beat} reveal={reveal}/>;');
    const ownsBody=facade.slice(facade.indexOf('export function presentationVisualOwnsBeatContent'),facade.indexOf('export function Chapter14PresentationVisualV4'));
    expect(ownsBody).not.toContain('hasChapter20FurtherProgrammingVisual');
  });

  it('has projector fit and responsive rules without hiding source content',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px) and (min-width:960px)');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).not.toMatch(/display\s*:\s*none/);
  });
});
