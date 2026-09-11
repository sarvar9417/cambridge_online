import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HODDER_CHAPTER_13 } from './lesson-content-hodder-ch13';
import { CHAPTER_13_SOURCE_VISUAL_SLIDES, hasChapter13PresentationVisual } from './Chapter13PresentationVisuals';

const fixture=(name:string)=>readFileSync(resolve(process.cwd(),'src','teaching',name),'utf8');
const visualSource=fixture('Chapter13PresentationVisuals.tsx');
const hodderSource=fixture('lesson-content-hodder-ch13.ts');
const hardeningSource=fixture('chapter13-presentation-hardening.css');
const densitySource=fixture('chapter13-presentation-density-master.css');

describe('Chapter 13 source-grounded projector presentation',()=>{
  it('covers every non-checkpoint Chapter 13 teaching slide with the professional renderer',()=>{
    const teaching=HODDER_CHAPTER_13.slides.filter(slide=>slide.id.startsWith('h13-')&&!slide.id.startsWith('h13-cp-'));
    expect(new Set(CHAPTER_13_SOURCE_VISUAL_SLIDES).size).toBe(CHAPTER_13_SOURCE_VISUAL_SLIDES.length);
    expect(teaching.map(slide=>slide.id)).toEqual([...CHAPTER_13_SOURCE_VISUAL_SLIDES]);
    expect(teaching.every(slide=>hasChapter13PresentationVisual({
      id:`${slide.id}-test`,slideId:slide.id,kind:'concept',eyebrow:slide.eyebrow,title:slide.title,sourcePages:slide.sourcePages??[],
    }))).toBe(true);
  });

  it('locks the Hodder-specific structures and worked values used by the visual explanations',()=>{
    for(const marker of [
      'TYPE Tmonth',
      'monthPointer^',
      'TbookRecord',
      '3024 MOD 2000',
      '5024 MOD 2000',
      '0.0011100 × 2⁵',
      '0.1110000 × 2³',
      '12 + 4',
      '8 + 8',
      '4 + 12',
      '01011010',
      '00000100',
      '00101000',
      '00000011',
      '11001100',
      '00001100',
      '−1664',
      '01001000',
      '11111110',
      '10101101',
      '5.88',
      '5.75',
      '5.875',
      '+4.75',
      '−8.375',
    ])expect(visualSource,`missing projector marker: ${marker}`).toContain(marker);

    for(const marker of [
      "['13.1','positive M, +E','11.25']",
      "['13.3','negative M, +E','−1664']",
      "['13.5','+4.5','01001000 00000011']",
      "['13.7','−10.375','10101101 00000100']",
      "['13.8','0.0011100 00000101','0.1110000 00000011']",
      '5.88',
      '0.399999',
      '+4.75',
      '−8.375',
    ])expect(hodderSource,`missing Hodder source marker: ${marker}`).toContain(marker);
  });

  it('enforces the Chapter 14 content-density rule: reveal is emphasis, never absence',()=>{
    expect(visualSource).not.toContain('.slice(0,reveal)');
    expect(visualSource).toContain("?'is-visible':'is-upcoming'");
    expect(densitySource).toContain('Reveal is emphasis, never absence');
    expect(densitySource).toContain('.h13m-master .is-upcoming');
    expect(densitySource).toContain('visibility:visible!important');
    expect(densitySource).toContain('@media(prefers-reduced-motion:reduce)');
  });

  it('shows source location and keeps projector layout scroll-safe at dense viewports',()=>{
    expect(visualSource).toContain('page+303');
    expect(visualSource).toContain('h13m-source-ribbon');
    expect(densitySource).toContain('.lx-present-content:has(> .h13m-master)');
    expect(densitySource).toContain('overflow:auto');
    expect(densitySource).toContain('@media(max-height:768px)');
  });

  it('prevents duplicate generic projector blocks underneath authoritative Chapter 13 visuals',()=>{
    expect(hardeningSource).toContain(':has(> .h13pv-shell)');
    expect(hardeningSource).toContain('.lx-present-activity');
    expect(hardeningSource).toContain('.lx-present-terms');
  });
});
