import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_18_FINAL } from './lesson-content-chapter18-final';
import { CHAPTER_18_AI_VISUAL_IDS, hasChapter18AIVisual } from './Chapter18AIVisuals';
import type { LessonPresentationBeat } from './lesson-experience-model';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const visualSource=source('Chapter18AIVisuals.tsx');
const css=source('chapter18-ai-visuals.css');
const facade=source('Chapter14PresentationVisualsV4.tsx');
const beat=(slideId:string):LessonPresentationBeat=>({id:`${slideId}-concept-1`,slideId,kind:'concept',eyebrow:'TEST',title:'Test',sourcePages:[]});

describe('Cambridge 9618 Chapter 18 AI classroom visuals',()=>{
  it('targets real source-backed Chapter 18 slides',()=>{
    const slideIds=new Set(CHAPTER_18_FINAL.slides.map(slide=>slide.id));
    expect(CHAPTER_18_AI_VISUAL_IDS.length).toBeGreaterThanOrEqual(14);
    for(const id of CHAPTER_18_AI_VISUAL_IDS)expect(slideIds.has(id)).toBe(true);
  });

  it('recognises Chapter 18 targets without leaking into adjacent chapters',()=>{
    expect(CHAPTER_18_AI_VISUAL_IDS.every(id=>id.startsWith('h18-'))).toBe(true);
    expect(hasChapter18AIVisual(beat('h18-1823-neural-networks'))).toBe(true);
    expect(hasChapter18AIVisual(beat('h17-1742-certificate'))).toBe(false);
    expect(hasChapter18AIVisual(beat('h19-overview'))).toBe(false);
  });

  it('covers shortest-path, learning-type, neural-network and training terminology',()=>{
    for(const term of [
      'Dijkstra','g(n)','HEURISTIC','MANHATTAN','f(n)','ARTIFICIAL INTELLIGENCE','MACHINE LEARNING','DEEP LEARNING',
      'NARROW AI','GENERAL / STRONG AI','LABELLED DATA','UNLABELLED DATA','SUPERVISED LEARNING','UNSUPERVISED LEARNING',
      'SEMI-SUPERVISED','REWARD / PUNISHMENT','ARTIFICIAL NEURAL NETWORK','BLACK BOX','TEXT MINING',
      'COMPUTER-ASSISTED TRANSLATION','BACK PROPAGATION','ERROR GRADIENT','REGRESSION','STATIC','RECURRENT',
    ])expect(visualSource).toContain(term);
  });

  it('keeps Chapter 18 diagrams additive to the source-backed teaching payload',()=>{
    expect(facade).toContain("import { Chapter18AIVisual, hasChapter18AIVisual } from './Chapter18AIVisuals';");
    expect(facade).toContain('hasChapter18AIVisual(beat)');
    expect(facade).toContain('return <Chapter18AIVisual beat={beat} reveal={reveal}/>;');
    const ownsBody=facade.slice(facade.indexOf('export function presentationVisualOwnsBeatContent'),facade.indexOf('export function Chapter14PresentationVisualV4'));
    expect(ownsBody).not.toContain('hasChapter18AIVisual');
  });

  it('has projector fit and responsive rules without hiding source content',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px) and (min-width:960px)');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).not.toMatch(/display\s*:\s*none/);
  });
});
