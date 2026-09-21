import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_15_FINAL } from './lesson-content-chapter15-final';
import {
  CHAPTER_15_HARDWARE_VISUAL_IDS,
  hasChapter15HardwareVisual,
} from './Chapter15HardwareVisuals';
import type { LessonPresentationBeat } from './lesson-experience-model';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const visualSource=source('Chapter15HardwareVisuals.tsx');
const css=source('chapter15-hardware-visuals.css');
const facade=source('Chapter14PresentationVisualsV4.tsx');

const beat=(slideId:string):LessonPresentationBeat=>({id:`${slideId}-concept-1`,slideId,kind:'concept',eyebrow:'TEST',title:'Test',sourcePages:[]});

describe('Cambridge 9618 Chapter 15 hardware classroom visuals',()=>{
  it('targets only real source-backed slides in the final Chapter 15 route',()=>{
    const slideIds=new Set(CHAPTER_15_FINAL.slides.map(slide=>slide.id));
    expect(CHAPTER_15_HARDWARE_VISUAL_IDS.length).toBeGreaterThanOrEqual(22);
    for(const id of CHAPTER_15_HARDWARE_VISUAL_IDS)expect(slideIds.has(id)).toBe(true);
  });

  it('recognises Chapter 15 targets without leaking into other chapters',()=>{
    expect(CHAPTER_15_HARDWARE_VISUAL_IDS.every(id=>id.startsWith('h15-'))).toBe(true);
    expect(hasChapter15HardwareVisual(beat('h15-1511-risc-cisc'))).toBe(true);
    expect(hasChapter15HardwareVisual(beat('h14-overview'))).toBe(false);
    expect(hasChapter15HardwareVisual(beat('h16-overview'))).toBe(false);
  });

  it('covers source-specific processor, Boolean and logic-circuit terminology',()=>{
    for(const term of [
      'CISC','RISC','FETCH','DECODE','OPERAND FETCH','EXECUTE','WRITEBACK','SISD','SIMD','MISD','MIMD',
      'MASSIVELY PARALLEL','NOT(A AND B)','NOT(A OR B)','HALF ADDER','Carry-in','Carry-out','S · SET','R · RESET',
      'J=1 K=1','SHIFT REGISTER','BINARY COUNTER','SUM OF PRODUCTS','GRAY-CODE ORDER','edge wrap',
      'ACTIVITY 15A','BOOLEAN ALGEBRA','COMBINATIONAL','SEQUENTIAL','KARNAUGH MAP','ACTIVITY 15C',
      'SR FLIP-FLOP','JK FLIP-FLOP','ACTIVITY 15D','A.C + B.C + A.B','OPPOSITE EDGES ARE ADJACENT','ACTIVITY 15E',
    ])expect(visualSource).toContain(term);
  });

  it('keeps Chapter 15 diagrams additive to the source-backed teaching payload',()=>{
    expect(facade).toContain("import { Chapter15HardwareVisual, hasChapter15HardwareVisual } from './Chapter15HardwareVisuals';");
    expect(facade).toContain('hasChapter15HardwareVisual(beat)');
    expect(facade).toContain('return <Chapter15HardwareVisual beat={beat} reveal={reveal}/>;');
    const ownsBody=facade.slice(facade.indexOf('export function presentationVisualOwnsBeatContent'),facade.indexOf('export function Chapter14PresentationVisualV4'));
    expect(ownsBody).not.toContain('hasChapter15HardwareVisual');
  });

  it('has explicit projector fit and responsive rules without hiding source content',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px) and (min-width:960px)');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('.h15hw-pipeline-activity');
    expect(css).toContain('.h15hw-boolean-intro');
    expect(css).toContain('.h15hw-fulladder-truth');
    expect(css).toContain('.h15hw-jk-intro');
    expect(css).toContain('.h15hw-kmap-example');
    expect(css).toContain('.h15hw-wrap');
    expect(css).toContain('.h15hw-activity15e');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).not.toMatch(/display\s*:\s*none/);
  });
});
