import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_2_SOURCE_VISUAL_SLIDES,hasChapter2PresentationVisual } from './Chapter2PresentationVisuals';
import { presentationBeatsForSlide } from './lesson-experience-model';

const visual=readFileSync(new URL('./Chapter2PresentationVisuals.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('./chapter2-presentation-visuals.css',import.meta.url),'utf8');

describe('Chapter 2 visual-first Hodder projector batch',()=>{
  it('routes the first nine high-value Chapter 2 source scenes through custom visuals',()=>{
    expect(CHAPTER_2_SOURCE_VISUAL_SLIDES).toHaveLength(9);
    const ids=new Set(CHAPTER_2_FINAL.slides.map(s=>s.id));
    expect(CHAPTER_2_SOURCE_VISUAL_SLIDES.every(id=>ids.has(id))).toBe(true);
    for(const slide of CHAPTER_2_FINAL.slides.filter(s=>CHAPTER_2_SOURCE_VISUAL_SLIDES.includes(s.id as never))){
      expect(presentationBeatsForSlide(slide,slide.title).some(hasChapter2PresentationVisual)).toBe(true);
    }
  });
  it('preserves source-specific network scale and model/topology semantics',()=>{
    for(const marker of ['1–10 m','10 m–1000 m','1–100 km','100 km–1000+ km','normally no more than 10 nodes','terminators','routing = shortest route','flooding = all routes'])expect(visual).toContain(marker);
  });
  it('ships projector-responsive professional layouts rather than generic cards',()=>{
    for(const marker of ['h2pv-overview','h2pv-client','h2pv-peer','h2pv-topologies','@media(max-height:820px)','@media(max-width:900px)'])expect(css).toContain(marker);
  });
});
