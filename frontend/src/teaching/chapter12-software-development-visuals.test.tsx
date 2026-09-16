import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_12_FINAL } from './lesson-content-chapter12-final';
import {
  CHAPTER_12_SOFTWARE_DEVELOPMENT_VISUAL_IDS,
  hasChapter12SoftwareDevelopmentVisual,
} from './Chapter12SoftwareDevelopmentVisuals';
import type { LessonPresentationBeat } from './lesson-experience-model';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const visualSource=source('Chapter12SoftwareDevelopmentVisuals.tsx');
const css=source('chapter12-software-development-visuals.css');
const facade=source('Chapter14PresentationVisualsV4.tsx');

const beat=(slideId:string):LessonPresentationBeat=>({id:`${slideId}-concept-1`,slideId,kind:'concept',eyebrow:'TEST',title:'Test',sourcePages:[]});

describe('Cambridge 9618 Chapter 12 software-development classroom visuals',()=>{
  it('targets only real source-backed slides in the final Chapter 12 route',()=>{
    const slideIds=new Set(CHAPTER_12_FINAL.slides.map(slide=>slide.id));
    expect(CHAPTER_12_SOFTWARE_DEVELOPMENT_VISUAL_IDS.length).toBeGreaterThanOrEqual(12);
    for(const id of CHAPTER_12_SOFTWARE_DEVELOPMENT_VISUAL_IDS)expect(slideIds.has(id)).toBe(true);
  });

  it('recognises Chapter 12 targets without leaking into adjacent chapters',()=>{
    expect(CHAPTER_12_SOFTWARE_DEVELOPMENT_VISUAL_IDS.every(id=>id.startsWith('h12-'))).toBe(true);
    expect(hasChapter12SoftwareDevelopmentVisual(beat('h12-121-purpose-stages'))).toBe(true);
    expect(hasChapter12SoftwareDevelopmentVisual(beat('h11-1132-functions'))).toBe(false);
    expect(hasChapter12SoftwareDevelopmentVisual(beat('h13-overview'))).toBe(false);
  });

  it('covers source-specific lifecycle, design, testing and maintenance terminology',()=>{
    for(const term of [
      'ANALYSIS','DESIGN','CODING','TESTING','MAINTENANCE','ITERATION 1','REQUIREMENTS','CUSTOMER FEEDBACK',
      'CONVERT TEMPERATURE','SPHERE CALCULATOR','radius ≠ 0?','S0','OPEN','SYNTAX ERROR','LOGIC ERROR','RUN-TIME ERROR',
      'TRACE TABLE','NORMAL','ABNORMAL','EXTREME','BOUNDARY','WHITE-BOX','BLACK-BOX','INTEGRATION','ALPHA','BETA','ACCEPTANCE',
      'CORRECTIVE','PERFECTIVE','ADAPTIVE',
    ])expect(visualSource).toContain(term);
  });

  it('keeps Chapter 12 diagrams additive to the source-backed teaching payload',()=>{
    expect(facade).toContain("import { Chapter12SoftwareDevelopmentVisual, hasChapter12SoftwareDevelopmentVisual } from './Chapter12SoftwareDevelopmentVisuals';");
    expect(facade).toContain('hasChapter12SoftwareDevelopmentVisual(beat)');
    expect(facade).toContain('return <Chapter12SoftwareDevelopmentVisual beat={beat} reveal={reveal}/>;');
    const ownsBody=facade.slice(facade.indexOf('export function presentationVisualOwnsBeatContent'),facade.indexOf('export function Chapter14PresentationVisualV4'));
    expect(ownsBody).not.toContain('hasChapter12SoftwareDevelopmentVisual');
  });

  it('has explicit projector fit and responsive rules without hiding source content',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px) and (min-width:960px)');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).not.toMatch(/display\s*:\s*none/);
  });
});
