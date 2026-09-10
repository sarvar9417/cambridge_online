import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_2_DEVICE_VISUAL_SLIDES,hasChapter2DeviceVisual } from './Chapter2DeviceVisuals';
import { presentationBeatsForSlide } from './lesson-experience-model';

const visual=readFileSync(new URL('./Chapter2DeviceVisuals.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('./chapter2-device-visuals.css',import.meta.url),'utf8');
const facade=readFileSync(new URL('./Chapter14PresentationVisualsV4.tsx',import.meta.url),'utf8');

describe('Chapter 2 Hodder network-device projector visuals',()=>{
  it('routes ten source-specific device scenes through the shared projector pipeline',()=>{
    expect(CHAPTER_2_DEVICE_VISUAL_SLIDES).toHaveLength(10);
    const ids=new Set(CHAPTER_2_FINAL.slides.map(slide=>slide.id));
    expect(CHAPTER_2_DEVICE_VISUAL_SLIDES.every(id=>ids.has(id))).toBe(true);
    for(const slide of CHAPTER_2_FINAL.slides.filter(slide=>CHAPTER_2_DEVICE_VISUAL_SLIDES.includes(slide.id as never))){
      expect(presentationBeatsForSlide(slide,slide.title).some(hasChapter2DeviceVisual)).toBe(true);
    }
    expect(facade).toContain('hasChapter2DeviceVisual');
    expect(facade).toContain('<Chapter2DeviceVisual beat={beat} reveal={reveal}/>');
  });

  it('preserves Hodder-specific device semantics instead of generic network cards',()=>{
    for(const marker of [
      'software modem','host resources','boosts every detected signal','Wi-Fi dead spots',
      'broadcast to every connected port','MAC ADDRESS TABLE','unknown destination → flood',
      'same protocol','IP part identifies network','converts data packets from one protocol to another',
      'modulator-demodulator','digital → analogue','MAC address generated at manufacture','antenna communicates via microwaves',
    ]) expect(visual).toContain(marker);
  });

  it('ships projector-safe responsive layouts for every device diagram family',()=>{
    for(const marker of [
      '.h2dv-softmodem','.h2dv-repeater','.h2dv-hub','.h2dv-switch','.h2dv-bridge','.h2dv-router',
      '.h2dv-gateway','.h2dv-compare','.h2dv-modem','.h2dv-nic','@media(max-height:820px)','@media(max-width:900px)',
    ]) expect(css).toContain(marker);
  });
});
