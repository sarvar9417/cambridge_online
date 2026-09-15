import { describe, expect, it } from 'vitest';
import { CHAPTER_5_FINAL } from './lesson-content-chapter5-deep-final';
import { lessonChapter } from './lesson-content-source-complete';

const EXPECTED_PAGES = Array.from({ length: 23 }, (_, index) => 136 + index);
const REQUIRED_DEEP_SLIDES = [
  'h5-512-process-hardware-file',
  'h5-512-printer-management',
  'h5-513-formatter',
  'h5-513-antivirus',
  'h5-513-defragmentation',
  'h5-513-analysis-compression',
  'h5-513-backup',
  'h5-514-library-model',
  'h5-514-static-dynamic',
  'h5-52-key-terms',
  'h5-521-assembler',
  'h5-521-compiler-interpreter',
  'h5-522-compiler-interpreter-tradeoffs',
  'h5-523-bytecode',
  'h5-524-ide-overview',
  'h5-524-editor',
  'h5-524-debugger',
  'h5-524-documentation-review',
] as const;

describe('Chapter 5 deep source-complete lesson', () => {
  it('is the active Chapter 5 route', () => {
    expect(lessonChapter(5)).toBe(CHAPTER_5_FINAL);
    expect(CHAPTER_5_FINAL.title).toBe('System software');
    expect(CHAPTER_5_FINAL.sourceNote).toContain('pp.136–158');
    expect(CHAPTER_5_FINAL.coverage).toContain('23/23 printed chapter pages');
  });

  it('represents every printed source page from 136 through 158', () => {
    const pages = new Set(CHAPTER_5_FINAL.slides.flatMap(slide => slide.sourcePages ?? []));
    expect([...pages].sort((a, b) => a - b)).toEqual(EXPECTED_PAGES);
  });

  it('keeps every source reference inside the exact Chapter 5 range', () => {
    for (const slide of CHAPTER_5_FINAL.slides) {
      expect(slide.sourcePages?.length ?? 0, slide.id).toBeGreaterThan(0);
      for (const page of slide.sourcePages ?? []) {
        expect(page, `${slide.id} lower bound`).toBeGreaterThanOrEqual(136);
        expect(page, `${slide.id} upper bound`).toBeLessThanOrEqual(158);
      }
    }
  });

  it('contains the complete deep-teaching sequence after the audited opening', () => {
    const ids = new Set(CHAPTER_5_FINAL.slides.map(slide => slide.id));
    for (const id of REQUIRED_DEEP_SLIDES) expect(ids.has(id), id).toBe(true);
    expect(CHAPTER_5_FINAL.slides.length).toBeGreaterThan(REQUIRED_DEEP_SLIDES.length);
  });

  it('preserves the previously audited opening and adds the missing translator/IDE pages', () => {
    const ids = CHAPTER_5_FINAL.slides.map(slide => slide.id);
    expect(ids).toContain('h5-511-os-need');
    expect(ids).toContain('h5-512-memory-fence');
    expect(ids).toContain('h5-52-key-terms');
    expect(ids).toContain('h5-524-debugger');

    const translatorBridge = CHAPTER_5_FINAL.slides.find(slide => slide.id === 'h5-52-key-terms')!;
    expect(translatorBridge.sourcePages).toEqual([149, 150]);
    expect(translatorBridge.activity?.prompt).toMatch(/DLL|utility/i);

    const debuggerSlide = CHAPTER_5_FINAL.slides.find(slide => slide.id === 'h5-524-debugger')!;
    expect(debuggerSlide.sourcePages).toEqual([155, 156]);
    expect(debuggerSlide.bullets?.join(' ')).toMatch(/report window/i);
  });
});
