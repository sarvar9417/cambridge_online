import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LessonPresentationScreen } from './LessonContent';
import { CHAPTER_5_FINAL } from './lesson-content-chapter5-deep-final';
import type { LessonPresentationBeat } from './lesson-experience-model';
import {
  CHAPTER_5_SYSTEM_SOFTWARE_VISUAL_IDS,
  Chapter5SystemSoftwareVisual,
  hasChapter5SystemSoftwareVisual,
} from './Chapter5SystemSoftwareVisuals';
import { hasChapter14PresentationVisualV4, presentationVisualOwnsBeatContent } from './Chapter14PresentationVisualsV4';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const visualSource=source('Chapter5SystemSoftwareVisuals.tsx');
const css=source('chapter5-system-software-visuals.css');

const beat=(slideId:string,overrides:Partial<LessonPresentationBeat>={}):LessonPresentationBeat=>({
  id:`${slideId}-ideas-1`,
  slideId,
  kind:'key-idea',
  eyebrow:'CHAPTER 5 · SOURCE-BACKED',
  title:'Chapter 5 projector scene',
  sourcePages:[142],
  bullets:['SOURCE-BACKED-EXPLANATION'],
  showSource:false,
  ...overrides,
});

describe('Chapter 5 classroom presentation visuals',()=>{
  it('registers eight source-backed visual targets that exist in the final chapter',()=>{
    expect(CHAPTER_5_SYSTEM_SOFTWARE_VISUAL_IDS).toEqual([
      'h5-512-process-hardware-file',
      'h5-512-printer-management',
      'h5-513-defragmentation',
      'h5-514-static-dynamic',
      'h5-521-compiler-interpreter',
      'h5-523-bytecode',
      'h5-524-ide-overview',
      'h5-524-debugger',
    ]);
    const finalIds=new Set(CHAPTER_5_FINAL.slides.map(slide=>slide.id));
    for(const id of CHAPTER_5_SYSTEM_SOFTWARE_VISUAL_IDS)expect(finalIds.has(id),id).toBe(true);
  });

  it('routes every target through the shared presentation visual facade without owning the source payload',()=>{
    for(const id of CHAPTER_5_SYSTEM_SOFTWARE_VISUAL_IDS){
      const item=beat(id);
      expect(hasChapter5SystemSoftwareVisual(item),id).toBe(true);
      expect(hasChapter14PresentationVisualV4(item),id).toBe(true);
      expect(presentationVisualOwnsBeatContent(item),id).toBe(false);
    }
  });

  it('keeps source explanation beside the Chapter 5 visual instead of replacing it',()=>{
    const html=renderToStaticMarkup(<LessonPresentationScreen beat={beat('h5-512-printer-management')} reveal={2}/>);
    expect(html).toContain('h5sys-printer');
    expect(html).toContain('BUFFER');
    expect(html).toContain('QUEUE');
    expect(html).toContain('INTERRUPT');
    expect(html).toContain('SOURCE-BACKED-EXPLANATION');
    expect(html).toContain('lx-present-screen--split-rich');
  });

  it('renders every registered visual without an empty facade result',()=>{
    for(const id of CHAPTER_5_SYSTEM_SOFTWARE_VISUAL_IDS){
      const html=renderToStaticMarkup(<Chapter5SystemSoftwareVisual beat={beat(id)} reveal={3}/>);
      expect(html.length,id).toBeGreaterThan(80);
      expect(html,id).toContain('h5sys');
    }
  });

  it('preserves the source terminology in the visual models',()=>{
    for(const term of [
      'PROCESS','HARDWARE','FILES','DRIVER','BUFFER','QUEUE','INTERRUPT',
      'STATIC LIBRARY','DYNAMIC LINK LIBRARY','ASSEMBLER','COMPILER','INTERPRETER',
      'BYTECODE','VIRTUAL MACHINE / RUN TIME','EDITOR','AUTO-DOCUMENTER',
      'SINGLE STEP','BREAKPOINT','REPORT WINDOW',
    ])expect(visualSource,term).toContain(term);
  });

  it('has explicit projector fit rules and never hides source-significant visual states',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px) and (min-width:960px)');
    expect(css).toContain('@media(max-width:959px)');
    expect(css).toContain('max-height:430px');
    expect(css).not.toContain('visibility:hidden');
    expect(css).not.toContain('display:none!important');
  });
});
