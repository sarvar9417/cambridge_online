import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_2_INTERNET_VISUAL_SLIDES,hasChapter2InternetVisual } from './Chapter2InternetVisuals';
import { presentationBeatsForSlide } from './lesson-experience-model';

const visual=readFileSync(resolve(process.cwd(),'src','teaching','Chapter2InternetVisuals.tsx'),'utf8');
const css=readFileSync(resolve(process.cwd(),'src','teaching','chapter2-internet-visuals.css'),'utf8');

describe('Chapter 2 Hodder internet visual-first batch',()=>{
  it('routes 25 source scenes through the projector renderer',()=>{
    expect(CHAPTER_2_INTERNET_VISUAL_SLIDES).toHaveLength(25);
    const ids=new Set(CHAPTER_2_FINAL.slides.map(slide=>slide.id));
    expect(CHAPTER_2_INTERNET_VISUAL_SLIDES.every(id=>ids.has(id))).toBe(true);
    for(const slide of CHAPTER_2_FINAL.slides.filter(s=>CHAPTER_2_INTERNET_VISUAL_SLIDES.includes(s.id as never)))
      expect(presentationBeatsForSlide(slide,slide.title).some(hasChapter2InternetVisual)).toBe(true);
  });

  it('preserves source-specific Ethernet, streaming, telephony and IP evidence',()=>{
    for(const marker of [
      'send jam signal','random wait','HIGH WATER MARK','LOW WATER MARK','80%','massive network of networks','TCP/IP',
      '~10 MB','~3 MB','500–2500 km','5000–12 000 km','35 800 km','32 bits','2³²','254','0','128','77',
      '10111110','00001111','00011001','11110000','192.30.250.00/18','18 bits · netID','14 bits · hostID',
      'A8FB','7A88','FFF0','0FFF','900B:3E4A:AE41','::','www.hoddereducation.co.uk','107.162.140.19'
    ]) expect(visual,`missing source marker: ${marker}`).toContain(marker);
  });

  it('ships projector-specific responsive visual structures',()=>{
    for(const marker of ['h2iv-csma','h2iv-stream','h2iv-orbits','h2iv-ipv4','h2iv-cidr','h2iv-ipv6','h2iv-url','h2iv-dns','@media(max-height:820px)','@media(max-width:900px)'])
      expect(css).toContain(marker);
  });

  it('animates Ethernet delivery, collision handling and streaming buffers accessibly',()=>{
    for(const marker of ['@keyframes h2ivDataTravel','@keyframes h2ivCsmaPacket','@keyframes h2ivBufferLevel','prefers-reduced-motion'])
      expect(css).toContain(marker);
  });
});
