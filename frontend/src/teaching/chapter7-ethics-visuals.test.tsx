import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_7_FINAL } from './lesson-content-chapter7-final';
import {
  CHAPTER_7_ETHICS_VISUAL_IDS,
  hasChapter7EthicsVisual,
} from './Chapter7EthicsVisuals';
import type { LessonPresentationBeat } from './lesson-experience-model';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const visualSource=source('Chapter7EthicsVisuals.tsx');
const css=source('chapter7-ethics-visuals.css');
const facade=source('Chapter14PresentationVisualsV4.tsx');

const beat=(slideId:string):LessonPresentationBeat=>({
  id:`${slideId}-concept-1`,
  slideId,
  kind:'concept',
  eyebrow:'TEST',
  title:'Test',
  sourcePages:[],
});

describe('Cambridge 9618 Chapter 7 ethics classroom visuals',()=>{
  it('targets only real source-backed slides in the final 9618 Chapter 7 route',()=>{
    const slideIds=new Set(CHAPTER_7_FINAL.slides.map(slide=>slide.id));
    expect(CHAPTER_7_ETHICS_VISUAL_IDS.length).toBeGreaterThanOrEqual(18);
    for(const id of CHAPTER_7_ETHICS_VISUAL_IDS)expect(slideIds.has(id)).toBe(true);
  });

  it('keeps Cambridge 9618 h7 visuals separate from restored Cambridge 0478 ch7 visuals',()=>{
    expect(CHAPTER_7_ETHICS_VISUAL_IDS.every(id=>id.startsWith('h7-'))).toBe(true);
    expect(hasChapter7EthicsVisual(beat('h7-71-foundations'))).toBe(true);
    expect(hasChapter7EthicsVisual(beat('ch7-book-00-route'))).toBe(false);
    expect(hasChapter7EthicsVisual(beat('ch7-71-pdlc'))).toBe(false);
  });

  it('covers the three Chapter 7 source strands with source terminology',()=>{
    expect(visualSource).toContain('COMPUTER ETHICS');
    expect(visualSource).toContain('INTELLECTUAL PROPERTY');
    expect(visualSource).toContain('POLICY TENSION');
    expect(visualSource).toContain('FREE SOFTWARE FOUNDATION');
    expect(visualSource).toContain('OPEN SOURCE INITIATIVE');
    expect(visualSource).toContain('BCS');
    expect(visualSource).toContain('IEEE + ACM');
    expect(visualSource).toContain('COPYRIGHTED SOFTWARE');
    expect(visualSource).toContain('PRODUCT KEY');
    expect(visualSource).toContain('DRM');
    expect(visualSource).toContain('COMMERCIAL');
    expect(visualSource).toContain('FREE SOFTWARE');
    expect(visualSource).toContain('OPEN SOURCE');
    expect(visualSource).toContain('FREEWARE');
    expect(visualSource).toContain('SHAREWARE');
    expect(visualSource).toContain('ARTIFICIAL INTELLIGENCE');
    expect(visualSource).toContain('AI IMPACT');
    expect(visualSource).toContain('ARTIFICIAL LIMBS');
    expect(visualSource).toContain('DRONES');
    expect(visualSource).toContain('AUTONOMOUS');
    expect(visualSource).toContain('MACHINE-LEARNING ANALYSIS');
  });

  it('keeps source explanation outside the diagrams and wires visuals through the shared facade',()=>{
    expect(facade).toContain("import { Chapter7EthicsVisual, hasChapter7EthicsVisual } from './Chapter7EthicsVisuals';");
    expect(facade).toContain('hasChapter7EthicsVisual(beat)');
    expect(facade).toContain('return <Chapter7EthicsVisual beat={beat} reveal={reveal}/>;');
    expect(facade).not.toContain('hasChapter7EthicsVisual(beat)||hasChapter1PresentationVisual(beat)||hasChapter13PresentationVisual(beat)');
  });

  it('has explicit classroom projector and responsive fit rules without hiding source material',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px) and (min-width:960px)');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('.h7eth-computer-ethics');
    expect(css).toContain('.h7eth-debate');
    expect(css).toContain('.h7eth-copyright-terms');
    expect(css).toContain('.h7eth-ai-impact');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).not.toMatch(/display\s*:\s*none/);
  });
});
