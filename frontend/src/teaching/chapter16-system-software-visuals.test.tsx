import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_16_FINAL } from './lesson-content-chapter16-final';
import {
  CHAPTER_16_SYSTEM_SOFTWARE_VISUAL_IDS,
  hasChapter16SystemSoftwareVisual,
} from './Chapter16SystemSoftwareVisuals';
import type { LessonPresentationBeat } from './lesson-experience-model';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const visualSource=source('Chapter16SystemSoftwareVisuals.tsx');
const css=source('chapter16-system-software-visuals.css');
const facade=source('Chapter14PresentationVisualsV4.tsx');
const beat=(slideId:string):LessonPresentationBeat=>({id:`${slideId}-concept-1`,slideId,kind:'concept',eyebrow:'TEST',title:'Test',sourcePages:[]});

describe('Cambridge 9618 Chapter 16 system-software classroom visuals',()=>{
  it('targets real source-backed slides in the final Chapter 16 route',()=>{
    const slideIds=new Set(CHAPTER_16_FINAL.slides.map(slide=>slide.id));
    expect(CHAPTER_16_SYSTEM_SOFTWARE_VISUAL_IDS.length).toBeGreaterThanOrEqual(15);
    for(const id of CHAPTER_16_SYSTEM_SOFTWARE_VISUAL_IDS)expect(slideIds.has(id)).toBe(true);
  });

  it('recognises Chapter 16 targets without leaking into neighbouring chapters',()=>{
    expect(CHAPTER_16_SYSTEM_SOFTWARE_VISUAL_IDS.every(id=>id.startsWith('h16-'))).toBe(true);
    expect(hasChapter16SystemSoftwareVisual(beat('h16-1614-paging'))).toBe(true);
    expect(hasChapter16SystemSoftwareVisual(beat('h15-1525-kmap-intro'))).toBe(false);
    expect(hasChapter16SystemSoftwareVisual(beat('h17-overview'))).toBe(false);
  });

  it('covers source-specific OS, VM, compiler, grammar and RPN terminology',()=>{
    for(const term of [
      'BOOTSTRAP','DMA CONTROLLER','KERNEL','READY','RUNNING','BLOCKED','FCFS','SJF','SRTF',
      'TIME QUANTUM','IDT + IPL','PAGE TABLE','TLB','SEGMENT MAP TABLE','PAGE FAULT','DISK THRASHING',
      'FIFO','BELADY','LRU','CLOCK / SECOND-CHANCE','GUEST OS','HYPERVISOR','LEXICAL ANALYSIS',
      'TOKENISATION','SYMBOL TABLE','SYNTAX ANALYSIS','CODE GENERATION','OPTIMISATION','BACKUS–NAUR FORM','RPN','STACK',
    ])expect(visualSource).toContain(term);
  });

  it('keeps Chapter 16 diagrams additive to the source-backed teaching payload',()=>{
    expect(facade).toContain("import { Chapter16SystemSoftwareVisual, hasChapter16SystemSoftwareVisual } from './Chapter16SystemSoftwareVisuals';");
    expect(facade).toContain('hasChapter16SystemSoftwareVisual(beat)');
    expect(facade).toContain('return <Chapter16SystemSoftwareVisual beat={beat} reveal={reveal}/>;');
    const ownsBody=facade.slice(facade.indexOf('export function presentationVisualOwnsBeatContent'),facade.indexOf('export function Chapter14PresentationVisualV4'));
    expect(ownsBody).not.toContain('hasChapter16SystemSoftwareVisual');
  });

  it('has explicit projector fit and responsive rules without hiding source content',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px) and (min-width:960px)');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).not.toMatch(/display\s*:\s*none/);
  });
});
