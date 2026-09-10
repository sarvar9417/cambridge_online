import { describe, expect, it } from 'vitest';
import { CHAPTER_3 } from './lesson-content-chapter3';
import { CHAPTER_3_FINAL } from './lesson-content-chapter3-checkpoints';
import { CHAPTER_3_DEVICE_SLIDES } from './lesson-content-chapter3-devices';
import { CHAPTER_3_VISUAL_IDS } from './Chapter3PresentationVisuals';
import { CHAPTER_3_DEVICE_VISUAL_IDS } from './Chapter3DeviceVisuals';
import { LESSON_CHAPTERS, lessonChapter } from './lesson-content-source-complete';
import { CHAPTER_3_CONNECTED_HODDER_SOURCE } from './connected-hodder-source-manifest';
import { canBuildSourceGroundedHodderChapter, hodderChapterReadiness } from './hodder-source-readiness';

describe('Hodder Chapter 3 exact connected source lock', () => {
  it('locks the connected full Hodder book and exact Chapter 3 page range', () => {
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE).toMatchObject({
      syllabus: '9618',
      chapter: 3,
      sourceFile: '9618 Coursebook Book (Hodder Education).pdf',
      sourceFileSha256: '760c02dd059fa102b696a7424de2e298198535f06705c367d448e1391d799d95',
      sourceFilePageCount: 576,
      physicalPageRange: [84, 122],
      printedPageRange: [68, 106],
    });
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE.pages).toHaveLength(39);
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE.pages[0].printedPage).toBe(68);
    expect(CHAPTER_3_CONNECTED_HODDER_SOURCE.pages.at(-1)?.printedPage).toBe(106);
    expect(new Set(CHAPTER_3_CONNECTED_HODDER_SOURCE.pages.map(page => page.sha256)).size).toBe(39);
  });

  it('activates Chapter 3 only from the exact 9618 Hodder lock', () => {
    expect(hodderChapterReadiness('9618', 3)).toEqual({
      syllabus: '9618',
      chapter: 3,
      status: 'source-locked',
      sourceFile: '9618 Coursebook Book (Hodder Education).pdf',
    });
    expect(canBuildSourceGroundedHodderChapter('9618', 3)).toBe(true);
    expect(canBuildSourceGroundedHodderChapter('0478', 3)).toBe(false);
    expect(lessonChapter(3)?.number).toBe(3);
    expect(LESSON_CHAPTERS.some(chapter => chapter.number === 3)).toBe(true);
  });

  it('preserves the earlier pp.68–77 draft while extending exact source coverage through p.83', () => {
    expect(CHAPTER_3.number).toBe(3);
    expect(CHAPTER_3_VISUAL_IDS.length).toBeGreaterThanOrEqual(10);
    expect(CHAPTER_3_DEVICE_SLIDES).toHaveLength(6);
    expect(CHAPTER_3_DEVICE_VISUAL_IDS).toHaveLength(6);
    expect(CHAPTER_3_FINAL.sourceNote).toContain('pp.68–106');
    expect(CHAPTER_3_FINAL.sourceNote).toContain('pp.68–83');
    expect(CHAPTER_3_FINAL.coverage).toContain('inkjet printing');
    expect(CHAPTER_3_FINAL.coverage).toContain('virtual headsets');
  });

  it('locks the p.78–83 source-specific scenes and terminology', () => {
    const byId = Object.fromEntries(CHAPTER_3_DEVICE_SLIDES.map(slide => [slide.id, slide]));

    expect(byId['h3-312-inkjet-printer'].sourcePages).toEqual([78]);
    expect(byId['h3-312-inkjet-printer'].sourceElements).toEqual(expect.arrayContaining([
      'Figure 3.10 An inkjet printer',
      'Table 3.6 inkjet print sequence',
      'thermal bubble',
      'piezoelectric',
      'printer buffer',
      'interrupt',
    ]));

    expect(byId['h3-312-3d-printer'].sourceElements).toEqual(expect.arrayContaining([
      'Figure 3.11 A 3D printer',
      'Figure 3.12 Artificial bone framework',
      'additive manufacturing',
      'subtractive manufacturing',
      'binder 3D printing',
      '100 µm layers',
    ]));

    expect(byId['h3-312-speaker-dac'].sourceElements).toEqual(expect.arrayContaining(['DAC', 'amplifier', 'temporary electromagnet', 'speaker cone']));
    expect(byId['h3-312-microphone-adc'].sourceElements).toEqual(expect.arrayContaining(['ADC', 'sound card', 'HUT example']));
    expect(byId['h3-312-oled-touch'].sourceElements).toEqual(expect.arrayContaining(['RGB sub-pixels', '1680 × 1080', 'capacitive touch screen', 'resistive touch screen']));
    expect(byId['h3-312-vr-headset'].sourceElements).toEqual(expect.arrayContaining(['110° field of view', '60–120 images per second', 'gyroscopic sensors', 'accelerometers', 'binaural sound']));
  });

  it('keeps all source-backed active chapters behind the central readiness gate', () => {
    LESSON_CHAPTERS.forEach(chapter => {
      expect(canBuildSourceGroundedHodderChapter('9618', chapter.number)).toBe(true);
    });
  });
});
