import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_3 } from './lesson-content-chapter3';
import { CHAPTER_3_SOURCE_FILE_MANIFEST } from './chapter3-source-file-fidelity';
import { CHAPTER_3_VISUAL_IDS, hasChapter3PresentationVisual } from './Chapter3PresentationVisuals';
import { lessonChapter } from './lesson-content-source-complete';

const sourceFile=(name:string)=>readFileSync(resolve(process.cwd(),'src','teaching',name),'utf8');

describe('Hodder Chapter 3 opening source batch', () => {
  it('locks the exact connected coursebook Chapter 3 range', () => {
    expect(CHAPTER_3_SOURCE_FILE_MANIFEST.sourceFile).toBe('9618 Coursebook Book (Hodder Education).pdf');
    expect(CHAPTER_3_SOURCE_FILE_MANIFEST.pageCount).toBe(39);
    expect(CHAPTER_3_SOURCE_FILE_MANIFEST.pages[0]?.printedPage).toBe(68);
    expect(CHAPTER_3_SOURCE_FILE_MANIFEST.pages.at(-1)?.printedPage).toBe(106);
    expect(new Set(CHAPTER_3_SOURCE_FILE_MANIFEST.pages.map(page => page.sha256)).size).toBe(39);
  });

  it('routes the source-grounded opening slides as Chapter 3', () => {
    expect(lessonChapter(3)).toBe(CHAPTER_3);
    expect(CHAPTER_3.slides.map(slide => slide.id)).toEqual(expect.arrayContaining([
      'h3-overview', 'h3-311-memory-storage', 'h3-311-memory-map', 'h3-311-primary-tree',
      'h3-311-dram-sram', 'h3-311-ram-rom', 'h3-311-embedded', 'h3-311-hdd', 'h3-311-ssd',
    ]));
  });

  it('preserves the key Hodder source structures and numeric examples from pp.68–74', () => {
    const corpus = JSON.stringify(CHAPTER_3);
    [
      'Figure 3.2 Memory and storage devices',
      'Figure 3.3 Structure of primary memory',
      'Table 3.1 Differences between DRAM and SRAM',
      'Table 3.2 Differences between RAM and ROM',
      'Table 3.3 Pros and cons of controlling devices with embedded systems',
      'Figure 3.6 Tracks and sectors on a hard disk drive',
      'Extension Activity 3A',
      'Extension Activity 3B',
      '25 ns', '60 ns', '15 microseconds', 'PROM', 'EPROM', 'EEPROM', 'NAND', 'NOR',
    ].forEach(marker => expect(corpus).toContain(marker));
  });

  it('provides source-specific projector visuals through the shared facade', () => {
    expect(CHAPTER_3_VISUAL_IDS).toHaveLength(6);
    CHAPTER_3_VISUAL_IDS.forEach(slideId => expect(hasChapter3PresentationVisual({ slideId } as never)).toBe(true));
    const facade = sourceFile('Chapter14PresentationVisualsV4.tsx');
    expect(facade).toContain('Chapter3PresentationVisual');
    expect(facade).toContain('hasChapter3PresentationVisual');
  });
});
