import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HODDER_CHAPTER_1 } from './lesson-content-hodder-ch1';
import { CHAPTER_1_SOURCE_VISUAL_SLIDES, hasChapter1PresentationVisual } from './Chapter1PresentationVisuals';
import { presentationBeatsForSlide } from './lesson-experience-model';

const visualSource=readFileSync(new URL('./Chapter1PresentationVisuals.tsx',import.meta.url),'utf8');
const cssSource=readFileSync(new URL('./chapter1-presentation-visuals.css',import.meta.url),'utf8');
const mediaCss=readFileSync(new URL('./chapter1-presentation-media.css',import.meta.url),'utf8');
const source=readFileSync(new URL('./lesson-content-hodder-ch1.ts',import.meta.url),'utf8');

describe('Chapter 1 Hodder source-first projector presentation',()=>{
  it('routes every authored Chapter 1 teaching slide through a source-specific visual',()=>{
    const sourceIds=new Set(HODDER_CHAPTER_1.slides.map(slide=>slide.id));
    expect(CHAPTER_1_SOURCE_VISUAL_SLIDES).toHaveLength(29);
    expect(new Set(CHAPTER_1_SOURCE_VISUAL_SLIDES).size).toBe(29);
    expect(CHAPTER_1_SOURCE_VISUAL_SLIDES.every(id=>sourceIds.has(id))).toBe(true);
    for(const slide of HODDER_CHAPTER_1.slides.filter(s=>CHAPTER_1_SOURCE_VISUAL_SLIDES.includes(s.id as never))){
      const beats=presentationBeatsForSlide(slide,slide.title);
      expect(beats.length).toBeGreaterThan(0);
      expect(beats.every(hasChapter1PresentationVisual)).toBe(true);
    }
  });

  it('preserves source-specific number-system examples',()=>{
    for(const marker of ['11101110₂','238₁₀','37 + 58','82 + 69','95 − 68','kB','KiB','BE1₁₆','00990F60','3165₁₀','0110','$0.37 + $0.94 → 1.31']){
      expect(visualSource,`missing Chapter 1 number-system marker: ${marker}`).toContain(marker);
    }
  });

  it('preserves Hodder character, multimedia, sound and compression examples',()=>{
    for(const marker of ['standard ASCII = 7-bit codes 0–127','first 128 characters retained','1920 × 1080 on 5.5 in → ≈ 401 ppi','49,766,400 bits','6,220,800 bytes','SAMPLING RATE ↑','SAMPLING RESOLUTION ↑','aaaaabbbbccddddd','64 bytes → 30 RLE values','80–320 kbit/s','≈ 5–15× reduction']){
      expect(visualSource,`missing Chapter 1 multimedia marker: ${marker}`).toContain(marker);
    }
    for(const marker of ['Table 1.5','Table 1.6','Table 1.7','Figure 1.3','Table 1.8','Figure 1.5','Figure 1.6','Table 1.9','Figure 1.7','Figure 1.8','Activity 1I','Chapter 1 end-of-chapter questions']){
      expect(source,`missing Hodder source marker: ${marker}`).toContain(marker);
    }
  });

  it('keeps projector hierarchy, responsive multimedia layouts and duplicate-block suppression',()=>{
    expect(cssSource).toContain(':has(> .h1pv-shell)');
    expect(cssSource).toContain('max-height:760px');
    for(const marker of ['.h1pv-ascii','.h1pv-unicode','.h1pv-pixelation','.h1pv-vector','.h1pv-sampling','.h1pv-rle','.h1pv-rle-image','.h1pv-review']){
      expect(mediaCss).toContain(marker);
    }
    expect(mediaCss).toContain('@media(max-height:760px)');
    expect(mediaCss).toContain('@media(max-width:760px)');
  });
});
