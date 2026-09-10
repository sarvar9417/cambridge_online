import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_2_SOURCE_VISUAL_SLIDES,hasChapter2PresentationVisual } from './Chapter2PresentationVisuals';
import { presentationBeatsForSlide } from './lesson-experience-model';
const visual=readFileSync(resolve(process.cwd(),'src','teaching','Chapter2PresentationVisuals.tsx'),'utf8');
const css=readFileSync(resolve(process.cwd(),'src','teaching','chapter2-presentation-visuals.css'),'utf8');
describe('Chapter 2 visual-first Hodder projector batch',()=>{
 it('routes eighteen source scenes through custom visuals',()=>{expect(CHAPTER_2_SOURCE_VISUAL_SLIDES).toHaveLength(18);const ids=new Set(CHAPTER_2_FINAL.slides.map(s=>s.id));expect(CHAPTER_2_SOURCE_VISUAL_SLIDES.every(id=>ids.has(id))).toBe(true);for(const slide of CHAPTER_2_FINAL.slides.filter(s=>CHAPTER_2_SOURCE_VISUAL_SLIDES.includes(s.id as never)))expect(presentationBeatsForSlide(slide,slide.title).some(hasChapter2PresentationVisual)).toBe(true)});
 it('preserves source-specific network, cloud and wireless semantics',()=>{for(const marker of ['1–10 m','100 km–1000+ km','normally no more than 10 nodes','terminators','routing = shortest route','data redundancy','behind organisation firewall','electrical signal','light pulses','bandwidth','penetration','attenuation','IEEE 802.11','2.45 GHz','79 channels','spread spectrum frequency hopping','INFRASTRUCTURE MODE','AD-HOC MODE'])expect(visual).toContain(marker);expect(visual).not.toContain('IEEE 802.15')});
 it('ships projector-responsive diagrams rather than generic cards',()=>{for(const marker of ['h2pv-cloud','h2pv-balance','h2pv-media','h2pv-spectrum','h2pv-fibre','h2pv-wireless','h2pv-hop','h2pv-mode','h2pv-devices','@media(max-height:820px)','@media(max-width:900px)'])expect(css).toContain(marker)});
 it('adds a four-session roadmap and an accessible animated packet journey',()=>{for(const marker of ['h2pv-session','h2pv-session-map','h2pv-session-network','@keyframes h2pvPacketJourney','prefers-reduced-motion'])expect(css).toContain(marker)});
});
