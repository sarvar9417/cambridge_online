import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_2_ACTIVITY_VISUAL_IDS,hasChapter2ActivityVisual } from './Chapter2ActivityVisuals';
import { presentationBeatsForSlide } from './lesson-experience-model';
const visual=readFileSync(resolve(process.cwd(),'src','teaching','Chapter2ActivityVisuals.tsx'),'utf8');
const css=readFileSync(resolve(process.cwd(),'src','teaching','chapter2-activity-visuals.css'),'utf8');
describe('Chapter 2 Hodder activity projector scenes',()=>{
  it('routes all three activities and six extension activities through custom visuals',()=>{
    expect(CHAPTER_2_ACTIVITY_VISUAL_IDS).toHaveLength(9);
    const ids=new Set(CHAPTER_2_FINAL.slides.map(s=>s.id));
    expect(CHAPTER_2_ACTIVITY_VISUAL_IDS.every(id=>ids.has(id))).toBe(true);
    for(const slide of CHAPTER_2_FINAL.slides.filter(s=>CHAPTER_2_ACTIVITY_VISUAL_IDS.includes(s.id as never)))
      expect(presentationBeatsForSlide(slide,slide.title).some(hasChapter2ActivityVisual),slide.id).toBe(true);
  });
  it('locks source-specific task markers without inventing answers',()=>{
    for(const marker of ['20 EMPLOYEES','FINANCIAL CONSULTANTS','20-FLOOR BUILDING','GEO · MEO · LEO','35 800 km','5000–12 000 km','500–2500 km','PEER-TO-PEER','f = c / λ','3 × 10⁸ m/s','three LANs','Figure 2.20','NAT','line 09','line 03'])expect(visual).toContain(marker);
  });
  it('preserves the Hodder electromagnetic wavelength-frequency scale used by Extension Activity 2B',()=>{
    for(const marker of ['radio waves','10²','3 MHz','microwaves','10⁻¹','3 GHz','infrared','10⁻³','300 GHz','visible light','10⁻⁵','30 THz','ultra violet','10⁻⁷','3 PHz','X-rays','10⁻⁹','300 PHz','gamma rays','10⁻¹¹','30 EHz'])expect(visual).toContain(marker);
  });
  it('keeps projector and narrow-screen layouts responsive',()=>{
    for(const marker of ['h2av-taskgrid','h2av-orbits','h2av-emscale','h2av-gateway','h2av-loop','h2av-codecompare','@media(max-height:820px)','@media(max-width:900px)'])expect(css).toContain(marker);
  });
});
