import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HODDER_CHAPTER_1 } from './lesson-content-hodder-ch1';
import { CHAPTER_1_SOURCE_VISUAL_SLIDES, hasChapter1PresentationVisual } from './Chapter1PresentationVisuals';
import { presentationBeatsForSlide } from './lesson-experience-model';

const visualSource=readFileSync(new URL('./Chapter1PresentationVisuals.tsx',import.meta.url),'utf8');
const cssSource=readFileSync(new URL('./chapter1-presentation-visuals.css',import.meta.url),'utf8');
const source=readFileSync(new URL('./lesson-content-hodder-ch1.ts',import.meta.url),'utf8');

describe('Chapter 1 Hodder source-first projector batch',()=>{
  it('routes the core 1.1 teaching slides through dedicated visuals',()=>{
    const sourceIds=new Set(HODDER_CHAPTER_1.slides.map(slide=>slide.id));
    expect(CHAPTER_1_SOURCE_VISUAL_SLIDES).toHaveLength(11);
    expect(CHAPTER_1_SOURCE_VISUAL_SLIDES.every(id=>sourceIds.has(id))).toBe(true);
    for(const slide of HODDER_CHAPTER_1.slides.filter(s=>CHAPTER_1_SOURCE_VISUAL_SLIDES.includes(s.id as never))){
      const beats=presentationBeatsForSlide(slide,slide.title);
      expect(beats.length).toBeGreaterThan(0);
      expect(beats.every(hasChapter1PresentationVisual)).toBe(true);
    }
  });

  it('preserves source-specific numeric examples instead of generic base-conversion cards',()=>{
    for(const marker of ['11101110₂','238₁₀','37 + 58','82 + 69','95 − 68','kB','KiB','BE1₁₆','00990F60','3165₁₀','0110']){
      expect(visualSource,`missing Chapter 1 visual marker: ${marker}`).toContain(marker);
    }
    for(const marker of ['Example 1.1','Example 1.2','Example 1.3','Example 1.4','Table 1.3','Table 1.4','Activity 1G','Activity 1H']){
      expect(source,`missing Hodder source marker: ${marker}`).toContain(marker);
    }
  });

  it('keeps projector hierarchy and prevents duplicate generic beat blocks',()=>{
    expect(cssSource).toContain('.h1pv-dump');
    expect(cssSource).toContain('.h1pv-arithmetic');
    expect(cssSource).toContain(':has(> .h1pv-shell)');
    expect(cssSource).toContain('max-height:760px');
  });
});
