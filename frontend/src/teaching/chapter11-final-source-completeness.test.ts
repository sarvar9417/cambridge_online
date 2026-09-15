import { describe, expect, it } from 'vitest';
import { CHAPTER_11_FINAL } from './lesson-content-chapter11-final';
import { lessonChapter } from './lesson-content-source-complete';

const EXPECTED_PAGES = Array.from({ length: 19 }, (_, index) => 264 + index);

const REQUIRED_SLIDES = [
  'h11-111-constants-variables',
  'h11-111-sphere-algorithm',
  'h11-111-language-io-processing',
  'h11-111-output-programs',
  'h11-111-java-builtins',
  'h11-111-password-functions',
  'h11-112-library-routines',
  'h11-1121-case-model',
  'h11-1121-case-languages',
  'h11-1122-loops',
  'h11-113-procedure-basics',
  'h11-1131-calls-parameters',
  'h11-1131-parameter-passing',
  'h11-1131-byref-functions-intro',
  'h11-1132-functions',
  'h11-1132-language-functions-review-start',
  'h11-review-triangle-library-subroutines',
  'h11-review-car-depreciation',
] as const;

describe('Chapter 11 deep source-complete lesson', () => {
  it('is the active Cambridge 9618 Chapter 11 route', () => {
    expect(lessonChapter(11)).toBe(CHAPTER_11_FINAL);
    expect(CHAPTER_11_FINAL.title).toBe('Programming');
    expect(CHAPTER_11_FINAL.sourceNote).toContain('pp.264–282');
    expect(CHAPTER_11_FINAL.coverage).toContain('19/19 printed chapter pages');
  });

  it('represents every printed source page from 264 through 282', () => {
    const pages = new Set(CHAPTER_11_FINAL.slides.flatMap(slide => slide.sourcePages ?? []));
    expect([...pages].sort((a, b) => a - b)).toEqual(EXPECTED_PAGES);
  });

  it('keeps all slide provenance inside the exact Chapter 11 range', () => {
    for (const slide of CHAPTER_11_FINAL.slides) {
      expect(slide.sourcePages?.length ?? 0, slide.id).toBeGreaterThan(0);
      for (const page of slide.sourcePages ?? []) {
        expect(page, `${slide.id} lower bound`).toBeGreaterThanOrEqual(264);
        expect(page, `${slide.id} upper bound`).toBeLessThanOrEqual(282);
      }
    }
  });

  it('contains the complete programming teaching route', () => {
    const ids = new Set(CHAPTER_11_FINAL.slides.map(slide => slide.id));
    for (const id of REQUIRED_SLIDES) expect(ids.has(id), id).toBe(true);
    expect(CHAPTER_11_FINAL.subtopics).toEqual([
      '11.1 Programming basics',
      '11.2 Programming constructs',
      '11.3 Structured programming',
    ]);
  });

  it('preserves the source terminology, examples and activities', () => {
    const text = JSON.stringify(CHAPTER_11_FINAL).toLowerCase();
    for (const token of [
      'constant', 'variable', 'library routine', 'div(10,3)', 'mod(10,3)',
      'length', 'left', 'right', 'mid', 'case', 'otherwise',
      'for … next', 'repeat … until', 'while … do … endwhile',
      'procedure', 'function', 'parameter', 'argument', 'by value', 'by reference', 'header', 'return',
      'activity 11a', 'activity 11b', 'activity 11c', 'activity 11d', 'activity 11e',
      'activity 11f', 'activity 11g', 'activity 11h', 'activity 11i',
      'squareroot', 'car depreciation',
    ]) expect(text).toContain(token);
  });

  it('keeps the older printed 9608 review problem as coursebook review rather than live 9618 practice', () => {
    const reviewSlides = CHAPTER_11_FINAL.slides.filter(slide => slide.section === 'Chapter review');
    expect(reviewSlides.length).toBe(2);
    expect(reviewSlides.every(slide => slide.examPractice !== true)).toBe(true);
    expect(JSON.stringify(reviewSlides)).toContain('9608');
  });
});
