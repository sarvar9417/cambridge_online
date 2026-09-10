import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_2_ACTIVITY_VISUAL_IDS,hasChapter2ActivityVisual } from './Chapter2ActivityVisuals';
import { presentationBeatsForSlide } from './lesson-experience-model';
const visual=readFileSync(new URL('./Chapter2ActivityVisuals.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('./chapter2-activity-visuals.css',import.meta.url),'utf8');
describe('Chapter 2 Hodder activity projector scenes',()=>{
  it('routes all three activities and six extension activities through custom visuals',()=>{
    expect(CHAPTER_2_ACTIVITY_VISUAL_IDS).toHaveLength(9);
    const ids=new Set(CHAPTER_2_FINAL.slides.map(s=>s.id));
    expect(CHAPTER_2_ACTIVITY_VISUAL_IDS.every(id=>ids.has(id))).toBe(true);
    for(const slide of CHAPTER_2_FINAL.slides.filter(s=>CHAPTER_2_ACTIVITY_VISUAL_IDS.includes(s.id as never)))
      expect(presentationBeatsForSlide(slide,slide.title).some(hasChapter2ActivityVisual),slide.id).toBe(true);
  });
  it('locks source-specific task markers without inventing answers',()=>{
    for(const marker of ['20 EMPLOYEES','FINANCIAL CONSULTANTS','20-FLOOR BUILDING','GEO · MEO · LEO','PEER-TO-PEER','f = c / λ','3 × 10⁸ m/s','three LANs','Figure 2.20','NAT','line 09','line 03'])expect(visual).toContain(marker);
  });
  it('keeps projector and narrow-screen layouts responsive',()=>{
    for(const marker of ['h2av-taskgrid','h2av-gateway','h2av-loop','h2av-codecompare','@media(max-height:820px)','@media(max-width:900px)'])expect(css).toContain(marker);
  });
});
