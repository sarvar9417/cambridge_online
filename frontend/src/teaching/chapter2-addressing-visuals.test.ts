import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { CHAPTER_2_ADDRESSING_VISUAL_IDS, hasChapter2AddressingVisual } from './Chapter2AddressingVisuals';
import { presentationBeatsForSlide } from './lesson-experience-model';

const fixture=(name:string)=>readFileSync(resolve(process.cwd(),'src','teaching',name),'utf8');
const visual=fixture('Chapter2AddressingVisuals.tsx');
const css=fixture('chapter2-addressing-visuals.css');
const facade=fixture('Chapter14PresentationVisualsV4.tsx');

describe('Chapter 2 Hodder addressing visual-first batch', () => {
  it('routes every addressing source scene through the projector facade', () => {
    expect(CHAPTER_2_ADDRESSING_VISUAL_IDS).toEqual([
      'h2-223-subnetting',
      'h2-223-subnetting-source-detail',
      'h2-223-private-public',
    ]);
    const ids = new Set(CHAPTER_2_FINAL.slides.map(slide => slide.id));
    for (const id of CHAPTER_2_ADDRESSING_VISUAL_IDS) expect(ids.has(id), id).toBe(true);
    for (const slide of CHAPTER_2_FINAL.slides.filter(slide => CHAPTER_2_ADDRESSING_VISUAL_IDS.includes(slide.id as never))) {
      expect(presentationBeatsForSlide(slide, slide.title).some(hasChapter2AddressingVisual), slide.id).toBe(true);
    }
    expect(facade).toContain('hasChapter2AddressingVisual(beat)');
    expect(facade).toContain('<Chapter2AddressingVisual beat={beat} reveal={reveal}/>');
  });

  it('locks Hodder Table 2.9 and Figure 2.24 university subnet evidence', () => {
    for (const marker of [
      'TABLE 2.9 + FIGURE 2.24',
      'Admin and finance', '192.200.20.0',
      'Humanities', '192.200.20.1',
      'Maths', '192.200.20.2',
      'Science', '192.200.20.3',
      'Arts', '192.200.20.4',
      'Engineering', '192.200.20.5',
      'Computing', '192.200.20.6',
      'Business', '192.200.20.7',
      '00001 → 11110',
      '11000000.11001000.00010100.011 00011',
      '11111111.11111111.11111111.111 00000',
      '11000000.11001000.00010100.011 00000',
      '192.200.20.03 · Science',
    ]) expect(visual, `missing subnet source marker: ${marker}`).toContain(marker);
  });

  it('locks Hodder Table 2.10 private address blocks and public-IP implications', () => {
    for (const marker of [
      'TABLE 2.10',
      '10.0.0.0 → 10.255.255.255', '16 million possible addresses',
      '172.16.0.0 → 172.31.255.255', '1 million possible addresses',
      '192.168.0.0 → 192.168.255.255', '65 600 possible addresses',
      'Reserved for internal use behind a router or other NAT device.',
      'cannot be reached directly by internet users',
      "Allocated by a user's ISP",
      'DNS servers', 'network routers', 'directly-controlled computers',
    ]) expect(visual, `missing private/public source marker: ${marker}`).toContain(marker);
  });

  it('keeps the new diagrams projector-safe on short and narrow screens', () => {
    for (const marker of [
      '.h2addr-subnet', '.h2addr-network', '.h2addr-mask', '.h2addr-private-public', '.h2addr-ranges',
      '@media(max-height:820px)', '@media(max-width:900px)',
    ]) expect(css).toContain(marker);
  });
});
