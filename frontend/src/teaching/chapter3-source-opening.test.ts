import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_3 } from './lesson-content-chapter3';
import { CHAPTER_3_FINAL, CHAPTER_3_MEMORY_CHECKPOINT } from './lesson-content-chapter3-checkpoints';
import { CHAPTER_3_SOURCE_FILE_MANIFEST } from './chapter3-source-file-fidelity';
import { CHAPTER_3_VISUAL_IDS, hasChapter3PresentationVisual } from './Chapter3PresentationVisuals';
import { lessonChapter } from './lesson-content-source-complete';

const sourceFile=(name:string)=>readFileSync(resolve(process.cwd(),'src','teaching',name),'utf8');

describe('Hodder Chapter 3 source-grounded implementation', () => {
  it('locks the exact connected coursebook Chapter 3 range', () => {
    expect(CHAPTER_3_SOURCE_FILE_MANIFEST.sourceFile).toBe('9618 Coursebook Book (Hodder Education).pdf');
    expect(CHAPTER_3_SOURCE_FILE_MANIFEST.pageCount).toBe(39);
    expect(CHAPTER_3_SOURCE_FILE_MANIFEST.pages[0]?.printedPage).toBe(68);
    expect(CHAPTER_3_SOURCE_FILE_MANIFEST.pages.at(-1)?.printedPage).toBe(106);
    expect(new Set(CHAPTER_3_SOURCE_FILE_MANIFEST.pages.map(page => page.sha256)).size).toBe(39);
  });

  it('routes the source-grounded slides and memory checkpoint as Chapter 3', () => {
    expect(lessonChapter(3)).toBe(CHAPTER_3_FINAL);
    expect(CHAPTER_3.slides.map(slide => slide.id)).toEqual(expect.arrayContaining([
      'h3-overview', 'h3-311-memory-storage', 'h3-311-memory-map', 'h3-311-primary-tree',
      'h3-311-dram-sram', 'h3-311-ram-rom', 'h3-311-embedded', 'h3-311-hdd', 'h3-311-ssd',
      'h3-311-optical-spiral', 'h3-311-dvd-dual-layer', 'h3-311-optical-compare',
      'h3-311-pram-extension', 'h3-312-laser-printer',
    ]));
    expect(CHAPTER_3_FINAL.slides.map(slide => slide.id)).toEqual(expect.arrayContaining([
      ...CHAPTER_3.slides.map(slide => slide.id),
      CHAPTER_3_MEMORY_CHECKPOINT.id,
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

  it('locks the Hodder optical-media structures from pp.75–76 without losing source values', () => {
    const corpus = JSON.stringify(CHAPTER_3);
    [
      'Figure 3.7 CDs and DVDs use a single, spiral track',
      'Extension Activity 3C',
      'Figure 3.8 Dual layering in a DVD',
      'Table 3.4 Main differences between CDs, DVDs and Blu-ray',
      '780 nm', '650 nm', '405 nm',
      'single 1.2 mm polycarbonate layer', 'two 0.6 mm polycarbonate layers', 'single 1.1 mm polycarbonate layer',
      '1.60 µm', '0.74 µm', '0.30 µm',
      'Birefringence', 'up to five times more data than a DVD',
    ].forEach(marker => expect(corpus).toContain(marker));
    expect(CHAPTER_3.slides.find(slide=>slide.id==='h3-311-optical-spiral')?.sourcePages).toEqual([75]);
    expect(CHAPTER_3.slides.find(slide=>slide.id==='h3-311-optical-compare')?.sourcePages).toEqual([76]);
  });

  it('preserves the p.77 extension and complete laser-printer process vocabulary', () => {
    const corpus = JSON.stringify(CHAPTER_3);
    [
      'Extension Activity 3D', 'PRAM / PCRAM', 'chalogenide glass', 'amorphous and crystalline states',
      'Figure 3.9 A laser printer', 'Table 3.5 Sequence to print using a laser printer',
      'printer driver', 'printer buffer', 'printing drum', 'toner', 'fuser', 'discharge lamp',
      '1–4', '5–6', '7–9', '10–11',
    ].forEach(marker => expect(corpus).toContain(marker));
    expect(CHAPTER_3.slides.find(slide=>slide.id==='h3-312-laser-printer')?.sourcePages).toEqual([77]);
  });

  it('keeps Cambridge practice limited to the source-backed memory-family objectives', () => {
    expect(CHAPTER_3_MEMORY_CHECKPOINT.learningObjectiveCodes).toEqual(['3.1.5', '3.1.6', '3.1.7']);
    expect(CHAPTER_3_MEMORY_CHECKPOINT.checkpointSyllabusCode).toBe('9618');
    expect(CHAPTER_3_MEMORY_CHECKPOINT.checkpointYearFrom).toBe(2021);
    expect(CHAPTER_3_MEMORY_CHECKPOINT.checkpointYearTo).toBe(2026);
    expect(CHAPTER_3_MEMORY_CHECKPOINT.sourcePages).toEqual([70, 71, 72, 74]);
    expect(CHAPTER_3_MEMORY_CHECKPOINT.sourceElements).toContain('Solid state drives · EEPROM/NOR erase/read characteristics');
    expect(CHAPTER_3_MEMORY_CHECKPOINT.examPractice).toBe(true);
  });

  it('provides ten source-specific projector visuals through the shared V6 facade', () => {
    expect(CHAPTER_3_VISUAL_IDS).toHaveLength(10);
    CHAPTER_3_VISUAL_IDS.forEach(slideId => expect(hasChapter3PresentationVisual({ slideId } as never)).toBe(true));
    const facade = sourceFile('Chapter14PresentationVisualsV4.tsx');
    const visual = sourceFile('Chapter3PresentationVisuals.tsx');
    const css = sourceFile('chapter3-presentation-visuals.css');
    expect(facade).toContain('Chapter3PresentationVisual');
    expect(facade).toContain('hasChapter3PresentationVisual');
    ['h3-311-optical-spiral','h3-311-dvd-dual-layer','h3-311-optical-compare','h3-312-laser-printer'].forEach(id=>expect(visual).toContain(id));
    expect(visual).toContain("opacity:reveal>=step?1:.18");
    expect(visual).toContain("translateY(18px)");
    expect(css).toContain('.is-short-projector .h3v');
    expect(css).toContain('@media(max-width:760px)');
  });
});
